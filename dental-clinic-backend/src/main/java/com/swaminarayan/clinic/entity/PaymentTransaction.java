package com.swaminarayan.clinic.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Money movement. Credit = payment received from patient, Debit = amount charged / refunded.
 * Patient balance (outstanding) = total Debit - total Credit.
 */
@Entity
@Table(name = "transactions")
public class PaymentTransaction {
    @Id @GeneratedValue @UuidGenerator
    @Column(length = 36)
    public String id;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    public Patient patient;

    @ManyToOne
    @JoinColumn(name = "payment_by_id")
    public MasterItem paymentBy;

    /** Credit | Debit */
    @Column(nullable = false, length = 10)
    public String paymentType;

    /** PaymentReceived | Refund | SurgeonCharges (optional label) */
    @Column(length = 30)
    public String paymentCategory;

    @Column(nullable = false, precision = 12, scale = 2)
    public BigDecimal amount;

    @Column(nullable = false)
    public LocalDateTime paymentDateTime;

    @Column(length = 500)
    public String remark;

    @CreationTimestamp
    public LocalDateTime createdAt;
}
