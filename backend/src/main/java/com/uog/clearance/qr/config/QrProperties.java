package com.uog.clearance.qr.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.qr")
public class QrProperties {

    private String signingSecret;
}
