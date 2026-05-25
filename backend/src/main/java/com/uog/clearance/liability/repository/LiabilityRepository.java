package com.uog.clearance.liability.repository;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.liability.model.Liability;
import com.uog.clearance.liability.model.LiabilityStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LiabilityRepository extends JpaRepository<Liability, String> {

    List<Liability> findByClearanceRequestId(String clearanceRequestId);

    List<Liability> findByStudentId(String studentId);

    List<Liability> findByClearanceRequestIdAndDepartmentCheckCode(String clearanceRequestId, ClearanceCheckCode departmentCheckCode);

    List<Liability> findByStudentIdAndDepartmentCheckCode(String studentId, ClearanceCheckCode departmentCheckCode);

    long countByClearanceRequestIdAndDepartmentCheckCodeAndStatusIn(String clearanceRequestId,
                                                                    ClearanceCheckCode departmentCheckCode,
                                                                    List<LiabilityStatus> statuses);
}
