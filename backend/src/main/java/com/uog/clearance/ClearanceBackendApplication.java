package com.uog.clearance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uog.clearance.bootstrap.config.BootstrapAdminProperties;
import com.uog.clearance.payment.config.ChapaProperties;
import com.uog.clearance.qr.config.QrProperties;
import com.uog.clearance.security.config.JwtProperties;
import com.uog.clearance.student.config.StudentMediaProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
@EnableConfigurationProperties({ JwtProperties.class, BootstrapAdminProperties.class, ChapaProperties.class,
        QrProperties.class, StudentMediaProperties.class })
public class ClearanceBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(ClearanceBackendApplication.class, args);
    }
}
