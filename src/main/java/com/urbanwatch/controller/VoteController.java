package com.urbanwatch.controller;

import com.urbanwatch.dto.VoteRequest;
import com.urbanwatch.dto.VoteResponse;
import com.urbanwatch.service.VoteService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/calls")
public class VoteController {

    private final VoteService voteService;

    public VoteController(VoteService voteService) {
        this.voteService = voteService;
    }

    // GET /calls/{id}/votes — resumo de likes/dislikes (público; inclui voto do usuário se autenticado)
    @GetMapping("/{id}/votes")
    public ResponseEntity<VoteResponse> resumo(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(voteService.buscar(id, email));
    }

    // POST /calls/{id}/votes — registrar/atualizar voto (autenticado)
    @PostMapping("/{id}/votes")
    public ResponseEntity<VoteResponse> votar(
            @PathVariable Long id,
            @Valid @RequestBody VoteRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(voteService.registrar(id, request.value(), userDetails.getUsername()));
    }

    // DELETE /calls/{id}/votes — remover o próprio voto (autenticado)
    @DeleteMapping("/{id}/votes")
    public ResponseEntity<VoteResponse> remover(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(voteService.remover(id, userDetails.getUsername()));
    }
}
