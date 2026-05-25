package com.uog.clearance.security.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * Returns 401 JSON for unauthenticated API access. Spring Security 6+ otherwise
 * responds with 403 for missing authentication on secured endpoints, which breaks
 * the SPA login flow (POST /login succeeds, GET /auth/me appears as "Forbidden").
 */
@Component
public class JsonUnauthorizedEntryPoint implements AuthenticationEntryPoint {

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        String message = authException != null && authException.getMessage() != null
                ? authException.getMessage()
                : "Authentication required";

        objectMapper.writeValue(response.getWriter(), Map.of(
                "timestamp", Instant.now().toString(),
                "error", "UNAUTHORIZED",
                "message", message));
    }
}
