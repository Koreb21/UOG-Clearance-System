package com.uog.clearance.clearance.repository;

import com.uog.clearance.clearance.model.ClearanceCheck;
import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.clearance.model.ClearanceCheckStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ClearanceCheckRepository extends MongoRepository<ClearanceCheck, String> {

    List<ClearanceCheck> findByClearanceRequestId(String clearanceRequestId);

    Optional<ClearanceCheck> findByClearanceRequestIdAndCheckCode(String clearanceRequestId, ClearanceCheckCode checkCode);

    List<ClearanceCheck> findByCampusIdAndCheckCodeAndStatusNot(String campusId,
                                                                ClearanceCheckCode checkCode,
                                                                ClearanceCheckStatus status);

    List<ClearanceCheck> findByCampusId(String campusId);

    List<ClearanceCheck> findByCampusIdAndCheckCode(String campusId, ClearanceCheckCode checkCode);

    List<ClearanceCheck> findByCampusIdAndStatus(String campusId, ClearanceCheckStatus status);

    List<ClearanceCheck> findByCampusIdAndStatusIn(String campusId, List<ClearanceCheckStatus> statuses);
}
