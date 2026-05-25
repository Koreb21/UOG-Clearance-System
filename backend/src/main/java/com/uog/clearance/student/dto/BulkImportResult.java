package com.uog.clearance.student.dto;

import java.util.List;

public record BulkImportResult(
        int totalRows,
        int importedCount,
        int failedCount,
        List<String> errors
) {
}
