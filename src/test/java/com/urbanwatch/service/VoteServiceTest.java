package com.urbanwatch.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.urbanwatch.dto.VoteResponse;
import com.urbanwatch.entity.Call;
import com.urbanwatch.entity.Role;
import com.urbanwatch.entity.User;
import com.urbanwatch.entity.Vote;
import com.urbanwatch.exception.CallNotFoundException;
import com.urbanwatch.repository.CallRepository;
import com.urbanwatch.repository.UserRepository;
import com.urbanwatch.repository.VoteRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VoteServiceTest {

    @Mock
    private VoteRepository voteRepository;
    @Mock
    private CallRepository callRepository;
    @Mock
    private UserRepository userRepository;

    private VoteService voteService;

    @BeforeEach
    void setUp() {
        voteService = new VoteService(voteRepository, callRepository, userRepository);
    }

    private User user(Long id) {
        User u = new User();
        u.setId(id);
        u.setRole(Role.CITIZEN);
        return u;
    }

    private Call call(Long id) {
        Call c = new Call();
        c.setId(id);
        return c;
    }

    @Test
    @DisplayName("primeiro voto cria registro e conta o like")
    void registrar_firstVote_creates() {
        when(callRepository.findById(10L)).thenReturn(Optional.of(call(10L)));
        when(userRepository.findByEmail("a@x.com")).thenReturn(Optional.of(user(1L)));
        when(voteRepository.findByCallIdAndUserId(10L, 1L)).thenReturn(Optional.empty());
        when(voteRepository.countByCallIdAndValue(10L, true)).thenReturn(1L);
        when(voteRepository.countByCallIdAndValue(10L, false)).thenReturn(0L);

        VoteResponse r = voteService.registrar(10L, true, "a@x.com");

        verify(voteRepository).save(any(Vote.class));
        assertThat(r.likes()).isEqualTo(1L);
        assertThat(r.userVote()).isTrue();
    }

    @Test
    @DisplayName("votar de novo atualiza o voto existente (like -> dislike)")
    void registrar_changesExistingVote() {
        Vote existente = new Vote();
        existente.setCall(call(10L));
        existente.setUser(user(1L));
        existente.setValue(true);
        when(callRepository.findById(10L)).thenReturn(Optional.of(call(10L)));
        when(userRepository.findByEmail("a@x.com")).thenReturn(Optional.of(user(1L)));
        when(voteRepository.findByCallIdAndUserId(10L, 1L)).thenReturn(Optional.of(existente));
        when(voteRepository.countByCallIdAndValue(eq(10L), any(Boolean.class))).thenReturn(0L);

        voteService.registrar(10L, false, "a@x.com");

        ArgumentCaptor<Vote> captor = ArgumentCaptor.forClass(Vote.class);
        verify(voteRepository).save(captor.capture());
        assertThat(captor.getValue().getValue()).isFalse();
    }

    @Test
    @DisplayName("votar em chamado inexistente lanca 404")
    void registrar_callMissing_throws() {
        when(callRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> voteService.registrar(99L, true, "a@x.com"))
                .isInstanceOf(CallNotFoundException.class);
    }

    @Test
    @DisplayName("buscar resumo retorna contagens de likes e dislikes")
    void buscar_returnsCounts() {
        when(callRepository.existsById(10L)).thenReturn(true);
        when(voteRepository.countByCallIdAndValue(10L, true)).thenReturn(3L);
        when(voteRepository.countByCallIdAndValue(10L, false)).thenReturn(1L);

        VoteResponse r = voteService.buscar(10L, null);

        assertThat(r.likes()).isEqualTo(3L);
        assertThat(r.dislikes()).isEqualTo(1L);
        assertThat(r.userVote()).isNull();
    }
}
