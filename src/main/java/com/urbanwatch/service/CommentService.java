package com.urbanwatch.service;

import com.urbanwatch.dto.CommentRequest;
import com.urbanwatch.dto.CommentResponse;
import com.urbanwatch.entity.Call;
import com.urbanwatch.entity.Comment;
import com.urbanwatch.entity.User;
import com.urbanwatch.exception.CallNotFoundException;
import com.urbanwatch.exception.CommentNotFoundException;
import com.urbanwatch.repository.CallRepository;
import com.urbanwatch.repository.CommentRepository;
import com.urbanwatch.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;
    private final CallRepository callRepository;
    private final UserRepository userRepository;

    public CommentService(CommentRepository commentRepository,
                          CallRepository callRepository,
                          UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.callRepository = callRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public CommentResponse criar(Long callId, CommentRequest request, String userEmail) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new CallNotFoundException(callId));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + userEmail));

        Comment comment = new Comment();
        comment.setContent(request.getContent());
        comment.setCall(call);
        comment.setUser(user);

        return toResponse(commentRepository.save(comment));
    }

    public List<CommentResponse> listarPorChamado(Long callId) {
        if (!callRepository.existsById(callId)) {
            throw new CallNotFoundException(callId);
        }
        return commentRepository.findByCallIdOrderByCreatedAtDesc(callId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deletar(Long id) {
        if (!commentRepository.existsById(id)) {
            throw new CommentNotFoundException(id);
        }
        commentRepository.deleteById(id);
    }

    private CommentResponse toResponse(Comment comment) {
        CommentResponse response = new CommentResponse();
        response.setId(comment.getId());
        response.setContent(comment.getContent());
        response.setCreatedAt(comment.getCreatedAt());
        response.setCallId(comment.getCall().getId());
        if (comment.getUser() != null) {
            response.setUserId(comment.getUser().getId());
            response.setUserName(comment.getUser().getName());
        }
        return response;
    }
}