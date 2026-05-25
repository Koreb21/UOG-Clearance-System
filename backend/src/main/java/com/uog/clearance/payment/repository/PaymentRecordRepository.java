package com.uog.clearance.payment.repository;

import com.uog.clearance.payment.model.PaymentRecord;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, String> {

    Optional<PaymentRecord> findByTxRef(String txRef);

    Optional<PaymentRecord> findByProviderReference(String providerReference);

    Optional<PaymentRecord> findByReceiptNumber(String receiptNumber);

    List<PaymentRecord> findByClearanceRequestId(String clearanceRequestId);

    List<PaymentRecord> findByCampusIdOrderByVerifiedAtDesc(String campusId);

    List<PaymentRecord> findByCampusIdAndProviderOrderByVerifiedAtDesc(String campusId, com.uog.clearance.payment.model.PaymentProvider provider);
}
