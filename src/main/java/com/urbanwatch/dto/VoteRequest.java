package com.urbanwatch.dto;

import jakarta.validation.constraints.NotNull;

public record VoteRequest(
        @NotNull(message = "Valor do voto e obrigatorio (true=like, false=dislike)")
        Boolean value
) {
}
