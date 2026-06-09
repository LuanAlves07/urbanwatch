package com.urbanwatch.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.urbanwatch.dto.GeocodeResponse;
import com.urbanwatch.dto.ReverseGeocodeResponse;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
public class LocationService {

    private static final String NOMINATIM_URL = "https://nominatim.openstreetmap.org";
    private static final String USER_AGENT = "UrbanWatch/1.0";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(8);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public LocationService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public GeocodeResponse geocode(String endereco) {
        try {
            String encodedEndereco = URLEncoder.encode(endereco, StandardCharsets.UTF_8);
            String url = NOMINATIM_URL + "/search?q=" + encodedEndereco + "&format=json&limit=1";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", USER_AGENT)
                    .timeout(REQUEST_TIMEOUT)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = objectMapper.readTree(response.body());

            if (root.isEmpty()) {
                throw new RuntimeException("Endereço não encontrado: " + endereco);
            }

            JsonNode result = root.get(0);

            GeocodeResponse geocodeResponse = new GeocodeResponse();
            geocodeResponse.setEndereco(result.get("display_name").asText());
            geocodeResponse.setLatitude(result.get("lat").asDouble());
            geocodeResponse.setLongitude(result.get("lon").asDouble());

            return geocodeResponse;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Erro ao consultar Nominatim: " + e.getMessage());
        }
    }

    public ReverseGeocodeResponse reverseGeocode(Double latitude, Double longitude) {
        try {
            String url = NOMINATIM_URL + "/reverse?lat=" + latitude + "&lon=" + longitude + "&format=json";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", USER_AGENT)
                    .timeout(REQUEST_TIMEOUT)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = objectMapper.readTree(response.body());

            if (root.has("error")) {
                throw new RuntimeException("Localização não encontrada para as coordenadas informadas");
            }

            JsonNode address = root.get("address");

            ReverseGeocodeResponse reverseResponse = new ReverseGeocodeResponse();
            reverseResponse.setLatitude(latitude);
            reverseResponse.setLongitude(longitude);
            reverseResponse.setEndereco(root.get("display_name").asText());
            reverseResponse.setBairro(getTextOrNull(address, "suburb"));
            reverseResponse.setCidade(getTextOrNull(address, "city"));
            reverseResponse.setEstado(getTextOrNull(address, "state"));
            reverseResponse.setPais(getTextOrNull(address, "country"));

            return reverseResponse;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Erro ao consultar Nominatim: " + e.getMessage());
        }
    }

    private String getTextOrNull(JsonNode node, String field) {
        if (node != null && node.has(field)) {
            return node.get(field).asText();
        }
        return null;
    }
}