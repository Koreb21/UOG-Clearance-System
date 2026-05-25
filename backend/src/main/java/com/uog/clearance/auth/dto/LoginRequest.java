package com.uog.clearance.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank String username,
        @NotBlank String password,
        /** When set (e.g. campus portal), must match the user's campus code (TEWODROS, MARAKI, FASIL). */
        String expectedCampusId
) {
}
