package com.swaminarayan.clinic.service;

import com.swaminarayan.clinic.dto.PageUtil;
import com.swaminarayan.clinic.dto.Params;
import com.swaminarayan.clinic.dto.Views;
import com.swaminarayan.clinic.entity.*;
import com.swaminarayan.clinic.exception.ApiException;
import com.swaminarayan.clinic.repository.*;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Clinic visits ("OPD" / "Visit" in the UI). */
@Service
public class OpdService {
    private final OpdRepository repo;
    private final PatientRepository patients;
    private final DoctorRepository doctors;
    private final TreatmentRepository treatments;
    private final MasterService masters;

    public OpdService(OpdRepository repo, PatientRepository patients, DoctorRepository doctors,
                      TreatmentRepository treatments, MasterService masters) {
        this.repo = repo;
        this.patients = patients;
        this.doctors = doctors;
        this.treatments = treatments;
        this.masters = masters;
    }

    public Map<String, Object> list(String search, String doctorIds, String statusIds, String paymentTypeIds,
                                    String fromDate, String toDate, String page, String limit) {
        LocalDate from = Params.parseDate(blank(fromDate), "fromDate");
        LocalDate to = Params.parseDate(blank(toDate), "toDate");
        List<String> docs = Params.csv(doctorIds), sts = Params.csv(statusIds), pays = Params.csv(paymentTypeIds);

        Specification<Opd> spec = (root, q, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (search != null && !search.isBlank()) {
                Join<Opd, Patient> p = root.join("patient", JoinType.INNER);
                String like = "%" + search.trim().toLowerCase() + "%";
                ps.add(cb.or(cb.like(cb.lower(p.<String>get("patientName")), like),
                        cb.like(cb.lower(cb.coalesce(p.<String>get("mobileNo"), "")), like),
                        cb.like(cb.lower(p.<String>get("uhid")), like)));
            }
            if (!docs.isEmpty()) ps.add(root.get("doctor").get("id").in(docs));
            if (!sts.isEmpty()) ps.add(root.get("status").get("id").in(sts));
            if (!pays.isEmpty()) ps.add(root.get("paymentBy").get("id").in(pays));
            if (from != null) ps.add(cb.greaterThanOrEqualTo(root.<LocalDate>get("date"), from));
            if (to != null) ps.add(cb.lessThanOrEqualTo(root.<LocalDate>get("date"), to));
            return cb.and(ps.toArray(new Predicate[0]));
        };
        Page<Opd> res = repo.findAll(spec, PageUtil.pageable(page, limit,
                Sort.by(Sort.Order.desc("date"), Sort.Order.desc("createdAt"))));
        return PageUtil.envelope(res, res.getContent().stream().map(Views::opd).toList(), page, limit);
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body) {
        Opd o = new Opd();
        apply(o, body);
        return Views.opd(repo.save(o));
    }

    @Transactional
    public Map<String, Object> update(String id, Map<String, Object> body) {
        Opd o = repo.findById(id).orElseThrow(() -> ApiException.notFound("Visit not found"));
        apply(o, body);
        return Views.opd(repo.save(o));
    }

    @Transactional
    public void delete(String id) {
        Opd o = repo.findById(id).orElseThrow(() -> ApiException.notFound("Visit not found"));
        repo.delete(o);
    }

    /** Shared with the dashboard "edit visit" popup. */
    void apply(Opd o, Map<String, Object> body) {
        String patientId = Params.str(body, "patientId");
        if (patientId == null) throw ApiException.badRequest("Patient is required");
        o.patient = patients.findById(patientId).orElseThrow(() -> ApiException.badRequest("Invalid patient"));
        LocalDate date = Params.date(body, "date");
        if (date == null) date = o.date != null ? o.date : LocalDate.now();
        o.date = date;
        applyDetails(o, body);
    }

    void applyDetails(Opd o, Map<String, Object> body) {
        String doctorId = Params.str(body, "doctorId");
        o.doctor = doctorId == null ? null
                : doctors.findById(doctorId).orElseThrow(() -> ApiException.badRequest("Invalid doctor"));
        o.status = masters.optional(MasterType.OPD_STATUS, Params.str(body, "statusId"), "status");
        if (body.containsKey("paymentTypeId"))
            o.paymentBy = masters.optional(MasterType.PAYMENT_BY, Params.str(body, "paymentTypeId"), "payment type");
        String treatmentId = Params.str(body, "treatmentId");
        o.treatment = treatmentId == null ? null
                : treatments.findById(treatmentId).orElseThrow(() -> ApiException.badRequest("Invalid treatment"));
        o.remark = Params.str(body, "remark");
        o.bloodPressure = Params.str(body, "bloodPressure");
        o.height = Params.str(body, "height");
        o.weight = Params.str(body, "weight");
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
