package com.swaminarayan.clinic.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;

/** Requires "Authorization: Bearer <accessToken>" on every endpoint except login/refresh. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class JwtAuthFilter extends OncePerRequestFilter {
    public static final String USER_ID_ATTR = "authUserId";
    private static final Set<String> PUBLIC_PATHS = Set.of("/auth/login", "/auth/refresh", "/health");

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    private String path(HttpServletRequest req) {
        String uri = req.getRequestURI();
        String ctx = req.getContextPath();
        return ctx != null && !ctx.isEmpty() && uri.startsWith(ctx) ? uri.substring(ctx.length()) : uri;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        return "OPTIONS".equalsIgnoreCase(req.getMethod()) || PUBLIC_PATHS.contains(path(req));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String token = null;
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            token = header.substring(7).trim();
        } else if (path(req).equals("/file/view")) {
            // <img>/<a> tags cannot send headers; the frontend's fileUrl() appends ?token=
            token = req.getParameter("token");
        }

        Claims claims = token == null || token.isBlank() ? null : jwtUtil.parse(token, "access");
        if (claims == null) {
            res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            res.setContentType("application/json;charset=UTF-8");
            res.getOutputStream().write(
                    "{\"success\":false,\"message\":\"Authentication required or session expired\"}"
                            .getBytes(StandardCharsets.UTF_8));
            return;
        }
        req.setAttribute(USER_ID_ATTR, claims.getSubject());
        chain.doFilter(req, res);
    }
}
