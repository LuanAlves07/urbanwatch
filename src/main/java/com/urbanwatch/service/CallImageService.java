package com.urbanwatch.service;

import com.urbanwatch.dto.ImageResponse;
import com.urbanwatch.entity.Call;
import com.urbanwatch.entity.CallImage;
import com.urbanwatch.exception.CallNotFoundException;
import com.urbanwatch.exception.ImageNotFoundException;
import com.urbanwatch.repository.CallImageRepository;
import com.urbanwatch.repository.CallRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CallImageService {

    private final CallImageRepository callImageRepository;
    private final CallRepository callRepository;

    public CallImageService(CallImageRepository callImageRepository,
                            CallRepository callRepository) {
        this.callImageRepository = callImageRepository;
        this.callRepository = callRepository;
    }

    @Transactional
    public ImageResponse salvar(Long callId, MultipartFile file) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new CallNotFoundException(callId));

        validarArquivo(file);

        try {
            CallImage image = new CallImage();
            image.setFileName(file.getOriginalFilename());
            image.setContentType(file.getContentType());
            image.setData(file.getBytes());
            image.setCall(call);

            return toResponse(callImageRepository.save(image));
        } catch (IOException e) {
            throw new RuntimeException("Erro ao processar imagem: " + e.getMessage());
        }
    }

    public List<ImageResponse> listarPorChamado(Long callId) {
        if (!callRepository.existsById(callId)) {
            throw new CallNotFoundException(callId);
        }
        return callImageRepository.findByCallIdOrderByCreatedAtDesc(callId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public CallImage buscarArquivo(Long id) {
        return callImageRepository.findById(id)
                .orElseThrow(() -> new ImageNotFoundException(id));
    }

    @Transactional
    public void deletar(Long id) {
        if (!callImageRepository.existsById(id)) {
            throw new ImageNotFoundException(id);
        }
        callImageRepository.deleteById(id);
    }

    private ImageResponse toResponse(CallImage image) {
        ImageResponse response = new ImageResponse();
        response.setId(image.getId());
        response.setFileName(image.getFileName());
        response.setContentType(image.getContentType());
        response.setCreatedAt(image.getCreatedAt());
        return response;
    }

    private void validarArquivo(MultipartFile file) {
        String contentType = file.getContentType();

        if (contentType == null || !(contentType.startsWith("image/") || contentType.startsWith("video/"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Apenas imagem ou video sao permitidos.");
        }
    }
}
