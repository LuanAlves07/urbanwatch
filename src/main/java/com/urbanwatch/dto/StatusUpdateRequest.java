package com.urbanwatch.dto;

import com.urbanwatch.entity.CallStatus;
import jakarta.validation.constraints.NotNull;

public class StatusUpdateRequest {

    @NotNull(message = "Status é obrigatório")
    private CallStatus status;

    private String observacao;

    public StatusUpdateRequest() {
    }

    public CallStatus getStatus() { return status; }
    public void setStatus(CallStatus status) { this.status = status; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
}
