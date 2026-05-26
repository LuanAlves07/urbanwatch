package com.urbanwatch.controller;

import com.urbanwatch.dto.ImageResponse;
import com.urbanwatch.service.CallImageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/calls")
public class CallImageController {

    private final CallImageService callImageService;

    public CallImageController(CallImageService callImageService) {
        this.callImageService = callImageService;
    }

    // POST /calls/{id}/images — upload de imagem no chamado
    @PostMapping("/{id}/images")
    public ResponseEntity<ImageResponse> upload(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(callImageService.salvar(id, file));
    }

    // GET /calls/{id}/images — listar imagens do chamado
    @GetMapping("/{id}/images")
    public ResponseEntity<List<ImageResponse>> listar(@PathVariable Long id) {
        return ResponseEntity.ok(callImageService.listarPorChamado(id));
    }

    // DELETE /calls/images/{id} — deletar imagem do chamado (apenas ADMIN)
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/images/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        callImageService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}