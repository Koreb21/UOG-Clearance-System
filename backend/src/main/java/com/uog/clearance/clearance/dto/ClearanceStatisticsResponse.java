package com.uog.clearance.clearance.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.uog.clearance.clearance.model.ClearanceCheckCode;

public record ClearanceStatisticsResponse(
        @JsonProperty("total_requests")
        long totalRequests,

        @JsonProperty("cleared_requests")
        long clearedRequests,

        @JsonProperty("clearance_percentage")
        double clearancePercentage,

        @JsonProperty("most_common_bottleneck")
        ClearanceCheckCode mostCommonBottleneck,

        @JsonProperty("bottleneck_count")
        int bottleneckCount,

        @JsonProperty("pending_count")
        int pendingCount,

        @JsonProperty("in_review_count")
        int inReviewCount,

        @JsonProperty("flagged_count")
        int flaggedCount
) {}
