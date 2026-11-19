package com.swaminarayan.clinic.service;

import com.swaminarayan.clinic.dto.Params;
import com.swaminarayan.clinic.dto.Views;
import com.swaminarayan.clinic.entity.MasterItem;
import com.swaminarayan.clinic.entity.MasterType;
import com.swaminarayan.clinic.exception.ApiException;
import com.swaminarayan.clinic.repository.MasterItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** CRUD for all simple "text" master lists (specialty, designation, payment mode, OPD status, ...). */
@Service
public class MasterService {
    private final MasterItemRepository repo;

    public MasterService(MasterItemRepository repo) {
        this.repo = repo;
    }

    public List<Map<String, Object>> list(MasterType type) {
        return repo.findByTypeOrderByTextAsc(type).stream().map(Views::master).toList();
    }

    /** Looks up an item of the given type, or returns null when id is null/blank. Throws 400 for an unknown id. */
    public MasterItem optional(MasterType type, String id, String label) {
        if (id == null || id.isBlank()) return null;
        return repo.findByIdAndType(id, type).orElseThrow(() -> ApiException.badRequest("Invalid " + label));
    }

    public MasterItem required(MasterType type, String id, String label) {
        MasterItem m = optional(type, id, label);
        if (m == null) throw ApiException.badRequest(label + " is required");
        return m;
    }

    public Optional<MasterItem> findByName(MasterType type, String name) {
        return repo.findByTypeAndTextIgnoreCase(type, name);
    }

    @Transactional
    public Map<String, Object> add(MasterType type, Map<String, Object> body) {
        String text = text(body);
        if (repo.findByTypeAndTextIgnoreCase(type, text).isPresent())
            throw ApiException.conflict("\"" + text + "\" already exists");
        MasterItem m = new MasterItem();
        m.type = type;
        m.text = text;
        return Views.master(repo.save(m));
    }

    @Transactional
    public Map<String, Object> update(MasterType type, String id, Map<String, Object> body) {
        MasterItem m = repo.findByIdAndType(id, type).orElseThrow(() -> ApiException.notFound("Record not found"));
        String text = text(body);
        repo.findByTypeAndTextIgnoreCase(type, text).filter(o -> !o.id.equals(id)).ifPresent(o -> {
            throw ApiException.conflict("\"" + text + "\" already exists");
        });
        m.text = text;
        return Views.master(repo.save(m));
    }

    @Transactional
    public void delete(MasterType type, String id) {
        MasterItem m = repo.findByIdAndType(id, type).orElseThrow(() -> ApiException.notFound("Record not found"));
        repo.delete(m);
        repo.flush(); // surfaces "in use" foreign-key errors here so they become a clean 409
    }

    /** Most master screens send {text}; the Designation screen sends {name}. */
    private String text(Map<String, Object> body) {
        String t = Params.str(body, "text");
        if (t == null) t = Params.str(body, "name");
        if (t == null) throw ApiException.badRequest("Name is required");
        if (t.length() > 150) throw ApiException.badRequest("Name must be at most 150 characters");
        return t;
    }
}
