package com.urbanwatch.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.urbanwatch.dto.CommentRequest;
import com.urbanwatch.dto.CommentResponse;
import com.urbanwatch.entity.Call;
import com.urbanwatch.entity.Comment;
import com.urbanwatch.entity.Role;
import com.urbanwatch.entity.User;
import com.urbanwatch.exception.CallNotFoundException;
import com.urbanwatch.exception.CommentNotFoundException;
import com.urbanwatch.repository.CallRepository;
import com.urbanwatch.repository.CommentRepository;
import com.urbanwatch.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;
    @Mock
    private CallRepository callRepository;
    @Mock
    private UserRepository userRepository;

    private CommentService commentService;

    @BeforeEach
    void setUp() {
        commentService = new CommentService(commentRepository, callRepository, userRepository);
    }

    @Test
    @DisplayName("criar comentario persiste e devolve o conteudo")
    void criar_persistsComment() {
        User user = new User();
        user.setId(1L);
        user.setName("Alice");
        user.setRole(Role.CITIZEN);
        Call call = new Call();
        call.setId(10L);
        call.setUser(user);

        when(callRepository.findById(10L)).thenReturn(Optional.of(call));
        when(userRepository.findByEmail("alice@x.com")).thenReturn(Optional.of(user));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));

        CommentRequest request = new CommentRequest();
        request.setContent("Obrigado pelo retorno");

        CommentResponse response = commentService.criar(10L, request, "alice@x.com");

        assertThat(response.getContent()).isEqualTo("Obrigado pelo retorno");
        verify(commentRepository).save(any(Comment.class));
    }

    @Test
    @DisplayName("listar comentarios de chamado inexistente lanca 404")
    void listar_callMissing_throws() {
        when(callRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> commentService.listarPorChamado(99L))
                .isInstanceOf(CallNotFoundException.class);
    }

    @Test
    @DisplayName("deletar comentario inexistente lanca 404")
    void deletar_missing_throws() {
        when(commentRepository.existsById(5L)).thenReturn(false);

        assertThatThrownBy(() -> commentService.deletar(5L))
                .isInstanceOf(CommentNotFoundException.class);

        verify(commentRepository, never()).deleteById(any());
    }
}
