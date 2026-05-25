package com.uog.clearance.clearance.repository;

import com.uog.clearance.clearance.model.ClearanceRequest;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClearanceRequestRepository extends JpaRepository<ClearanceRequest, String> {

    List<ClearanceRequest> findByStudentId(String studentId);

    Optional<ClearanceRequest> findByRequestNumber(String requestNumber);

    List<ClearanceRequest> findByCampusId(String campusId);
}
