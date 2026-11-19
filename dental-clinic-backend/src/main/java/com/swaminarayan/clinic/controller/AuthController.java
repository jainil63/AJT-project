package com.swaminarayan.clinic.controller;

import com.swaminarayan.clinic.dto.ApiResponse;
import com.swaminarayan.clinic.dto.LoginRequest;
import com.swaminarayan.clinic.dto.RefreshRequest;
import com.swaminarayan.clinic.security.JwtAuthFilter;
import com.swaminarayan.clinic.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req.identifier(), req.password());
    }

    @PostMapping("/refresh")
    public Map<String, Object> refresh(@Valid @RequestBody RefreshRequest req) {
        return auth.refresh(req.refreshToken());
    }

    /** Tokens are stateless; the frontend discards them on logout. */
    @PostMapping("/logout")
    public Map<String, Object> logout() {
        return ApiResponse.message("Logged out successfully");
    }

    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest req) {
        return ApiResponse.ok(auth.me((String) req.getAttribute(JwtAuthFilter.USER_ID_ATTR)));
    }
}
