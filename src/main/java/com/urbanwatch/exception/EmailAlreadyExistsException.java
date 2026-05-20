package com.urbanwatch.exception;

public class EmailAlreadyExistsException extends RuntimeException {

    public EmailAlreadyExistsException(String email) {
        super("Ja existe um usuario cadastrado com o email: " + email);
    }
}
