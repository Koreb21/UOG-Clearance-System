package com.uog.clearance.campus.repository;

import com.uog.clearance.campus.model.Campus;
import com.uog.clearance.campus.model.CampusCode;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CampusRepository extends MongoRepository<Campus, String> {

    Optional<Campus> findByCode(CampusCode code);
}
