package com.urbanwatch.exception;

public class CommentNotFoundException extends RuntimeException {

    public CommentNotFoundException(Long id) {
        super("Comentário não encontrado: " + id);
    }
}