package com.urbanwatch.dto;

public class GeocodeResponse {

    private String endereco;
    private Double latitude;
    private Double longitude;

    public GeocodeResponse() {
    }

    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
}