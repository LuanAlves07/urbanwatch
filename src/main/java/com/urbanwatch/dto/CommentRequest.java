package com.urbanwatch.dto;

import jakarta.validation.constraints.NotBlank;

public class CommentRequest {

    @NotBlank(message = "Conteúdo é obrigatório")
    private String content;

    public CommentRequest() {
    }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}