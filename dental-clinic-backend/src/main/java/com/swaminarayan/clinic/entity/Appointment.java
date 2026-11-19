package com.swaminarayan.clinic.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
public class Appointment {
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
    @JoinColumn(name = "treatment_id")
    public Treatment treatment;

    @Column(nullable = false)
    public LocalDate appointmentDate;

    /** "HH:mm" (24h) as sent by the frontend. */
    @Column(nullable = false, length = 10)
    public String appointmentTime;

    public Integer duration = 15;

    @Column(length = 1000)
    public String note;

    /** pending | visit | no-visit */
    @Column(nullable = false, length = 20)
    public String status = "pending";

    @CreationTimestamp
    public LocalDateTime createdAt;
}
