package com.uog.clearance.qr.repository;

import com.uog.clearance.qr.model.QrCertificate;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface QrCertificateRepository extends MongoRepository<QrCertificate, String> {

    Optional<QrCertificate> findByClearanceRequestId(String clearanceRequestId);

    Optional<QrCertificate> findByHash(String hash);
}
