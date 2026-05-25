package com.uog.clearance.payment.repository;

import com.uog.clearance.payment.model.PaymentRecord;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, String> {

    Optional<PaymentRecord> findByTxRef(String txRef);

    List<PaymentRecord> findByClearanceRequestId(String clearanceRequestId);
}
