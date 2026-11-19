package com.swaminarayan.clinic.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_users")
public class User {
    @Id @GeneratedValue @UuidGenerator
    @Column(length = 36)
    public String id;

    @Column(nullable = false, length = 150)
    public String fullName;

    @Column(unique = true, length = 60)
    public String username;

    @Column(unique = true, length = 150)
    public String email;

    @Column(length = 20)
    public String mobileNumber;

    @Column(length = 30)
    public String employeeCode;

    @Column(length = 100)
    public String designation;

    @Column(length = 30)
    public String userType = "Admin";

    public boolean superAdmin;
    public boolean disabled;

    @Column(nullable = false, length = 100)
    public String passwordHash;

    @CreationTimestamp
    public LocalDateTime createdAt;
}
