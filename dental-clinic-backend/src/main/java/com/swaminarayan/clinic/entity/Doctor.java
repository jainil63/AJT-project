package com.swaminarayan.clinic.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "doctors")
public class Doctor {
    @Id @GeneratedValue @UuidGenerator
    @Column(length = 36)
    public String id;

    @Column(nullable = false, length = 150)
    public String name;
    @Column(length = 10)
    public String gender;
    @Column(length = 20)
    public String mobileNo;
    @Column(length = 20)
    public String alternativeMobileNo;
    @Column(length = 30)
    public String doctorType;
    public boolean accessPrescription;
    public boolean accessBilling;
    public boolean accessPatients;
    public boolean accessAppointments;
    @Column(length = 150)
    public String email;
    @Column(length = 1000)
    public String description;
    @Column(length = 500)
    public String googleProfileUrl;
    @Column(length = 20)
    public String colorCode;

    @ManyToOne
    @JoinColumn(name = "specialty_id")
    public MasterItem specialty;

    /** Stored upload key (see FileController) of the authorised-signatory image. */
    @Column(length = 300)
    public String authorisedSignatory;

    /** BCrypt hash; never returned by the API. */
    @Column(length = 100)
    public String passwordHash;

    @CreationTimestamp
    public LocalDateTime createdAt;
}
