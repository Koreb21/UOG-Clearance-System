package com.uog.clearance.campus.dto;

import com.uog.clearance.campus.model.CampusCode;

public record CampusResponse(
        String id,
        CampusCode code,
        String name,
        boolean active
) {
}
