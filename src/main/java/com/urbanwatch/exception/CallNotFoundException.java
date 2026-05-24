package com.urbanwatch.exception;

public class CallNotFoundException extends RuntimeException {

    public CallNotFoundException(Long id) {
        super("Chamado não encontrado: " + id);
    }
}
