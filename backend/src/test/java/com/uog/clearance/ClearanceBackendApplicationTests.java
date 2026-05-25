package com.uog.clearance;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ClearanceBackendApplicationTests {

    @LocalServerPort
    private int port;

    @Test
    void healthEndpointIsPublic() throws Exception {
        HttpResponse<String> response = httpClient().send(
                HttpRequest.newBuilder(uri("/api/v1/health"))
                        .GET()
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("\"status\":\"UP\""));
        assertTrue(response.body().contains("\"service\":\"clearance-backend\""));
    }

    @Test
    void bootstrapAdminCanLoginAndFetchCurrentUser() throws Exception {
        HttpResponse<String> loginResponse = httpClient().send(
                HttpRequest.newBuilder(uri("/api/v1/auth/login"))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString("""
                                {
                                  "username": "admin",
                                  "password": "admin@123"
                                }
                                """))
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        assertEquals(200, loginResponse.statusCode());
        assertTrue(loginResponse.body().contains("\"role\":\"SYSTEM_ADMIN\""));
        String token = extractJsonValue(loginResponse.body(), "accessToken");

        HttpResponse<String> meResponse = httpClient().send(
                HttpRequest.newBuilder(uri("/api/v1/auth/me"))
                        .header("Authorization", "Bearer " + token)
                        .GET()
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        assertEquals(200, meResponse.statusCode());
        assertTrue(meResponse.body().contains("\"username\":\"admin\""));
        assertTrue(meResponse.body().contains("\"role\":\"SYSTEM_ADMIN\""));
    }

    private HttpClient httpClient() {
        return HttpClient.newHttpClient();
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private String extractJsonValue(String json, String field) {
        String marker = "\"" + field + "\":\"";
        int start = json.indexOf(marker);
        if (start < 0) {
            throw new IllegalStateException("Field not found in JSON response: " + field);
        }
        start += marker.length();
        int end = json.indexOf('"', start);
        if (end < 0) {
            throw new IllegalStateException("Field value not terminated in JSON response: " + field);
        }
        return json.substring(start, end);
    }
}
