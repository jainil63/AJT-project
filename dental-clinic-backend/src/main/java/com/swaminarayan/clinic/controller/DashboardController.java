package com.swaminarayan.clinic.controller;

import com.swaminarayan.clinic.dto.ApiResponse;
import com.swaminarayan.clinic.service.DashboardService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {
    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/stats")
    public Map<String, Object> stats(@RequestParam(required = false) String startDate,
                                     @RequestParam(required = false) String endDate) {
        return ApiResponse.ok(service.stats(startDate, endDate));
    }

    @GetMapping("/patient-visit-payment")
    public Map<String, Object> visitAndPayments(@RequestParam String patientId, @RequestParam String date) {
        return ApiResponse.ok(service.visitAndPayments(patientId, date));
    }

    @PutMapping("/patient-visit-payment")
    public Map<String, Object> updateVisitAndPayments(@RequestBody Map<String, Object> body) {
        service.updateVisitAndPayments(body);
        return ApiResponse.message("Visit and payment details updated successfully");
    }
}
