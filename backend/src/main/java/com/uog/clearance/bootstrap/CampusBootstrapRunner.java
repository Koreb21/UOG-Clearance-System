package com.uog.clearance.bootstrap;

import com.uog.clearance.campus.model.Campus;
import com.uog.clearance.campus.model.CampusCode;
import com.uog.clearance.campus.repository.CampusRepository;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class CampusBootstrapRunner implements CommandLineRunner {

    private final CampusRepository campusRepository;

    @Override
    public void run(String... args) {
        Map<CampusCode, String> campuses = Map.of(
                CampusCode.TEWODROS, "Atse Tewodros",
                CampusCode.MARAKI, "Maraki",
                CampusCode.FASIL, "Atse Fasil");

        campuses.forEach((code, name) -> {
            if (campusRepository.findByCode(code).isEmpty()) {
                Campus campus = new Campus();
                campus.setCode(code);
                campus.setName(name);
                campus.setActive(true);
                campusRepository.save(campus);
                log.info("Seeded campus {}", name);
            }
        });
    }
}
