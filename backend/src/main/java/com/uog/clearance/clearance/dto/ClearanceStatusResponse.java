package com.uog.clearance.clearance.dto;

import com.uog.clearance.liability.dto.LiabilityResponse;
import com.uog.clearance.payment.dto.PaymentResponse;
import com.uog.clearance.qr.dto.QrCertificateResponse;
import com.uog.clearance.student.dto.StudentIdentityResponse;
import java.util.List;

public record ClearanceStatusResponse(
        ClearanceRequestResponse request,
        StudentIdentityResponse student,
        List<ClearanceCheckResponse> checks,
        List<LiabilityResponse> liabilities,
        List<PaymentResponse> payments,
        QrCertificateResponse certificate
) {
}
