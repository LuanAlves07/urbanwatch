package com.urbanwatch.controller;

import com.urbanwatch.dto.CommentRequest;
import com.urbanwatch.dto.CommentResponse;
import com.urbanwatch.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/calls")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    // POST /calls/{id}/comments — adicionar comentário
    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentResponse> criar(
            @PathVariable Long id,
            @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        CommentResponse response = commentService.criar(id, request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // GET /calls/{id}/comments — listar comentários de um chamado
    @GetMapping("/{id}/comments")
    public ResponseEntity<List<CommentResponse>> listar(@PathVariable Long id) {
        return ResponseEntity.ok(commentService.listarPorChamado(id));
    }

    // DELETE /calls/comments/{id} — deletar comentário (apenas ADMIN)
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        commentService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}