package com.swaminarayan.clinic.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "patients")
public class Patient {
    @Id @GeneratedValue @UuidGenerator
    @Column(length = 36)
    public String id;

    @Column(unique = true, length = 20)
    public String uhid;

    @Column(nullable = false, length = 150)
    public String patientName;
    @Column(length = 20)
    public String mobileNo;
    @Column(length = 20)
    public String alternativeMobileNo;
    @Column(length = 10)
    public String gender;
    public LocalDate dob;
    public Integer age;
    @Column(length = 150)
    public String email;
    @Column(length = 20)
    public String aadharNo;
    @Column(length = 20)
    public String panNo;
    public Double height;
    public Double weight;
    @Column(length = 10)
    public String bloodGroup;

    @ManyToOne
    @JoinColumn(name = "medical_alert_id")
    public MasterItem medicalAlert;

    @Column(length = 100)
    public String occupation;
    @Column(length = 150)
    public String referredBy;
    @Column(length = 1000)
    public String familyHistory;
    @Column(length = 500)
    public String address;
    @Column(length = 100)
    public String city;
    @Column(length = 10)
    public String pincode;
    @Column(length = 60)
    public String country;

    @ManyToOne
    @JoinColumn(name = "doctor_id")
    public Doctor doctor;

    public LocalDate registrationDate;
    @Column(length = 30)
    public String appointmentType;
    public LocalDateTime appointmentDateTime;
    @Column(length = 300)
    public String patientPhoto;

    @CreationTimestamp
    public LocalDateTime createdAt;
}
