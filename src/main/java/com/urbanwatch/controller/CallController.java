package com.urbanwatch.controller;

import com.urbanwatch.dto.CallHistoryResponse;
import com.urbanwatch.dto.CallRequest;
import com.urbanwatch.dto.CallResponse;
import com.urbanwatch.dto.StatusUpdateRequest;
import com.urbanwatch.service.CallService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/calls")
public class CallController {

    private final CallService callService;

    public CallController(CallService callService) {
        this.callService = callService;
    }

    // GET /calls — listar todos os chamados
    @GetMapping
    public ResponseEntity<List<CallResponse>> listarTodos() {
        return ResponseEntity.ok(callService.listarTodos());
    }

    // GET /calls/{id} — buscar chamado por ID
    @GetMapping("/{id}")
    public ResponseEntity<CallResponse> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(callService.buscarPorId(id));
    }

    // POST /calls — criar novo chamado (qualquer usuário autenticado)
    @PostMapping
    public ResponseEntity<CallResponse> criar(
            @Valid @RequestBody CallRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        CallResponse response = callService.criar(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // PUT /calls/{id} — atualizar chamado
    @PutMapping("/{id}")
    public ResponseEntity<CallResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody CallRequest request) {
        return ResponseEntity.ok(callService.atualizar(id, request));
    }

    // DELETE /calls/{id} — deletar chamado (apenas ADMIN)
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        callService.deletar(id);
        return ResponseEntity.noContent().build();
    }

    // PATCH /calls/{id}/status — alterar status (apenas CITY_HALL e ADMIN)
    @PreAuthorize("hasRole('CITY_HALL') or hasRole('ADMIN')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<CallResponse> alterarStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request) {
        return ResponseEntity.ok(callService.alterarStatus(id, request.getStatus(), request.getObservacao()));
    }

    // PATCH /calls/{id}/pausar — pausar chamado (apenas CITY_HALL e ADMIN)
    @PreAuthorize("hasRole('CITY_HALL') or hasRole('ADMIN')")
    @PatchMapping("/{id}/pausar")
    public ResponseEntity<CallResponse> pausar(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String motivo = body.getOrDefault("motivo", "Sem motivo informado");
        return ResponseEntity.ok(callService.pausar(id, motivo));
    }

    // PATCH /calls/{id}/retomar — retomar chamado pausado (apenas CITY_HALL e ADMIN)
    @PreAuthorize("hasRole('CITY_HALL') or hasRole('ADMIN')")
    @PatchMapping("/{id}/retomar")
    public ResponseEntity<CallResponse> retomar(@PathVariable Long id) {
        return ResponseEntity.ok(callService.retomar(id));
    }

    // GET /calls/{id}/historico — histórico de status do chamado
    @GetMapping("/{id}/historico")
    public ResponseEntity<List<CallHistoryResponse>> historico(@PathVariable Long id) {
        return ResponseEntity.ok(callService.buscarHistorico(id));
    }

    // PATCH /calls/{id}/prefeitura — observação da prefeitura (apenas CITY_HALL e ADMIN)
    @PreAuthorize("hasRole('CITY_HALL') or hasRole('ADMIN')")
    @PatchMapping("/{id}/prefeitura")
    public ResponseEntity<CallResponse> observacaoPrefeitura(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String observacao = body.getOrDefault("observacao", "");
        return ResponseEntity.ok(callService.adicionarObservacaoPrefeitura(id, observacao));
    }

    // GET /calls/criticos — listar chamados com SLA crítico
    @GetMapping("/criticos")
    public ResponseEntity<List<CallResponse>> listarCriticos() {
        return ResponseEntity.ok(callService.listarCriticos());
    }

    // PATCH /calls/{id}/sla — recalcular SLA do chamado
    @PreAuthorize("hasRole('CITY_HALL') or hasRole('ADMIN')")
    @PatchMapping("/{id}/sla")
    public ResponseEntity<CallResponse> atualizarSla(@PathVariable Long id) {
        return ResponseEntity.ok(callService.atualizarSla(id));
    }

    // GET /calls/proximos — listar chamados próximos
    @GetMapping("/proximos")
    public ResponseEntity<List<CallResponse>> listarProximos(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(defaultValue = "5.0") Double raio) {
        return ResponseEntity.ok(callService.listarProximos(latitude, longitude, raio));
    }
}
