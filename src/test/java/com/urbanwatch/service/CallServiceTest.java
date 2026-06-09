package com.urbanwatch.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.urbanwatch.dto.CallRequest;
import com.urbanwatch.entity.Call;
import com.urbanwatch.entity.CallStatus;
import com.urbanwatch.entity.Role;
import com.urbanwatch.entity.User;
import com.urbanwatch.exception.InvalidStatusTransitionException;
import com.urbanwatch.repository.CallHistoryRepository;
import com.urbanwatch.repository.CallRepository;
import com.urbanwatch.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class CallServiceTest {

    @Mock
    private CallRepository callRepository;
    @Mock
    private CallHistoryRepository callHistoryRepository;
    @Mock
    private UserRepository userRepository;

    private CallService callService;

    @BeforeEach
    void setUp() {
        callService = new CallService(callRepository, callHistoryRepository, userRepository);
    }

    private User user(Long id, Role role) {
        User u = new User();
        u.setId(id);
        u.setEmail("user" + id + "@x.com");
        u.setRole(role);
        return u;
    }

    private Call call(Long id, User owner, CallStatus status) {
        Call c = new Call();
        c.setId(id);
        c.setUser(owner);
        c.setStatus(status);
        return c;
    }

    // ---------- H1: ownership no PUT ----------

    @Test
    @DisplayName("atualizar por quem nao e dono nem staff e negado (H1)")
    void atualizar_byNonOwnerCitizen_isForbidden() {
        User owner = user(1L, Role.CITIZEN);
        User intruder = user(2L, Role.CITIZEN);
        when(userRepository.findByEmail("user2@x.com")).thenReturn(Optional.of(intruder));
        when(callRepository.findById(10L)).thenReturn(Optional.of(call(10L, owner, CallStatus.PENDENTE)));

        assertThatThrownBy(() ->
                callService.atualizar(10L, new CallRequest(), "user2@x.com"))
                .isInstanceOf(AccessDeniedException.class);

        verify(callRepository, never()).save(any(Call.class));
    }

    @Test
    @DisplayName("atualizar pelo proprio autor e permitido (H1)")
    void atualizar_byOwner_succeeds() {
        User owner = user(1L, Role.CITIZEN);
        when(userRepository.findByEmail("user1@x.com")).thenReturn(Optional.of(owner));
        when(callRepository.findById(10L)).thenReturn(Optional.of(call(10L, owner, CallStatus.PENDENTE)));
        when(callRepository.save(any(Call.class))).thenAnswer(inv -> inv.getArgument(0));

        callService.atualizar(10L, new CallRequest(), "user1@x.com");

        verify(callRepository).save(any(Call.class));
    }

    @Test
    @DisplayName("atualizar pela prefeitura (CITY_HALL) e permitido mesmo sem ser dono (H1)")
    void atualizar_byCityHall_succeeds() {
        User owner = user(1L, Role.CITIZEN);
        User staff = user(9L, Role.CITY_HALL);
        when(userRepository.findByEmail("user9@x.com")).thenReturn(Optional.of(staff));
        when(callRepository.findById(10L)).thenReturn(Optional.of(call(10L, owner, CallStatus.PENDENTE)));
        when(callRepository.save(any(Call.class))).thenAnswer(inv -> inv.getArgument(0));

        callService.atualizar(10L, new CallRequest(), "user9@x.com");

        verify(callRepository).save(any(Call.class));
    }

    // ---------- H4: maquina de estados ----------

    @Test
    @DisplayName("alterarStatus avancando no fluxo e permitido (H4)")
    void alterarStatus_forward_succeeds() {
        when(callRepository.findById(10L))
                .thenReturn(Optional.of(call(10L, user(1L, Role.CITIZEN), CallStatus.RECEBIDO)));
        when(callRepository.save(any(Call.class))).thenAnswer(inv -> inv.getArgument(0));

        callService.alterarStatus(10L, CallStatus.EM_AVALIACAO, "ok");

        verify(callRepository).save(any(Call.class));
    }

    @Test
    @DisplayName("alterarStatus retrocedendo e bloqueado (H4)")
    void alterarStatus_backward_isRejected() {
        when(callRepository.findById(10L))
                .thenReturn(Optional.of(call(10L, user(1L, Role.CITIZEN), CallStatus.EM_EXECUCAO)));

        assertThatThrownBy(() ->
                callService.alterarStatus(10L, CallStatus.PENDENTE, "voltar"))
                .isInstanceOf(InvalidStatusTransitionException.class);

        verify(callRepository, never()).save(any(Call.class));
    }

    @Test
    @DisplayName("alterarStatus a partir de FINALIZADO e bloqueado: terminal (H4)")
    void alterarStatus_fromFinalizado_isRejected() {
        when(callRepository.findById(10L))
                .thenReturn(Optional.of(call(10L, user(1L, Role.CITIZEN), CallStatus.FINALIZADO)));

        assertThatThrownBy(() ->
                callService.alterarStatus(10L, CallStatus.EM_EXECUCAO, "reabrir"))
                .isInstanceOf(InvalidStatusTransitionException.class);

        verify(callRepository, never()).save(any(Call.class));
    }

    // ---------- H2: teto de paginacao ----------

    @Test
    @DisplayName("listarTodos limita o tamanho de pagina ao teto maximo (H2)")
    void listarTodos_capsPageSizeToMax() {
        when(callRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        callService.listarTodos(0, 9999);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(callRepository).findAll(captor.capture());
        assertThat(captor.getValue().getPageSize()).isEqualTo(CallService.MAX_PAGE_SIZE);
    }

    @Test
    @DisplayName("listarTodos sem parametros usa pagina 0 e tamanho padrao (H2)")
    void listarTodos_defaultsApplied() {
        when(callRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        callService.listarTodos(null, null);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(callRepository).findAll(captor.capture());
        assertThat(captor.getValue().getPageNumber()).isZero();
        assertThat(captor.getValue().getPageSize()).isEqualTo(CallService.DEFAULT_PAGE_SIZE);
    }
}
