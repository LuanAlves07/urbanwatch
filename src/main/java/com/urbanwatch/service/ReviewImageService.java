package com.urbanwatch.service;

import com.urbanwatch.dto.ImageResponse;
import com.urbanwatch.entity.CallReview;
import com.urbanwatch.entity.ReviewImage;
import com.urbanwatch.exception.CallNotFoundException;
import com.urbanwatch.exception.CallReviewNotFoundException;
import com.urbanwatch.exception.ImageNotFoundException;
import com.urbanwatch.repository.CallRepository;
import com.urbanwatch.repository.CallReviewRepository;
import com.urbanwatch.repository.ReviewImageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReviewImageService {

    private final ReviewImageRepository reviewImageRepository;
    private final CallReviewRepository callReviewRepository;
    private final CallRepository callRepository;

    public ReviewImageService(ReviewImageRepository reviewImageRepository,
                              CallReviewRepository callReviewRepository,
                              CallRepository callRepository) {
        this.reviewImageRepository = reviewImageRepository;
        this.callReviewRepository = callReviewRepository;
        this.callRepository = callRepository;
    }

    @Transactional
    public ImageResponse salvar(Long callId, MultipartFile file) {
        if (!callRepository.existsById(callId)) {
            throw new CallNotFoundException(callId);
        }

        CallReview review = callReviewRepository.findByCallId(callId)
                .orElseThrow(() -> new CallReviewNotFoundException(callId));

        try {
            ReviewImage image = new ReviewImage();
            image.setFileName(file.getOriginalFilename());
            image.setContentType(file.getContentType());
            image.setData(file.getBytes());
            image.setReview(review);

            return toResponse(reviewImageRepository.save(image));
        } catch (IOException e) {
            throw new RuntimeException("Erro ao processar imagem: " + e.getMessage());
        }
    }

    public List<ImageResponse> listarPorAvaliacao(Long callId) {
        if (!callRepository.existsById(callId)) {
            throw new CallNotFoundException(callId);
        }

        CallReview review = callReviewRepository.findByCallId(callId)
                .orElseThrow(() -> new CallReviewNotFoundException(callId));

        return reviewImageRepository.findByReviewIdOrderByCreatedAtDesc(review.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deletar(Long id) {
        if (!reviewImageRepository.existsById(id)) {
            throw new ImageNotFoundException(id);
        }
        reviewImageRepository.deleteById(id);
    }

    private ImageResponse toResponse(ReviewImage image) {
        ImageResponse response = new ImageResponse();
        response.setId(image.getId());
        response.setFileName(image.getFileName());
        response.setContentType(image.getContentType());
        response.setCreatedAt(image.getCreatedAt());
        return response;
    }
}