package com.urbanwatch.dto;

public record AuthResponse(
        String token,
        String tokenType,
        UserResponse user
) {
}
