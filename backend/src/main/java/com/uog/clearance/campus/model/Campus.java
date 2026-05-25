package com.uog.clearance.campus.model;

import com.uog.clearance.common.model.BaseDocument;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "campuses")
public class Campus extends BaseDocument {

    @Indexed(unique = true)
    private CampusCode code;

    private String name;

    private boolean active = true;
}
