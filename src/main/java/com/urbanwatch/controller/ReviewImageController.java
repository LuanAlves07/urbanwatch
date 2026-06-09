package com.urbanwatch.controller;

import com.urbanwatch.dto.ImageResponse;
import com.urbanwatch.entity.ReviewImage;
import com.urbanwatch.service.ReviewImageService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
public class ReviewImageController {

    private final ReviewImageService reviewImageService;

    public ReviewImageController(ReviewImageService reviewImageService) {
        this.reviewImageService = reviewImageService;
    }

    // POST /calls/{callId}/review/images — upload de imagem na avaliação
    @PostMapping("/{callId}/review/images")
    public ResponseEntity<ImageResponse> upload(
            @PathVariable Long callId,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reviewImageService.salvar(callId, file));
    }

    // GET /calls/{callId}/review/images — listar imagens da avaliação
    @GetMapping("/{callId}/review/images")
    public ResponseEntity<List<ImageResponse>> listar(@PathVariable Long callId) {
        return ResponseEntity.ok(reviewImageService.listarPorAvaliacao(callId));
    }

    // DELETE /calls/review/images/{id} — deletar imagem da avaliação (apenas ADMIN)
    @GetMapping("/review/images/{id}/file")
    public ResponseEntity<byte[]> arquivo(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean download) {
        ReviewImage image = reviewImageService.buscarArquivo(id);
        String contentType = image.getContentType() != null ? image.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.builder(download ? "attachment" : "inline")
                        .filename(image.getFileName())
                        .build()
                        .toString())
                .body(image.getData());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/review/images/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        reviewImageService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
