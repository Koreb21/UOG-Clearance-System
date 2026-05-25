package com.uog.clearance.inquiry.repository;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.inquiry.model.StatusInquiry;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StatusInquiryRepository extends MongoRepository<StatusInquiry, String> {

    List<StatusInquiry> findByStudentId(String studentId);

    List<StatusInquiry> findByCampusIdAndTargetCheckCode(String campusId, ClearanceCheckCode targetCheckCode);
}
