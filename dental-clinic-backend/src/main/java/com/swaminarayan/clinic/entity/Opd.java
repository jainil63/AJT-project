package com.swaminarayan.clinic.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** A clinic visit (the frontend calls these "OPD" / "Visit"). */
@Entity
@Table(name = "opd_visits")
public class Opd {
    @Id @GeneratedValue @UuidGenerator
    @Column(length = 36)
    public String id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "patient_id")
    public Patient patient;

    @ManyToOne
    @JoinColumn(name = "doctor_id")
    public Doctor doctor;

    @ManyToOne
    @JoinColumn(name = "status_id")
    public MasterItem status;

    @ManyToOne
    @JoinColumn(name = "payment_by_id")
    public MasterItem paymentBy;

    @ManyToOne
    @JoinColumn(name = "treatment_id")
    public Treatment treatment;

    @Column(name = "visitDate", nullable = false)
    public LocalDate date;

    @Column(length = 1000)
    public String remark;
    @Column(length = 20)
    public String bloodPressure;
    @Column(length = 20)
    public String height;
    @Column(length = 20)
    public String weight;

    @CreationTimestamp
    public LocalDateTime createdAt;
}
