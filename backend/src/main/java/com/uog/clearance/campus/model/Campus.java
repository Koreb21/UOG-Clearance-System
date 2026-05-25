package com.uog.clearance.campus.model;

import com.uog.clearance.common.model.BaseDocument;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "campuses")
public class Campus extends BaseDocument {

    @Enumerated(EnumType.STRING)
    @Column(name = "code", unique = true)
    private CampusCode code;

    @Column(name = "name")
    private String name;

    @Column(name = "is_active")
    private boolean active = true;
}
