package com.swaminarayan.clinic.repository;

import com.swaminarayan.clinic.entity.Treatment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TreatmentRepository extends JpaRepository<Treatment, String> {
    List<Treatment> findAllByOrderByTextAsc();
    boolean existsByTextIgnoreCase(String text);
}
