package com.uog.clearance.campus.service;

import com.uog.clearance.campus.model.Campus;
import com.uog.clearance.campus.model.CampusCode;
import com.uog.clearance.campus.repository.CampusRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CampusIdNormalizerTest {

    @Mock
    private CampusRepository campusRepository;

    private CampusIdNormalizer normalizer;

    @BeforeEach
    void setUp() {
        normalizer = new CampusIdNormalizer(campusRepository);
    }

    @Test
    void normalizeToCode_shouldAcceptLowercaseCampusCode() {
        String normalized = normalizer.normalizeToCode("tewodros");

        assertThat(normalized).isEqualTo("TEWODROS");
    }

    @Test
    void normalizeToCode_shouldAcceptUppercaseCampusCode() {
        String normalized = normalizer.normalizeToCode("MARAKI");

        assertThat(normalized).isEqualTo("MARAKI");
    }

    @Test
    void normalizeToCode_shouldReturnCampusCodeWhenIdMatchesDocumentId() {
        Campus campus = new Campus();
        campus.setCode(CampusCode.FASIL);
        when(campusRepository.findById("campus-id-fasil")).thenReturn(Optional.of(campus));

        String normalized = normalizer.normalizeToCode("campus-id-fasil");

        assertThat(normalized).isEqualTo("FASIL");
    }

    @Test
    void normalizeToCode_shouldReturnNullForUnknownValue() {
        when(campusRepository.findById("unknown")).thenReturn(Optional.empty());

        String normalized = normalizer.normalizeToCode("unknown");

        assertThat(normalized).isNull();
    }
}
