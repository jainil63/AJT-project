package com.swaminarayan.clinic.repository;

import com.swaminarayan.clinic.entity.Opd;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface OpdRepository extends JpaRepository<Opd, String>, JpaSpecificationExecutor<Opd> {
    List<Opd> findByPatientIdOrderByDateDesc(String patientId);
    List<Opd> findByDateBetween(LocalDate from, LocalDate to);
    Optional<Opd> findFirstByPatientIdAndDateOrderByCreatedAtDesc(String patientId, LocalDate date);
    void deleteByPatientId(String patientId);
}
