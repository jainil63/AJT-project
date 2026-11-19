package com.swaminarayan.clinic.service;

import com.swaminarayan.clinic.dto.ApiResponse;
import com.swaminarayan.clinic.dto.PageUtil;
import com.swaminarayan.clinic.dto.Params;
import com.swaminarayan.clinic.dto.Views;
import com.swaminarayan.clinic.entity.*;
import com.swaminarayan.clinic.exception.ApiException;
import com.swaminarayan.clinic.repository.PatientRepository;
import com.swaminarayan.clinic.repository.TransactionRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

/** Payments. Credit = money received, Debit = charge/refund. Outstanding balance = Debits - Credits. */
@Service
public class TransactionService {
    private static final Set<String> TYPES = Set.of("Credit", "Debit");
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("99999999");

    private final TransactionRepository repo;
    private final PatientRepository patients;
    private final MasterService masters;

    public TransactionService(TransactionRepository repo, PatientRepository patients, MasterService masters) {
        this.repo = repo;
        this.patients = patients;
        this.masters = masters;
    }

    public Map<String, Object> list(String search, String paymentByIds, String paymentType, String fromDate,
                                    String toDate, String page, String limit) {
        LocalDate from = Params.parseDate(blank(fromDate), "fromDate");
        LocalDate to = Params.parseDate(blank(toDate), "toDate");
        List<String> modes = Params.csv(paymentByIds);
        if (paymentType != null && !paymentType.isBlank() && !TYPES.contains(paymentType))
            throw ApiException.badRequest("paymentType must be Credit or Debit");

        Specification<PaymentTransaction> spec = (root, q, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (search != null && !search.isBlank()) {
                Join<PaymentTransaction, Patient> p = root.join("patient", JoinType.LEFT);
                String like = "%" + search.trim().toLowerCase() + "%";
                ps.add(cb.or(cb.like(cb.lower(cb.coalesce(p.<String>get("patientName"), "")), like),
                        cb.like(cb.lower(cb.coalesce(p.<String>get("mobileNo"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("remark"), "")), like)));
            }
            if (!modes.isEmpty()) ps.add(root.get("paymentBy").get("id").in(modes));
            if (paymentType != null && !paymentType.isBlank()) ps.add(cb.equal(root.get("paymentType"), paymentType));
            if (from != null) ps.add(cb.greaterThanOrEqualTo(root.<LocalDateTime>get("paymentDateTime"), from.atStartOfDay()));
            if (to != null) ps.add(cb.lessThanOrEqualTo(root.<LocalDateTime>get("paymentDateTime"), to.atTime(LocalTime.MAX)));
            return cb.and(ps.toArray(new Predicate[0]));
        };

        // Totals must cover every matching row, not just the current page, so filter once and page in memory.
        List<PaymentTransaction> all = repo.findAll(spec, Sort.by(Sort.Order.desc("paymentDateTime"), Sort.Order.desc("createdAt")));
        BigDecimal credits = BigDecimal.ZERO, debits = BigDecimal.ZERO;
        for (PaymentTransaction t : all) {
            if ("Credit".equals(t.paymentType)) credits = credits.add(t.amount); else debits = debits.add(t.amount);
        }

        List<PaymentTransaction> rows = all;
        if (!PageUtil.isAll(limit)) {
            int lim = Math.min(PageUtil.intOr(limit, 10), 1000);
            int skip = (PageUtil.intOr(page, 1) - 1) * lim;
            rows = skip >= all.size() ? List.of() : all.subList(skip, Math.min(all.size(), skip + lim));
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalCredits", credits);
        stats.put("totalDebits", debits);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("success", true);
        r.put("data", rows.stream().map(Views::transaction).toList());
        r.put("pagination", PageUtil.pagination(all.size(), page, limit));
        r.put("stats", stats);
        return r;
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body) {
        PaymentTransaction t = new PaymentTransaction();
        apply(t, body);
        return Views.transaction(repo.save(t));
    }

    @Transactional
    public Map<String, Object> update(String id, Map<String, Object> body) {
        PaymentTransaction t = repo.findById(id).orElseThrow(() -> ApiException.notFound("Transaction not found"));
        apply(t, body);
        return Views.transaction(repo.save(t));
    }

    @Transactional
    public void delete(String id) {
        PaymentTransaction t = repo.findById(id).orElseThrow(() -> ApiException.notFound("Transaction not found"));
        repo.delete(t);
    }

    @Transactional
    public Map<String, Object> bulkDelete(Map<String, Object> body) {
        Object ids = body.get("ids");
        if (!(ids instanceof List<?> list) || list.isEmpty()) throw ApiException.badRequest("No transactions selected");
        List<String> idList = list.stream().map(String::valueOf).toList();
        List<PaymentTransaction> found = repo.findAllById(idList);
        repo.deleteAll(found);
        return ApiResponse.message(found.size() + " transactions deleted");
    }

    /** Excel import: rows {mobileNo, paymentMode, amountPaid, createdAt}. Unknown patient/mode rows are skipped. */
    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkCreate(Map<String, Object> body) {
        Object rows = body.get("payments");
        if (!(rows instanceof List<?> list) || list.isEmpty()) throw ApiException.badRequest("No payments provided");
        int created = 0, skipped = 0;
        for (Object o : list) {
            Map<String, Object> row = (Map<String, Object>) o;
            try {
                String mobile = DoctorService.clean(Params.str(row, "mobileNo"));
                String modeName = Params.str(row, "paymentMode");
                BigDecimal amount = Params.decimal(row, "amountPaid");
                List<Patient> found = mobile == null ? List.of() : patients.findByMobileNo(mobile);
                Optional<MasterItem> mode = modeName == null ? Optional.empty() : masters.findByName(MasterType.PAYMENT_BY, modeName);
                if (found.isEmpty() || mode.isEmpty() || amount == null || amount.signum() <= 0) { skipped++; continue; }
                String wantedName = Params.str(row, "patientName");
                Patient p = found.stream().filter(x -> wantedName != null && x.patientName.equalsIgnoreCase(wantedName))
                        .findFirst().orElse(found.get(0));
                LocalDateTime when;
                try {
                    LocalDate d = Params.date(row, "createdAt");
                    when = d == null ? LocalDateTime.now() : d.atTime(LocalTime.NOON);
                } catch (ApiException e) { when = LocalDateTime.now(); }
                record(p, mode.get(), "Credit", "PaymentReceived", amount, when, "Imported");
                created++;
            } catch (ApiException e) {
                skipped++;
            }
        }
        Map<String, Object> r = ApiResponse.message(created + " payments imported");
        r.put("createdCount", created);
        r.put("skippedCount", skipped);
        return r;
    }

    public Map<String, Object> balance(String patientId) {
        if (!patients.existsById(patientId)) throw ApiException.notFound("Patient not found");
        Map<String, Object> m = new LinkedHashMap<>();
        BigDecimal credit = BigDecimal.ZERO, debit = BigDecimal.ZERO;
        for (PaymentTransaction t : repo.findByPatientIdOrderByPaymentDateTimeDesc(patientId)) {
            if ("Credit".equals(t.paymentType)) credit = credit.add(t.amount); else debit = debit.add(t.amount);
        }
        m.put("totalCredit", credit);
        m.put("totalDebit", debit);
        m.put("outstandingBalance", debit.subtract(credit));
        return m;
    }

    /** Used by the patient-registration flow. */
    public PaymentTransaction record(Patient p, MasterItem mode, String type, String category,
                                     BigDecimal amount, LocalDateTime when, String remark) {
        PaymentTransaction t = new PaymentTransaction();
        t.patient = p;
        t.paymentBy = mode;
        t.paymentType = type;
        t.paymentCategory = category;
        t.amount = amount;
        t.paymentDateTime = when;
        t.remark = remark;
        return repo.save(t);
    }

    /** Validates and applies a payment body (shared by add/update and the dashboard popup). */
    void apply(PaymentTransaction t, Map<String, Object> body) {
        BigDecimal amount = Params.decimal(body, "amount");
        if (amount == null || amount.signum() <= 0) throw ApiException.badRequest("Amount must be greater than 0");
        if (amount.compareTo(MAX_AMOUNT) > 0) throw ApiException.badRequest("Amount is too large");

        String type = Params.str(body, "paymentType");
        if (type == null) type = t.paymentType == null ? "Credit" : t.paymentType;
        if (!TYPES.contains(type)) throw ApiException.badRequest("Payment type must be Credit or Debit");

        String patientId = Params.str(body, "patientId");
        if (patientId != null) {
            t.patient = patients.findById(patientId).orElseThrow(() -> ApiException.badRequest("Invalid patient"));
        } else if (t.id == null) {
            t.patient = null;
        }
        t.paymentBy = masters.required(MasterType.PAYMENT_BY, Params.str(body, "paymentById"), "Payment mode");
        t.amount = amount.setScale(2, java.math.RoundingMode.HALF_UP);
        t.paymentType = type;
        String cat = Params.str(body, "paymentCategory");
        if (cat != null) t.paymentCategory = cat;
        LocalDateTime when = Params.dateTime(body, "paymentDateTime");
        t.paymentDateTime = when != null ? when : (t.paymentDateTime != null ? t.paymentDateTime : LocalDateTime.now());
        String remark = Params.str(body, "remark");
        if (remark != null && remark.length() > 500) throw ApiException.badRequest("Remark must be at most 500 characters");
        t.remark = remark;
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
