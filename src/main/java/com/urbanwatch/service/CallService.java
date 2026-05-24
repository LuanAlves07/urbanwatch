package com.urbanwatch.service;

import com.urbanwatch.dto.CallHistoryResponse;
import com.urbanwatch.dto.CallRequest;
import com.urbanwatch.dto.CallResponse;
import com.urbanwatch.entity.Call;
import com.urbanwatch.entity.CallHistory;
import com.urbanwatch.entity.CallStatus;
import com.urbanwatch.entity.SlaLevel;
import com.urbanwatch.entity.User;
import com.urbanwatch.exception.CallNotFoundException;
import com.urbanwatch.repository.CallHistoryRepository;
import com.urbanwatch.repository.CallRepository;
import com.urbanwatch.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CallService {

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

    public List<CallResponse> listarTodos() {
        return callRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public CallResponse buscarPorId(Long id) {
        return toResponse(findCallById(id));
    }

    @Transactional
    public CallResponse atualizar(Long id, CallRequest request) {
        Call call = findCallById(id);
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
        registrarHistorico(call, call.getStatus(), novoStatus, observacao);
        call.setStatus(novoStatus);
        return toResponse(callRepository.save(call));
    }

    @Transactional
    public CallResponse pausar(Long id, String motivo) {
        Call call = findCallById(id);
        registrarHistorico(call, call.getStatus(), CallStatus.PAUSADO, "Pausado: " + motivo);
        call.setStatus(CallStatus.PAUSADO);
        call.setPaused(true);
        call.setPausedAt(LocalDateTime.now());
        return toResponse(callRepository.save(call));
    }

    @Transactional
    public CallResponse retomar(Long id) {
        Call call = findCallById(id);
        registrarHistorico(call, call.getStatus(), CallStatus.EM_AVALIACAO, "Chamado retomado");
        call.setStatus(CallStatus.EM_AVALIACAO);
        call.setPaused(false);
        call.setPausedAt(null);
        return toResponse(callRepository.save(call));
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
        long horas = ChronoUnit.HOURS.between(call.getCreatedAt(), LocalDateTime.now());

        if (horas < 24) {
            call.setSlaLevel(SlaLevel.NORMAL);
        } else if (horas < 72) {
            call.setSlaLevel(SlaLevel.ATENCAO);
        } else {
            call.setSlaLevel(SlaLevel.CRITICO);
        }

        return toResponse(callRepository.save(call));
    }

    public List<CallResponse> listarCriticos() {
        return callRepository.findBySlaLevel(SlaLevel.CRITICO)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
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
