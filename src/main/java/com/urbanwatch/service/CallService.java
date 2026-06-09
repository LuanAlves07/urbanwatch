package com.urbanwatch.service;

import com.urbanwatch.dto.CallHistoryResponse;
import com.urbanwatch.dto.CallRequest;
import com.urbanwatch.dto.CallResponse;
import com.urbanwatch.entity.Call;
import com.urbanwatch.entity.CallHistory;
import com.urbanwatch.entity.CallStatus;
import com.urbanwatch.entity.Role;
import com.urbanwatch.entity.SlaLevel;
import com.urbanwatch.entity.User;
import com.urbanwatch.exception.CallNotFoundException;
import com.urbanwatch.exception.InvalidStatusTransitionException;
import com.urbanwatch.repository.CallHistoryRepository;
import com.urbanwatch.repository.CallRepository;
import com.urbanwatch.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CallService {

    // Paginacao: protege as listagens contra consultas ilimitadas (H2).
    static final int DEFAULT_PAGE_SIZE = 50;
    static final int MAX_PAGE_SIZE = 200;

    // Fluxo linear de status; PAUSADO e tratado pelos endpoints dedicados (H4).
    private static final List<CallStatus> FLUXO = List.of(
            CallStatus.PENDENTE,
            CallStatus.RECEBIDO,
            CallStatus.EM_AVALIACAO,
            CallStatus.EM_DESLOCAMENTO,
            CallStatus.EM_EXECUCAO,
            CallStatus.FINALIZADO
    );

    private final CallRepository callRepository;
    private final CallHistoryRepository callHistoryRepository;
    private final UserRepository userRepository;

    public CallService(CallRepository callRepository,
                       CallHistoryRepository callHistoryRepository,
                       UserRepository userRepository) {
        this.callRepository = callRepository;
        this.callHistoryRepository = callHistoryRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public CallResponse criar(CallRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + userEmail));

        Call call = new Call();
        call.setTitle(request.getTitle());
        call.setDescription(request.getDescription());
        call.setLatitude(request.getLatitude());
        call.setLongitude(request.getLongitude());
        call.setUser(user);

        return toResponse(callRepository.save(call));
    }

    public List<CallResponse> listarTodos(Integer page, Integer size) {
        return callRepository.findAll(normalizePageable(page, size))
                .getContent()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public CallResponse buscarPorId(Long id) {
        return toResponse(findCallById(id));
    }

    @Transactional
    public CallResponse atualizar(Long id, CallRequest request, String userEmail) {
        User editor = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + userEmail));
        Call call = findCallById(id);

        // H1: somente o autor do chamado ou a prefeitura/admin podem editar.
        boolean isOwner = call.getUser() != null
                && call.getUser().getId().equals(editor.getId());
        boolean isStaff = editor.getRole() == Role.CITY_HALL || editor.getRole() == Role.ADMIN;
        if (!isOwner && !isStaff) {
            throw new AccessDeniedException("Sem permissao para editar este chamado");
        }

        call.setTitle(request.getTitle());
        call.setDescription(request.getDescription());
        call.setLatitude(request.getLatitude());
        call.setLongitude(request.getLongitude());
        return toResponse(callRepository.save(call));
    }

    @Transactional
    public void deletar(Long id) {
        findCallById(id);
        callRepository.deleteById(id);
    }

    @Transactional
    public CallResponse alterarStatus(Long id, CallStatus novoStatus, String observacao) {
        Call call = findCallById(id);
        validarTransicao(call.getStatus(), novoStatus);
        registrarHistorico(call, call.getStatus(), novoStatus, observacao);
        call.setStatus(novoStatus);
        return toResponse(callRepository.save(call));
    }

    @Transactional
    public CallResponse pausar(Long id, String motivo) {
        Call call = findCallById(id);
        // H4: nao se pausa um chamado finalizado nem um ja pausado.
        if (call.getStatus() == CallStatus.FINALIZADO || call.getStatus() == CallStatus.PAUSADO) {
            throw new InvalidStatusTransitionException(call.getStatus(), CallStatus.PAUSADO);
        }
        registrarHistorico(call, call.getStatus(), CallStatus.PAUSADO, "Pausado: " + motivo);
        call.setStatus(CallStatus.PAUSADO);
        call.setPaused(true);
        call.setPausedAt(LocalDateTime.now());
        return toResponse(callRepository.save(call));
    }

    @Transactional
    public CallResponse retomar(Long id) {
        Call call = findCallById(id);
        // H4: so retoma um chamado que esta pausado.
        if (call.getStatus() != CallStatus.PAUSADO) {
            throw new InvalidStatusTransitionException(call.getStatus(), CallStatus.EM_AVALIACAO);
        }
        registrarHistorico(call, call.getStatus(), CallStatus.EM_AVALIACAO, "Chamado retomado");
        call.setStatus(CallStatus.EM_AVALIACAO);
        call.setPaused(false);
        call.setPausedAt(null);
        return toResponse(callRepository.save(call));
    }

    // H4: permite apenas avancar no fluxo linear; FINALIZADO e terminal e
    // PAUSADO/retomada usam os endpoints dedicados.
    private void validarTransicao(CallStatus atual, CallStatus novo) {
        int origem = FLUXO.indexOf(atual);
        int destino = FLUXO.indexOf(novo);
        boolean avancoValido = origem >= 0 && destino > origem;
        if (!avancoValido) {
            throw new InvalidStatusTransitionException(atual, novo);
        }
    }

    @Transactional
    public CallResponse adicionarObservacaoPrefeitura(Long id, String observacao) {
        Call call = findCallById(id);
        call.setPrefeituraObservation(observacao);
        return toResponse(callRepository.save(call));
    }

    public List<CallHistoryResponse> buscarHistorico(Long id) {
        findCallById(id);
        return callHistoryRepository.findByCallIdOrderByDataAlteracaoDesc(id)
                .stream()
                .map(this::toHistoryResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CallResponse atualizarSla(Long id) {
        Call call = findCallById(id);
        call.setSlaLevel(calcularSla(call.getCreatedAt()));
        return toResponse(callRepository.save(call));
    }

    // M4: recalcula o SLA dos chamados ativos periodicamente, escalonando
    // automaticamente para ATENCAO/CRITICO conforme o tempo decorrido.
    @Transactional
    @Scheduled(fixedRateString = "${SLA_RECALC_INTERVAL_MS:3600000}")
    public void recalcularSlaAutomatico() {
        for (Call call : callRepository.findAll()) {
            if (call.getStatus() == CallStatus.FINALIZADO || call.getCreatedAt() == null) {
                continue;
            }
            SlaLevel novoNivel = calcularSla(call.getCreatedAt());
            if (novoNivel != call.getSlaLevel()) {
                call.setSlaLevel(novoNivel);
                callRepository.save(call);
            }
        }
    }

    private SlaLevel calcularSla(LocalDateTime createdAt) {
        long horas = ChronoUnit.HOURS.between(createdAt, LocalDateTime.now());
        if (horas < 24) {
            return SlaLevel.NORMAL;
        }
        if (horas < 72) {
            return SlaLevel.ATENCAO;
        }
        return SlaLevel.CRITICO;
    }

    public List<CallResponse> listarCriticos(Integer page, Integer size) {
        List<Call> criticos = callRepository.findBySlaLevel(SlaLevel.CRITICO);
        return paginarEmMemoria(criticos, page, size)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<CallResponse> listarProximos(Double latitude, Double longitude, Double raioKm,
                                             Integer page, Integer size) {
        List<Call> proximos = callRepository.findByLatitudeNotNullAndLongitudeNotNull()
                .stream()
                .filter(call -> calcularDistancia(latitude, longitude, call.getLatitude(), call.getLongitude()) <= raioKm)
                .collect(Collectors.toList());
        return paginarEmMemoria(proximos, page, size)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // H2: normaliza pagina/tamanho aplicando um teto maximo de seguranca.
    private Pageable normalizePageable(Integer page, Integer size) {
        int paginaSegura = (page == null || page < 0) ? 0 : page;
        int tamanhoSeguro = (size == null || size <= 0)
                ? DEFAULT_PAGE_SIZE
                : Math.min(size, MAX_PAGE_SIZE);
        return PageRequest.of(paginaSegura, tamanhoSeguro);
    }

    private <T> List<T> paginarEmMemoria(List<T> itens, Integer page, Integer size) {
        Pageable pageable = normalizePageable(page, size);
        int inicio = (int) Math.min((long) pageable.getPageNumber() * pageable.getPageSize(), itens.size());
        int fim = Math.min(inicio + pageable.getPageSize(), itens.size());
        return itens.subList(inicio, fim);
    }
    
    private double calcularDistancia(double lat1, double lon1, double lat2, double lon2) {
        final double RAIO_TERRA_KM = 6371.0;
    
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
    
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
        return RAIO_TERRA_KM * c;
    }

    private Call findCallById(Long id) {
        return callRepository.findById(id)
                .orElseThrow(() -> new CallNotFoundException(id));
    }

    private void registrarHistorico(Call call, CallStatus anterior, CallStatus novo, String observacao) {
        CallHistory historico = new CallHistory();
        historico.setCall(call);
        historico.setStatusAnterior(anterior);
        historico.setStatusNovo(novo);
        historico.setObservacao(observacao);
        callHistoryRepository.save(historico);
    }

    private CallResponse toResponse(Call call) {
        CallResponse response = new CallResponse();
        response.setId(call.getId());
        response.setTitle(call.getTitle());
        response.setDescription(call.getDescription());
        response.setStatus(call.getStatus());
        response.setLatitude(call.getLatitude());
        response.setLongitude(call.getLongitude());
        response.setSlaLevel(call.getSlaLevel());
        response.setPaused(call.isPaused());
        response.setPrefeituraObservation(call.getPrefeituraObservation());
        response.setCreatedAt(call.getCreatedAt());
        response.setUpdatedAt(call.getUpdatedAt());
        response.setPausedAt(call.getPausedAt());
        if (call.getUser() != null) {
            response.setUserId(call.getUser().getId());
            response.setUserName(call.getUser().getName());
        }
        return response;
    }

    private CallHistoryResponse toHistoryResponse(CallHistory history) {
        CallHistoryResponse response = new CallHistoryResponse();
        response.setId(history.getId());
        response.setStatusAnterior(history.getStatusAnterior());
        response.setStatusNovo(history.getStatusNovo());
        response.setObservacao(history.getObservacao());
        response.setDataAlteracao(history.getDataAlteracao());
        return response;
    }
}
