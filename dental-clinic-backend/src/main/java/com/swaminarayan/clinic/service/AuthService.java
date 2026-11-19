package com.swaminarayan.clinic.service;

import com.swaminarayan.clinic.dto.Views;
import com.swaminarayan.clinic.entity.User;
import com.swaminarayan.clinic.exception.ApiException;
import com.swaminarayan.clinic.repository.UserRepository;
import com.swaminarayan.clinic.security.JwtUtil;
import io.jsonwebtoken.Claims;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtUtil jwt;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtUtil jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    /** Response shape required by Login.jsx: { data: user, tokens: { accessToken, refreshToken } } */
    public Map<String, Object> login(String identifier, String password) {
        String id = identifier.trim();
        User u = users.findFirstByUsernameIgnoreCaseOrEmailIgnoreCaseOrEmployeeCodeIgnoreCaseOrMobileNumber(id, id, id, id)
                .orElseThrow(() -> ApiException.unauthorized("Invalid login ID or password"));
        if (!encoder.matches(password, u.passwordHash)) {
            throw ApiException.unauthorized("Invalid login ID or password");
        }
        if (u.disabled) {
            throw new ApiException(org.springframework.http.HttpStatus.FORBIDDEN, "This account is disabled");
        }
        return session(u, "Login successful");
    }

    public Map<String, Object> refresh(String refreshToken) {
        Claims c = jwt.parse(refreshToken, "refresh");
        if (c == null) throw ApiException.unauthorized("Invalid or expired refresh token");
        User u = users.findById(c.getSubject()).orElseThrow(() -> ApiException.unauthorized("User no longer exists"));
        if (u.disabled) throw ApiException.unauthorized("This account is disabled");
        return session(u, "Token refreshed");
    }

    public Map<String, Object> me(String userId) {
        User u = users.findById(userId).orElseThrow(() -> ApiException.unauthorized("User no longer exists"));
        return Views.user(u);
    }

    private Map<String, Object> session(User u, String message) {
        Map<String, Object> tokens = new LinkedHashMap<>();
        tokens.put("accessToken", jwt.accessToken(u));
        tokens.put("refreshToken", jwt.refreshToken(u));
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("success", true);
        r.put("message", message);
        r.put("data", Views.user(u));
        r.put("tokens", tokens);
        return r;
    }
}
