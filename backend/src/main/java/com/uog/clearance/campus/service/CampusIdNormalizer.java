package com.uog.clearance.campus.service;

import com.uog.clearance.campus.model.CampusCode;
import com.uog.clearance.campus.repository.CampusRepository;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CampusIdNormalizer {

    private final CampusRepository campusRepository;

    /**
     * Returns canonical campus code string (e.g. TEWODROS), or null if unknown.
     * Accepts either a {@link CampusCode} name or a campus document id.
     */
    public String normalizeToCode(String rawCampusId) {
        if (rawCampusId == null || rawCampusId.isBlank()) {
            return null;
        }
        String normalized = rawCampusId.trim();
        return campusRepository.findById(normalized)
                .map(c -> c.getCode().name())
                .orElseGet(() -> {
                    try {
                        return CampusCode.valueOf(normalized.toUpperCase(Locale.ROOT)).name();
                    } catch (IllegalArgumentException ex) {
                        return null;
                    }
                });
    }
}
