package com.uog.clearance.payment.dto;

public record ChapaInitiationResponse(
        PaymentResponse payment,
        String checkoutUrl,
        String callbackUrl,
        String returnUrl
) {
}
