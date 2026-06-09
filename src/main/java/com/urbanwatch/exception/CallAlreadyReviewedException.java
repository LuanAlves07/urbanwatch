package com.urbanwatch.exception;

public class CallAlreadyReviewedException extends RuntimeException {

    public CallAlreadyReviewedException(Long callId) {
        super("Chamado já foi avaliado: " + callId);
    }
}