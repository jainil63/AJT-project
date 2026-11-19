package com.swaminarayan.clinic.controller;

import com.swaminarayan.clinic.dto.ApiResponse;
import com.swaminarayan.clinic.service.OpdService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/opdMaster")
public class OpdController {
    private final OpdService service;

    public OpdController(OpdService service) {
        this.service = service;
    }

    @GetMapping("/getOPDMaster")
    public Map<String, Object> list(@RequestParam(required = false) String search,
                                    @RequestParam(required = false) String doctorIds,
                                    @RequestParam(required = false) String statusIds,
                                    @RequestParam(required = false) String paymentTypeIds,
                                    @RequestParam(required = false) String fromDate,
                                    @RequestParam(required = false) String toDate,
                                    @RequestParam(defaultValue = "1") String page,
                                    @RequestParam(defaultValue = "10") String limit) {
        return service.list(search, doctorIds, statusIds, paymentTypeIds, fromDate, toDate, page, limit);
    }

    @PostMapping("/addOPDMaster")
    public Map<String, Object> add(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok("Visit entry added successfully", service.create(body));
    }

    @PutMapping("/updateOPDMaster/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok("Visit entry updated successfully", service.update(id, body));
    }

    @DeleteMapping("/deleteOPDMaster/{id}")
    public Map<String, Object> delete(@PathVariable String id) {
        service.delete(id);
        return ApiResponse.message("Visit entry deleted successfully");
    }
}
