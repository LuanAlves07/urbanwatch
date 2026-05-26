package com.urbanwatch.exception;

public class ImageNotFoundException extends RuntimeException {

    public ImageNotFoundException(Long id) {
        super("Imagem não encontrada: " + id);
    }
}