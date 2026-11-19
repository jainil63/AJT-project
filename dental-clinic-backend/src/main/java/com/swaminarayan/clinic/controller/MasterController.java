package com.swaminarayan.clinic.controller;

import com.swaminarayan.clinic.dto.ApiResponse;
import com.swaminarayan.clinic.entity.MasterType;
import com.swaminarayan.clinic.service.MasterService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * One controller for all simple master lists. The URL's first segment selects the list, e.g.
 * /specialty/getSpecialty, /paymentBy/addPaymentBy, /opdStatus/deleteOPDStatus/{id}.
 */
@RestController
public class MasterController {
    private static final Map<String, MasterType> BASES = Map.of(
            "specialty", MasterType.SPECIALTY,
            "designation", MasterType.DESIGNATION,
            "medicalAlert", MasterType.MEDICAL_ALERT,
            "opdStatus", MasterType.OPD_STATUS,
            "paymentBy", MasterType.PAYMENT_BY,
            "consultantCharge", MasterType.CONSULTANT_CHARGE,
            "documentType", MasterType.DOCUMENT_TYPE);

    private final MasterService service;

    public MasterController(MasterService service) {
        this.service = service;
    }

    private MasterType type(HttpServletRequest req) {
        String path = req.getRequestURI().substring(req.getContextPath().length());
        return BASES.get(path.split("/")[1]);
    }

    @GetMapping({"/specialty/getSpecialty", "/designation/getDesignation", "/medicalAlert/getMedicalAlert",
            "/opdStatus/getOPDStatus", "/paymentBy/getPaymentBy", "/consultantCharge/getConsultantCharge",
            "/documentType/getDocumentType"})
    public Map<String, Object> list(HttpServletRequest req) {
        return ApiResponse.ok(service.list(type(req)));
    }

    @PostMapping({"/specialty/addSpecialty", "/designation/addDesignation", "/medicalAlert/addMedicalAlert",
            "/opdStatus/addOPDStatus", "/paymentBy/addPaymentBy", "/consultantCharge/addConsultantCharge",
            "/documentType/addDocumentType"})
    public Map<String, Object> add(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        return ApiResponse.ok("Added successfully", service.add(type(req), body));
    }

    @PutMapping({"/specialty/updateSpecialty/{id}", "/designation/updateDesignation/{id}",
            "/medicalAlert/updateMedicalAlert/{id}", "/opdStatus/updateOPDStatus/{id}",
            "/paymentBy/updatePaymentBy/{id}", "/consultantCharge/updateConsultantCharge/{id}",
            "/documentType/updateDocumentType/{id}"})
    public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest req) {
        return ApiResponse.ok("Updated successfully", service.update(type(req), id, body));
    }

    @DeleteMapping({"/specialty/deleteSpecialty/{id}", "/designation/deleteDesignation/{id}",
            "/medicalAlert/deleteMedicalAlert/{id}", "/opdStatus/deleteOPDStatus/{id}",
            "/paymentBy/deletePaymentBy/{id}", "/consultantCharge/deleteConsultantCharge/{id}",
            "/documentType/deleteDocumentType/{id}"})
    public Map<String, Object> delete(@PathVariable String id, HttpServletRequest req) {
        service.delete(type(req), id);
        return ApiResponse.message("Deleted successfully");
    }
}
