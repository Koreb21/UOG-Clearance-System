package com.uog.clearance.payment.controller;

import com.uog.clearance.payment.dto.ChapaCallbackRequest;
import com.uog.clearance.payment.dto.ChapaInitiationResponse;
import com.uog.clearance.payment.dto.InitiateChapaPaymentRequest;
import com.uog.clearance.payment.dto.ManualPaymentRequest;
import com.uog.clearance.payment.dto.PaymentResponse;
import com.uog.clearance.payment.dto.PaymentVerificationRequest;
import com.uog.clearance.payment.service.PaymentService;
import com.uog.clearance.security.model.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestHeader;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/payments/chapa/initiate")
    @PreAuthorize("hasAnyRole('STUDENT','FINANCE_OFFICER','SYSTEM_ADMIN')")
    public ChapaInitiationResponse initiateChapa(@AuthenticationPrincipal UserPrincipal principal,
                                                 @Valid @RequestBody InitiateChapaPaymentRequest request) {
        return paymentService.initiateChapaPayment(principal, request);
    }

    @PostMapping("/payments/chapa/callback")
    public PaymentResponse chapaCallback(@RequestHeader(value = "X-Chapa-Callback-Token", required = false) String callbackToken,
                                         @Valid @RequestBody ChapaCallbackRequest request) {
        return paymentService.handleChapaCallback(request, callbackToken);
    }

    @PostMapping(value = "/payments/chapa/webhook", consumes = "application/json")
    public PaymentResponse chapaWebhook(@RequestHeader(value = "Chapa-Signature", required = false) String chapaSignature,
                                        @RequestHeader(value = "x-chapa-signature", required = false) String xChapaSignature,
                                        @RequestBody String rawBody) {
        return paymentService.handleChapaWebhook(rawBody, chapaSignature, xChapaSignature);
    }

    @GetMapping("/payments/chapa/callback")
    public PaymentResponse chapaRedirectCallback(@RequestParam(name = "tx_ref", required = false) String txRef,
                                                 @RequestParam(name = "trx_ref", required = false) String trxRef,
                                                 @RequestParam(name = "ref_id", required = false) String refId,
                                                 @RequestParam(name = "status", required = false) String status) {
        String resolvedTxRef = txRef != null ? txRef : trxRef;
        return paymentService.handleChapaRedirectCallback(resolvedTxRef, refId, status);
    }

    @PatchMapping("/payments/chapa/verify/{txRef}")
    @PreAuthorize("hasAnyRole('FINANCE_OFFICER','SYSTEM_ADMIN')")
    public PaymentResponse verifyChapa(@AuthenticationPrincipal UserPrincipal principal,
                                       @PathVariable String txRef,
                                       @Valid @RequestBody PaymentVerificationRequest request) {
        return paymentService.verifyPayment(principal, txRef, request);
    }

    @PostMapping("/finance/payments/manual")
    @PreAuthorize("hasAnyRole('FINANCE_OFFICER','SYSTEM_ADMIN')")
    public PaymentResponse recordManualPayment(@AuthenticationPrincipal UserPrincipal principal,
                                               @Valid @RequestBody ManualPaymentRequest request) {
        return paymentService.recordManualPayment(principal, request);
    }

    @GetMapping("/finance/payments")
    @PreAuthorize("hasAnyRole('FINANCE_OFFICER','SYSTEM_ADMIN')")
    public List<PaymentResponse> listPayments(@AuthenticationPrincipal UserPrincipal principal,
                                              @RequestParam String clearanceRequestId) {
        return paymentService.listPayments(principal, clearanceRequestId);
    }

    @GetMapping("/finance/payments/history")
    @PreAuthorize("hasAnyRole('FINANCE_OFFICER','SYSTEM_ADMIN')")
    public List<PaymentResponse> listPaymentHistory(@AuthenticationPrincipal UserPrincipal principal,
                                                     @RequestParam(required = false) String campusId) {
        return paymentService.listPaymentHistory(principal, campusId);
    }

    @PostMapping("/finance/payments/record")
    @PreAuthorize("hasAnyRole('FINANCE_OFFICER','SYSTEM_ADMIN')")
    public PaymentResponse recordStandalonePayment(@AuthenticationPrincipal UserPrincipal principal,
                                                    @Valid @RequestBody com.uog.clearance.payment.dto.StandalonePaymentRequest request) {
        return paymentService.recordStandalonePayment(principal, request);
    }

    @GetMapping("/finance/payments/lookup")
    @PreAuthorize("hasAnyRole('FINANCE_OFFICER','SYSTEM_ADMIN')")
    public java.util.Map<String, Object> lookupPaymentByRef(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String ref) {
        return paymentService.lookupPaymentByRef(principal, ref);
    }
}
