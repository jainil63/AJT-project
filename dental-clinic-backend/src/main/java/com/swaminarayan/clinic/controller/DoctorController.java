package com.swaminarayan.clinic.controller;

import com.swaminarayan.clinic.dto.ApiResponse;
import com.swaminarayan.clinic.dto.Views;
import com.swaminarayan.clinic.service.DoctorService;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/doctor")
public class DoctorController {
    private final DoctorService service;

    public DoctorController(DoctorService service) {
        this.service = service;
    }

    @GetMapping("/getDoctors")
    public Map<String, Object> list() {
        return ApiResponse.ok(service.list());
    }

    /** The React form posts multipart/form-data (text fields + optional authorisedSignatory image). */
    @PostMapping("/addDoctor")
    public Map<String, Object> add(@RequestParam MultiValueMap<String, String> params,
                                   @RequestPart(value = "authorisedSignatory", required = false) MultipartFile signature) {
        return ApiResponse.ok("Doctor added successfully", Views.doctor(service.create(params.toSingleValueMap(), signature)));
    }

    @PutMapping("/updateDoctor/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestParam MultiValueMap<String, String> params,
                                      @RequestPart(value = "authorisedSignatory", required = false) MultipartFile signature) {
        return ApiResponse.ok("Doctor updated successfully", Views.doctor(service.update(id, params.toSingleValueMap(), signature)));
    }

    @DeleteMapping("/deleteDoctor/{id}")
    public Map<String, Object> delete(@PathVariable String id) {
        service.delete(id);
        return ApiResponse.message("Doctor deleted successfully");
    }
}
