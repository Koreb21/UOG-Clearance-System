package com.uog.clearance.payment.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.chapa")
public class ChapaProperties {

    private String publicKey;

    private String secretKey;

    private String callbackToken;

    private String webhookSecret;

    private String financeReceiptSecret;

    private String callbackUrl;

    private String returnUrl;

    private String checkoutBaseUrl;

    private String initializeUrl = "https://api.chapa.co/v1/transaction/initialize";

    private String verifyUrl = "https://api.chapa.co/v1/transaction/verify";
}
