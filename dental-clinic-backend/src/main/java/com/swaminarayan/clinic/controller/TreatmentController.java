package com.swaminarayan.clinic.controller;

import com.swaminarayan.clinic.dto.ApiResponse;
import com.swaminarayan.clinic.service.TreatmentService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/treatment")
public class TreatmentController {
    private final TreatmentService service;

    public TreatmentController(TreatmentService service) {
        this.service = service;
    }

    @GetMapping("/getTreatment")
    public Map<String, Object> list() {
        return ApiResponse.ok(service.list());
    }

    @PostMapping("/addTreatment")
    public Map<String, Object> add(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok("Treatment added successfully", service.create(body));
    }

    @PutMapping("/updateTreatment/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok("Treatment updated successfully", service.update(id, body));
    }

    @DeleteMapping("/deleteTreatment/{id}")
    public Map<String, Object> delete(@PathVariable String id) {
        service.delete(id);
        return ApiResponse.message("Treatment deleted successfully");
    }

    @PostMapping("/bulkAddTreatments")
    public Map<String, Object> bulkAdd(@RequestBody Map<String, Object> body) {
        return service.bulkCreate(body);
    }
}
