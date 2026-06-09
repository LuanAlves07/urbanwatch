package com.urbanwatch.exception;

public class LocationNotFoundException extends RuntimeException {
    public LocationNotFoundException(String endereco) {
        super("Localizacao nao encontrada para o endereco: " + endereco);
    }
}
