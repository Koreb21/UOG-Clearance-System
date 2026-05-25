package com.uog.clearance.campus.repository;

import com.uog.clearance.campus.model.Campus;
import com.uog.clearance.campus.model.CampusCode;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CampusRepository extends JpaRepository<Campus, String> {

    Optional<Campus> findByCode(CampusCode code);
}
