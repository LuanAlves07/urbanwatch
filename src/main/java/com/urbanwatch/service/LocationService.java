package com.urbanwatch.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.urbanwatch.dto.GeocodeResponse;
import com.urbanwatch.dto.ReverseGeocodeResponse;
import com.urbanwatch.exception.LocationNotFoundException;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class LocationService {

    private static final String NOMINATIM_URL = "https://nominatim.openstreetmap.org";
    private static final String USER_AGENT = "UrbanWatch/1.0 (projeto academico)";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(8);
    private static final Pattern CEP_PATTERN = Pattern.compile("\\d{5}-?\\d{3}");

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public LocationService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public GeocodeResponse geocode(String endereco) {
        for (String candidate : buildFallbackQueries(endereco)) {
            Optional<GeocodeResponse> hit = queryNominatim(candidate);
            if (hit.isPresent()) {
                return hit.get();
            }
        }
        throw new LocationNotFoundException(endereco);
    }

    /**
     * Consulta o Nominatim para um unico termo. Retorna vazio quando o servico
     * nao encontra resultado (array vazio) ou quando ocorre falha de rede/parse,
     * deixando o chamador tentar uma consulta mais generica.
     */
    private Optional<GeocodeResponse> queryNominatim(String query) {
        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = NOMINATIM_URL + "/search?q=" + encoded + "&format=json&limit=1";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", USER_AGENT)
                    .timeout(REQUEST_TIMEOUT)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = objectMapper.readTree(response.body());

            if (root.isEmpty()) {
                return Optional.empty();
            }

            JsonNode result = root.get(0);
            GeocodeResponse geocodeResponse = new GeocodeResponse();
            geocodeResponse.setEndereco(result.get("display_name").asText());
            geocodeResponse.setLatitude(result.get("lat").asDouble());
            geocodeResponse.setLongitude(result.get("lon").asDouble());
            return Optional.of(geocodeResponse);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    /**
     * Gera consultas do termo mais especifico ao mais generico. Enderecos
     * residenciais detalhados costumam nao existir no OpenStreetMap; ao afrouxar
     * a busca (removendo rua/bairro e sintetizando CEP+cidade) chegamos a um
     * resultado ao menos no nivel de cidade em vez de falhar. Metodo puro.
     */
    static List<String> buildFallbackQueries(String endereco) {
        if (endereco == null || endereco.isBlank()) {
            return List.of();
        }

        List<String> tokens = Arrays.stream(endereco.split(","))
                .map(String::trim)
                .filter(token -> !token.isBlank())
                .toList();

        if (tokens.isEmpty()) {
            return List.of(endereco.trim());
        }

        LinkedHashSet<String> candidates = new LinkedHashSet<>();
        for (int start = 0; start < tokens.size(); start++) {
            candidates.add(String.join(", ", tokens.subList(start, tokens.size())));
        }

        findCepToken(tokens).ifPresent(cep -> {
            String city = guessCityToken(tokens);
            if (city != null) {
                candidates.add(cep + ", " + city + ", Brasil");
            }
            candidates.add(cep + ", Brasil");
            candidates.add(cep);
        });

        return List.copyOf(candidates);
    }

    private static Optional<String> findCepToken(List<String> tokens) {
        return tokens.stream()
                .filter(token -> CEP_PATTERN.matcher(token).find())
                .findFirst();
    }

    private static String guessCityToken(List<String> tokens) {
        for (int i = tokens.size() - 1; i >= 0; i--) {
            String token = tokens.get(i);
            if (token.equalsIgnoreCase("Brasil") || token.equalsIgnoreCase("Brazil")) {
                continue;
            }
            if (token.length() == 2) {
                continue;
            }
            if (CEP_PATTERN.matcher(token).matches()) {
                continue;
            }
            return token;
        }
        return null;
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