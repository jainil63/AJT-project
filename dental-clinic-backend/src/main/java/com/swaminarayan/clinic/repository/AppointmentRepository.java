package com.swaminarayan.clinic.repository;

import com.swaminarayan.clinic.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, String> {
    List<Appointment> findAllByOrderByAppointmentDateDescAppointmentTimeDesc();
    List<Appointment> findByPatientId(String patientId);
    List<Appointment> findByDoctorIdAndAppointmentDate(String doctorId, LocalDate date);
    List<Appointment> findByAppointmentDateBetweenOrderByAppointmentDateAscAppointmentTimeAsc(LocalDate from, LocalDate to);
    void deleteByPatientId(String patientId);
}
