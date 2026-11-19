package com.swaminarayan.clinic.service;

import com.swaminarayan.clinic.dto.Params;
import com.swaminarayan.clinic.dto.Views;
import com.swaminarayan.clinic.entity.Treatment;
import com.swaminarayan.clinic.exception.ApiException;
import com.swaminarayan.clinic.repository.TreatmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class TreatmentService {
    private final TreatmentRepository repo;

    public TreatmentService(TreatmentRepository repo) {
        this.repo = repo;
    }

    public List<Map<String, Object>> list() {
        return repo.findAllByOrderByTextAsc().stream().map(Views::treatment).toList();
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body) {
        Treatment t = new Treatment();
        apply(t, body);
        if (repo.existsByTextIgnoreCase(t.text)) throw ApiException.conflict("Treatment \"" + t.text + "\" already exists");
        return Views.treatment(repo.save(t));
    }

    @Transactional
    public Map<String, Object> update(String id, Map<String, Object> body) {
        Treatment t = repo.findById(id).orElseThrow(() -> ApiException.notFound("Treatment not found"));
        String oldName = t.text;
        apply(t, body);
        if (!t.text.equalsIgnoreCase(oldName) && repo.existsByTextIgnoreCase(t.text))
            throw ApiException.conflict("Treatment \"" + t.text + "\" already exists");
        return Views.treatment(repo.save(t));
    }

    @Transactional
    public void delete(String id) {
        Treatment t = repo.findById(id).orElseThrow(() -> ApiException.notFound("Treatment not found"));
        repo.delete(t);
        repo.flush();
    }

    /** Excel import: [{text, pricePerUnit}] - existing names are skipped. */
    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkCreate(Map<String, Object> body) {
        Object rows = body.get("treatments");
        if (!(rows instanceof List<?> list) || list.isEmpty()) throw ApiException.badRequest("No treatments provided");
        int created = 0, skipped = 0;
        for (Object o : list) {
            Map<String, Object> row = (Map<String, Object>) o;
            try {
                Treatment t = new Treatment();
                apply(t, row);
                if (repo.existsByTextIgnoreCase(t.text)) { skipped++; continue; }
                repo.save(t);
                created++;
            } catch (ApiException e) {
                skipped++;
            }
        }
        Map<String, Object> r = com.swaminarayan.clinic.dto.ApiResponse.message(created + " treatments imported");
        r.put("createdCount", created);
        r.put("skippedCount", skipped);
        return r;
    }

    private void apply(Treatment t, Map<String, Object> body) {
        String text = Params.str(body, "text");
        if (text == null) throw ApiException.badRequest("Treatment name is required");
        if (text.length() > 200) throw ApiException.badRequest("Treatment name must be at most 200 characters");
        BigDecimal price = Params.decimal(body, "pricePerUnit");
        if (price != null && price.signum() < 0) throw ApiException.badRequest("Price cannot be negative");
        Integer days = Params.integer(body, "dayCount");
        if (days != null && days < 1) throw ApiException.badRequest("Day count must be at least 1");
        t.text = text;
        t.pricePerUnit = price;
        t.dayCount = days == null ? 1 : days;
    }
}
