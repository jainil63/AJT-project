package com.swaminarayan.clinic.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "treatments")
public class Treatment {
    @Id @GeneratedValue @UuidGenerator
    @Column(length = 36)
    public String id;

    @Column(name = "treatment_name", nullable = false, length = 200)
    public String text;

    @Column(precision = 12, scale = 2)
    public BigDecimal pricePerUnit;

    public Integer dayCount = 1;

    @CreationTimestamp
    public LocalDateTime createdAt;
}
