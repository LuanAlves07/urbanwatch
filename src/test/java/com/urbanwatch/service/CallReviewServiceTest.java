package com.urbanwatch.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.urbanwatch.dto.CallReviewRequest;
import com.urbanwatch.dto.CallReviewResponse;
import com.urbanwatch.entity.Call;
import com.urbanwatch.entity.CallReview;
import com.urbanwatch.entity.CallStatus;
import com.urbanwatch.entity.Role;
import com.urbanwatch.entity.User;
import com.urbanwatch.exception.CallAlreadyReviewedException;
import com.urbanwatch.exception.CallNotFinishedException;
import com.urbanwatch.repository.CallRepository;
import com.urbanwatch.repository.CallReviewRepository;
import com.urbanwatch.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CallReviewServiceTest {

    @Mock
    private CallReviewRepository callReviewRepository;
    @Mock
    private CallRepository callRepository;
    @Mock
    private UserRepository userRepository;

    private CallReviewService callReviewService;

    @BeforeEach
    void setUp() {
        callReviewService = new CallReviewService(callReviewRepository, callRepository, userRepository);
    }

    private Call call(Long id, CallStatus status) {
        Call c = new Call();
        c.setId(id);
        c.setStatus(status);
        return c;
    }

    private User user(Long id) {
        User u = new User();
        u.setId(id);
        u.setName("Alice");
        u.setRole(Role.CITIZEN);
        return u;
    }

    private CallReviewRequest request(int rating) {
        CallReviewRequest r = new CallReviewRequest();
        r.setRating(rating);
        r.setComment("bom atendimento");
        return r;
    }

    @Test
    @DisplayName("avaliar chamado nao finalizado e bloqueado")
    void criar_notFinished_throws() {
        when(callRepository.findById(10L)).thenReturn(Optional.of(call(10L, CallStatus.EM_EXECUCAO)));

        assertThatThrownBy(() -> callReviewService.criar(10L, request(5), "alice@x.com"))
                .isInstanceOf(CallNotFinishedException.class);

        verify(callReviewRepository, never()).save(any(CallReview.class));
    }

    @Test
    @DisplayName("avaliar duas vezes o mesmo chamado e bloqueado")
    void criar_duplicate_throws() {
        when(callRepository.findById(10L)).thenReturn(Optional.of(call(10L, CallStatus.FINALIZADO)));
        when(userRepository.findByEmail("alice@x.com")).thenReturn(Optional.of(user(1L)));
        when(callReviewRepository.existsByCallIdAndUserId(10L, 1L)).thenReturn(true);

        assertThatThrownBy(() -> callReviewService.criar(10L, request(4), "alice@x.com"))
                .isInstanceOf(CallAlreadyReviewedException.class);

        verify(callReviewRepository, never()).save(any(CallReview.class));
    }

    @Test
    @DisplayName("avaliar chamado finalizado pela primeira vez persiste")
    void criar_success() {
        when(callRepository.findById(10L)).thenReturn(Optional.of(call(10L, CallStatus.FINALIZADO)));
        when(userRepository.findByEmail("alice@x.com")).thenReturn(Optional.of(user(1L)));
        when(callReviewRepository.existsByCallIdAndUserId(eq(10L), eq(1L))).thenReturn(false);
        when(callReviewRepository.save(any(CallReview.class))).thenAnswer(inv -> inv.getArgument(0));

        CallReviewResponse response = callReviewService.criar(10L, request(5), "alice@x.com");

        assertThat(response.getRating()).isEqualTo(5);
        verify(callReviewRepository).save(any(CallReview.class));
    }
}
