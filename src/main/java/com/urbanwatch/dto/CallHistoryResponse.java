package com.urbanwatch.dto;

import com.urbanwatch.entity.CallStatus;
import java.time.LocalDateTime;

public class CallHistoryResponse {

    private Long id;
    private CallStatus statusAnterior;
    private CallStatus statusNovo;
    private String observacao;
    private LocalDateTime dataAlteracao;

    public CallHistoryResponse() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public CallStatus getStatusAnterior() { return statusAnterior; }
    public void setStatusAnterior(CallStatus statusAnterior) { this.statusAnterior = statusAnterior; }
    public CallStatus getStatusNovo() { return statusNovo; }
    public void setStatusNovo(CallStatus statusNovo) { this.statusNovo = statusNovo; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
    public LocalDateTime getDataAlteracao() { return dataAlteracao; }
    public void setDataAlteracao(LocalDateTime dataAlteracao) { this.dataAlteracao = dataAlteracao; }
}
