package com.swaminarayan.clinic.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "master_items", uniqueConstraints = @UniqueConstraint(columnNames = {"master_type", "item_text"}))
public class MasterItem {
    @Id @GeneratedValue @UuidGenerator
    @Column(length = 36)
    public String id;

    @Enumerated(EnumType.STRING)
    @Column(name = "master_type", nullable = false, length = 30)
    public MasterType type;

    @Column(name = "item_text", nullable = false, length = 150)
    public String text;

    @CreationTimestamp
    public LocalDateTime createdAt;
}
