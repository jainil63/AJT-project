package com.swaminarayan.clinic.repository;

import com.swaminarayan.clinic.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface PatientRepository extends JpaRepository<Patient, String>, JpaSpecificationExecutor<Patient> {
    List<Patient> findByMobileNo(String mobileNo);
    boolean existsByMobileNo(String mobileNo);
    long countByRegistrationDateBetween(LocalDate from, LocalDate to);
    List<Patient> findByRegistrationDateBetween(LocalDate from, LocalDate to);

    @Query("select max(p.uhid) from Patient p")
    String findMaxUhid();
}
