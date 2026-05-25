package com.uog.clearance.bootstrap.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.bootstrap.admin")
public class BootstrapAdminProperties {

    private boolean enabled;

    private String username;

    private String password;
}
