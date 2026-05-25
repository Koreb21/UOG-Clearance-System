package com.uog.clearance.campus.controller;

import com.uog.clearance.campus.dto.CampusResponse;
import com.uog.clearance.campus.service.CampusService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/campuses")
@RequiredArgsConstructor
public class CampusController {

    private final CampusService campusService;

    @GetMapping
    public List<CampusResponse> listCampuses() {
        return campusService.listCampuses();
    }
}
