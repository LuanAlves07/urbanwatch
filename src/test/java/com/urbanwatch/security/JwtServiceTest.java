package com.urbanwatch.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

class JwtServiceTest {

    private JwtService jwtService;

    private UserDetails user(String username) {
        return User.withUsername(username).password("x").authorities("ROLE_CITIZEN").build();
    }

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret",
                "chave-de-teste-suficientemente-longa-para-hmac-sha-256-0123456789");
        ReflectionTestUtils.setField(jwtService, "expirationMs", 3_600_000L);
    }

    @Test
    @DisplayName("token gerado carrega o email como subject")
    void generateToken_subjectIsUsername() {
        String token = jwtService.generateToken(user("alice@x.com"));
        assertThat(jwtService.extractUsername(token)).isEqualTo("alice@x.com");
    }

    @Test
    @DisplayName("token e valido para o mesmo usuario")
    void isTokenValid_sameUser_true() {
        String token = jwtService.generateToken(user("alice@x.com"));
        assertThat(jwtService.isTokenValid(token, user("alice@x.com"))).isTrue();
    }

    @Test
    @DisplayName("token nao e valido para usuario diferente")
    void isTokenValid_differentUser_false() {
        String token = jwtService.generateToken(user("alice@x.com"));
        assertThat(jwtService.isTokenValid(token, user("bob@x.com"))).isFalse();
    }

    @Test
    @DisplayName("token expirado lanca ExpiredJwtException ao ser lido")
    void expiredToken_throws() {
        ReflectionTestUtils.setField(jwtService, "expirationMs", -1_000L);
        String expired = jwtService.generateToken(user("alice@x.com"));

        assertThatThrownBy(() -> jwtService.extractUsername(expired))
                .isInstanceOf(ExpiredJwtException.class);
    }
}
