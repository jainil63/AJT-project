package com.swaminarayan.clinic.controller;

import com.swaminarayan.clinic.dto.ApiResponse;
import com.swaminarayan.clinic.dto.Views;
import com.swaminarayan.clinic.service.PatientService;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/patient")
public class PatientController {
    private final PatientService service;

    public PatientController(PatientService service) {
        this.service = service;
    }

    @GetMapping("/getPatient")
    public Map<String, Object> list(@RequestParam(required = false) String search,
                                    @RequestParam(required = false) String genders,
                                    @RequestParam(required = false) String fromDate,
                                    @RequestParam(required = false) String toDate,
                                    @RequestParam(defaultValue = "1") String page,
                                    @RequestParam(defaultValue = "10") String limit) {
        return service.list(search, genders, fromDate, toDate, page, limit);
    }

    @GetMapping("/detail/{id}")
    public Map<String, Object> detail(@PathVariable String id) {
        return ApiResponse.ok(service.detail(id));
    }

    /** The React form posts multipart/form-data; "paymentCategories" may repeat. */
    @PostMapping("/addPatient")
    public Map<String, Object> add(@RequestParam MultiValueMap<String, String> params) {
        List<String> categories = params.get("paymentCategories");
        return ApiResponse.ok("Patient registered successfully", Views.patient(service.create(params.toSingleValueMap(), categories)));
    }

    @PutMapping("/updatePatient/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestParam MultiValueMap<String, String> params) {
        List<String> categories = params.get("paymentCategories");
        return ApiResponse.ok("Patient updated successfully", Views.patient(service.update(id, params.toSingleValueMap(), categories)));
    }

    @DeleteMapping("/deletePatient/{id}")
    public Map<String, Object> delete(@PathVariable String id) {
        service.delete(id);
        return ApiResponse.message("Patient deleted successfully");
    }

    @PostMapping("/bulkAddPatients")
    public Map<String, Object> bulkAdd(@RequestBody Map<String, Object> body) {
        return service.bulkCreate(body);
    }
}
