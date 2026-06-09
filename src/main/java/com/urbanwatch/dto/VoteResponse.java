package com.urbanwatch.dto;

/**
 * Resumo de votos de um chamado.
 * userVote: voto do usuario autenticado (true=like, false=dislike) ou null se nao votou / nao autenticado.
 */
public record VoteResponse(
        long likes,
        long dislikes,
        Boolean userVote
) {
}
