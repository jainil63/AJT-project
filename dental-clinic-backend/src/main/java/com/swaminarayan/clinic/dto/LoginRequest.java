package com.swaminarayan.clinic.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Login ID is required") String identifier,
        @NotBlank(message = "Password is required") String password) {
}
