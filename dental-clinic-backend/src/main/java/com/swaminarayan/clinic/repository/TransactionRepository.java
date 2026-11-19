package com.swaminarayan.clinic.repository;

import com.swaminarayan.clinic.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;

public interface TransactionRepository extends JpaRepository<PaymentTransaction, String>,
        JpaSpecificationExecutor<PaymentTransaction> {
    List<PaymentTransaction> findByPatientIdOrderByPaymentDateTimeDesc(String patientId);
    List<PaymentTransaction> findByPatientIdAndPaymentDateTimeBetween(String patientId, LocalDateTime from, LocalDateTime to);
    List<PaymentTransaction> findByPaymentDateTimeBetween(LocalDateTime from, LocalDateTime to);
    void deleteByPatientId(String patientId);
}
