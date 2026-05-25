package com.uog.clearance;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

/**
 * Full-stack HTTP checks against a running app (requires MongoDB).
 * Student initial password equals student ID (see StudentAdminService).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ClearanceWorkflowIntegrationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @LocalServerPort
    private int port;

    @Test
    void adminCreatesStudent_studentCreatesRequest_andStatusReturnsChecks() throws Exception {
        String adminToken = login("admin", "admin@123");
        String campusJson = httpGet("/api/v1/campuses", adminToken);
        String campusId = extractFirstIdFromCampusList(campusJson);

        String studentId = "E2E-" + System.currentTimeMillis();
        String createBody = """
                {
                  "studentId": "%s",
                  "firstName": "E2E",
                  "lastName": "Student",
                  "campusId": "%s",
                  "academicYear": 4,
                  "graduationYear": 2026
                }
                """.formatted(studentId, campusId);

        HttpResponse<String> created = httpPost("/api/v1/admin/students", createBody, adminToken);
        assertEquals(200, created.statusCode(), created.body());
        assertTrue(created.body().contains(studentId));

        String studentToken = login(studentId, studentId);

        String requestBody = """
                {
                  "semester": "Semester I",
                  "academicYearLabel": "2026/2027",
                  "requestType": "FINAL"
                }
                """;

        HttpResponse<String> reqResponse =
                httpPost("/api/v1/students/me/clearance-requests", requestBody, studentToken);
        assertEquals(200, reqResponse.statusCode(), reqResponse.body());

        String requestId = objectMapper.readTree(reqResponse.body()).get("id").asText();

        HttpResponse<String> statusResponse =
                httpGetRaw("/api/v1/students/me/clearance-requests/" + requestId + "/status", studentToken);
        assertEquals(200, statusResponse.statusCode(), statusResponse.body());
        JsonNode status = objectMapper.readTree(statusResponse.body());
        assertTrue(status.has("checks"));
        assertTrue(status.get("checks").isArray());
        assertTrue(status.get("checks").size() > 0);
    }

    private String extractFirstIdFromCampusList(String json) throws IOException {
        JsonNode root = objectMapper.readTree(json);
        assertTrue(root.isArray() && root.size() > 0, "Expected seeded campuses");
        return root.get(0).get("id").asText();
    }

    private String login(String username, String password) throws Exception {
        HttpResponse<String> response = httpPost(
                "/api/v1/auth/login",
                """
                        {
                          "username": "%s",
                          "password": "%s"
                        }
                        """.formatted(username, password),
                null);
        assertEquals(200, response.statusCode(), response.body());
        return extractJsonValue(response.body(), "accessToken");
    }

    private HttpResponse<String> httpPost(String path, String json, String bearerToken) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri(path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json));
        if (bearerToken != null) {
            builder.header("Authorization", "Bearer " + bearerToken);
        }
        return HttpClient.newHttpClient().send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private String httpGet(String path, String bearerToken) throws Exception {
        HttpResponse<String> response = httpGetRaw(path, bearerToken);
        assertEquals(200, response.statusCode(), response.body());
        return response.body();
    }

    private HttpResponse<String> httpGetRaw(String path, String bearerToken) throws Exception {
        HttpRequest.Builder builder =
                HttpRequest.newBuilder(uri(path)).GET().header("Authorization", "Bearer " + bearerToken);
        return HttpClient.newHttpClient().send(builder.build(), HttpResponse.BodyHandlers.ofString());
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
