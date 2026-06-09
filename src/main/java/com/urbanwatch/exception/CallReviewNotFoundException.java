package com.urbanwatch.exception;

public class CallReviewNotFoundException extends RuntimeException {

    public CallReviewNotFoundException(Long callId) {
        super("Avaliação não encontrada para o chamado: " + callId);
    }
}