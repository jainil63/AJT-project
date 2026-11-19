package com.swaminarayan.clinic.controller;

import com.swaminarayan.clinic.dto.ApiResponse;
import com.swaminarayan.clinic.service.AppointmentService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/appointment")
public class AppointmentController {
    private final AppointmentService service;

    public AppointmentController(AppointmentService service) {
        this.service = service;
    }

    @GetMapping("/getAppointments")
    public Map<String, Object> list() {
        return ApiResponse.ok(service.list());
    }

    @PostMapping("/addAppointment")
    public Map<String, Object> add(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok("Appointment booked successfully", service.create(body));
    }

    @PutMapping("/updateAppointment/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok("Appointment updated successfully", service.update(id, body));
    }

    @DeleteMapping("/deleteAppointment/{id}")
    public Map<String, Object> delete(@PathVariable String id) {
        service.delete(id);
        return ApiResponse.message("Appointment cancelled successfully");
    }
}
