package com.swaminarayan.clinic.controller;

import com.swaminarayan.clinic.dto.ApiResponse;
import com.swaminarayan.clinic.entity.MasterType;
import com.swaminarayan.clinic.service.DoctorService;
import com.swaminarayan.clinic.service.MasterService;
import com.swaminarayan.clinic.service.TreatmentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/** Dropdown data for the patient-registration form, plus a public health check. */
@RestController
public class LookupController {
    private final MasterService masters;
    private final DoctorService doctors;
    private final TreatmentService treatments;

    public LookupController(MasterService masters, DoctorService doctors, TreatmentService treatments) {
        this.masters = masters;
        this.doctors = doctors;
        this.treatments = treatments;
    }

    @GetMapping("/form-dropdowns/patientRegistration")
    public Map<String, Object> patientRegistration() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("medicalAlerts", masters.list(MasterType.MEDICAL_ALERT));
        d.put("doctors", doctors.list());
        d.put("paymentMethods", masters.list(MasterType.PAYMENT_BY));
        d.put("treatments", treatments.list());
        return ApiResponse.ok(d);
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return ApiResponse.message("Dental clinic backend is running");
    }
}
