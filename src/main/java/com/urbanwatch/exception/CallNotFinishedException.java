package com.urbanwatch.exception;

public class CallNotFinishedException extends RuntimeException {

    public CallNotFinishedException(Long callId) {
        super("Chamado não está finalizado: " + callId);
    }
}