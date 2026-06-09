package com.urbanwatch.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("LocationService.buildFallbackQueries")
class LocationServiceTest {

    @Test
    @DisplayName("mantem a query completa primeiro e vai removendo tokens iniciais")
    void dropsLeadingTokens() {
        List<String> result = LocationService.buildFallbackQueries(
                "Av. Brasil, Centro, Ribeirao Preto, SP, 14020-260, Brasil");

        assertThat(result.get(0))
                .isEqualTo("Av. Brasil, Centro, Ribeirao Preto, SP, 14020-260, Brasil");
        assertThat(result).anyMatch(query -> query.startsWith("Centro,"));
    }

    @Test
    @DisplayName("sintetiza candidato CEP + cidade quando ha CEP")
    void synthesizesCepCity() {
        List<String> result = LocationService.buildFallbackQueries(
                "Av. Brasil, Centro, Ribeirao Preto, SP, 14020-260, Brasil");

        assertThat(result)
                .anyMatch(query -> query.startsWith("14020-260") && query.contains("Ribeirao Preto"));
        assertThat(result).contains("14020-260, Brasil");
        assertThat(result).contains("14020-260");
    }

    @Test
    @DisplayName("entrada em branco ou nula gera lista vazia")
    void blankInput() {
        assertThat(LocationService.buildFallbackQueries("  ")).isEmpty();
        assertThat(LocationService.buildFallbackQueries(null)).isEmpty();
    }

    @Test
    @DisplayName("sem CEP: apenas os recortes por virgula, sem query sintetica de CEP")
    void noCep() {
        List<String> result = LocationService.buildFallbackQueries("Av. Paulista, Sao Paulo, SP, Brasil");

        assertThat(result.get(0)).isEqualTo("Av. Paulista, Sao Paulo, SP, Brasil");
        assertThat(result).noneMatch(query -> query.matches("\\d{5}-?\\d{3}.*"));
    }

    @Test
    @DisplayName("candidatos sao deduplicados e ordenados do mais ao menos especifico")
    void deduped() {
        List<String> result = LocationService.buildFallbackQueries("14020-260, Ribeirao Preto, Brasil");

        assertThat(result).doesNotHaveDuplicates();
        assertThat(result.get(0)).isEqualTo("14020-260, Ribeirao Preto, Brasil");
    }
}
