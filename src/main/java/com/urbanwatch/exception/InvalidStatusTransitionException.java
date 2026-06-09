package com.urbanwatch.exception;

import com.urbanwatch.entity.CallStatus;

public class InvalidStatusTransitionException extends RuntimeException {

    public InvalidStatusTransitionException(CallStatus from, CallStatus to) {
        super("Transicao de status invalida: " + from + " -> " + to);
    }
}
