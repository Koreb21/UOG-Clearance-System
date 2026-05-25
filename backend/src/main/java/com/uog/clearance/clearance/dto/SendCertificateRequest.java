package com.uog.clearance.clearance.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SendCertificateRequest(
        @JsonProperty("notification_message")
        String notificationMessage
) {}
