package com.swaminarayan.clinic.security;

import com.swaminarayan.clinic.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {
    private final SecretKey key;
    private final long accessMs;
    private final long refreshMs;

    public JwtUtil(@Value("${app.jwt.secret}") String secret,
                   @Value("${app.jwt.access-expiry-minutes}") long accessMinutes,
                   @Value("${app.jwt.refresh-expiry-days}") long refreshDays) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessMs = accessMinutes * 60_000L;
        this.refreshMs = refreshDays * 86_400_000L;
    }

    public String accessToken(User u) { return build(u, "access", accessMs); }

    public String refreshToken(User u) { return build(u, "refresh", refreshMs); }

    private String build(User u, String type, long ttlMs) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(u.id)
                .claim("name", u.fullName)
                .claim("type", type)
                .issuedAt(new Date(now))
                .expiration(new Date(now + ttlMs))
                .signWith(key)
                .compact();
    }

    /** @return claims, or null when the token is missing, expired, tampered with, or of the wrong type */
    public Claims parse(String token, String expectedType) {
        try {
            Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return expectedType.equals(c.get("type", String.class)) ? c : null;
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
