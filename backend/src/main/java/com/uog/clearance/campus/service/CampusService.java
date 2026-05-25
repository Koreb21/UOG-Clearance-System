package com.uog.clearance.campus.service;

import com.uog.clearance.campus.dto.CampusResponse;
import com.uog.clearance.campus.repository.CampusRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CampusService {

    private final CampusRepository campusRepository;

    public List<CampusResponse> listCampuses() {
        return campusRepository.findAll()
                .stream()
                .map(campus -> new CampusResponse(
                        campus.getId(),
                        campus.getCode(),
                        campus.getName(),
                        campus.isActive()))
                .toList();
    }
}
