package com.swaminarayan.clinic.controller;

import com.swaminarayan.clinic.dto.ApiResponse;
import com.swaminarayan.clinic.service.TransactionService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/transaction")
public class TransactionController {
    private final TransactionService service;

    public TransactionController(TransactionService service) {
        this.service = service;
    }

    @GetMapping("/getTransactions")
    public Map<String, Object> list(@RequestParam(required = false) String search,
                                    @RequestParam(required = false) String paymentByIds,
                                    @RequestParam(required = false) String paymentType,
                                    @RequestParam(required = false) String fromDate,
                                    @RequestParam(required = false) String toDate,
                                    @RequestParam(defaultValue = "1") String page,
                                    @RequestParam(defaultValue = "10") String limit) {
        return service.list(search, paymentByIds, paymentType, fromDate, toDate, page, limit);
    }

    @PostMapping("/addTransaction")
    public Map<String, Object> add(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok("Transaction added successfully", service.create(body));
    }

    @PutMapping("/updateTransaction/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok("Transaction updated successfully", service.update(id, body));
    }

    @DeleteMapping("/deleteTransaction/{id}")
    public Map<String, Object> delete(@PathVariable String id) {
        service.delete(id);
        return ApiResponse.message("Transaction deleted successfully");
    }

    @PostMapping("/bulkDelete")
    public Map<String, Object> bulkDelete(@RequestBody Map<String, Object> body) {
        return service.bulkDelete(body);
    }

    @PostMapping("/bulkAddTransactions")
    public Map<String, Object> bulkAdd(@RequestBody Map<String, Object> body) {
        return service.bulkCreate(body);
    }

    @GetMapping("/getPatientBalance/{patientId}")
    public Map<String, Object> balance(@PathVariable String patientId) {
        return ApiResponse.ok(service.balance(patientId));
    }
}
