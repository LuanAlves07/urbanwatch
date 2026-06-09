package com.urbanwatch.controller;

import com.urbanwatch.dto.CallReviewRequest;
import com.urbanwatch.dto.CallReviewResponse;
import com.urbanwatch.service.CallReviewService;
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

@RestController
@RequestMapping("/calls")
public class CallReviewController {

    private final CallReviewService callReviewService;

    public CallReviewController(CallReviewService callReviewService) {
        this.callReviewService = callReviewService;
    }

    // POST /calls/{id}/review — avaliar chamado (apenas CITIZEN)
    @PreAuthorize("hasRole('CITIZEN')")
    @PostMapping("/{id}/review")
    public ResponseEntity<CallReviewResponse> criar(
            @PathVariable Long id,
            @Valid @RequestBody CallReviewRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        CallReviewResponse response = callReviewService.criar(id, request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // GET /calls/{id}/review — buscar avaliação de um chamado
    @GetMapping("/{id}/review")
    public ResponseEntity<CallReviewResponse> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(callReviewService.buscarPorChamado(id));
    }

    // DELETE /calls/reviews/{id} — deletar avaliação (apenas ADMIN)
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/reviews/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        callReviewService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}