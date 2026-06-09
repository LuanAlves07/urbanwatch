package com.urbanwatch.service;

import com.urbanwatch.dto.CallReviewRequest;
import com.urbanwatch.dto.CallReviewResponse;
import com.urbanwatch.entity.Call;
import com.urbanwatch.entity.CallReview;
import com.urbanwatch.entity.CallStatus;
import com.urbanwatch.entity.User;
import com.urbanwatch.exception.CallAlreadyReviewedException;
import com.urbanwatch.exception.CallNotFoundException;
import com.urbanwatch.exception.CallNotFinishedException;
import com.urbanwatch.exception.CallReviewNotFoundException;
import com.urbanwatch.repository.CallRepository;
import com.urbanwatch.repository.CallReviewRepository;
import com.urbanwatch.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CallReviewService {

    private final CallReviewRepository callReviewRepository;
    private final CallRepository callRepository;
    private final UserRepository userRepository;

    public CallReviewService(CallReviewRepository callReviewRepository,
                             CallRepository callRepository,
                             UserRepository userRepository) {
        this.callReviewRepository = callReviewRepository;
        this.callRepository = callRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public CallReviewResponse criar(Long callId, CallReviewRequest request, String userEmail) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new CallNotFoundException(callId));

        if (call.getStatus() != CallStatus.FINALIZADO) {
            throw new CallNotFinishedException(callId);
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado: " + userEmail));

        if (callReviewRepository.existsByCallIdAndUserId(callId, user.getId())) {
            throw new CallAlreadyReviewedException(callId);
        }

        CallReview review = new CallReview();
        review.setRating(request.getRating());
        review.setComment(request.getComment());
        review.setCall(call);
        review.setUser(user);

        return toResponse(callReviewRepository.save(review));
    }

    public CallReviewResponse buscarPorChamado(Long callId) {
        if (!callRepository.existsById(callId)) {
            throw new CallNotFoundException(callId);
        }
        CallReview review = callReviewRepository.findByCallId(callId)
                .orElseThrow(() -> new CallReviewNotFoundException(callId));
        return toResponse(review);
    }

    @Transactional
    public void deletar(Long id) {
        if (!callReviewRepository.existsById(id)) {
            throw new CallReviewNotFoundException(id);
        }
        callReviewRepository.deleteById(id);
    }

    private CallReviewResponse toResponse(CallReview review) {
        CallReviewResponse response = new CallReviewResponse();
        response.setId(review.getId());
        response.setRating(review.getRating());
        response.setComment(review.getComment());
        response.setCreatedAt(review.getCreatedAt());
        response.setCallId(review.getCall().getId());
        if (review.getUser() != null) {
            response.setUserId(review.getUser().getId());
            response.setUserName(review.getUser().getName());
        }
        return response;
    }
}