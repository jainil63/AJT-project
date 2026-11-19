package com.swaminarayan.clinic.service;

import com.swaminarayan.clinic.dto.PageUtil;
import com.swaminarayan.clinic.dto.Params;
import com.swaminarayan.clinic.dto.Views;
import com.swaminarayan.clinic.entity.*;
import com.swaminarayan.clinic.exception.ApiException;
import com.swaminarayan.clinic.repository.*;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
public class PatientService {
    private static final Set<String> GENDERS = Set.of("Male", "Female", "Other");

    private final PatientRepository patients;
    private final DoctorRepository doctors;
    private final MasterService masters;
    private final TransactionRepository txns;
    private final AppointmentRepository appts;
    private final OpdRepository opds;
    private final TransactionService txnService;

    public PatientService(PatientRepository patients, DoctorRepository doctors, MasterService masters,
                          TransactionRepository txns, AppointmentRepository appts, OpdRepository opds,
                          TransactionService txnService) {
        this.patients = patients;
        this.doctors = doctors;
        this.masters = masters;
        this.txns = txns;
        this.appts = appts;
        this.opds = opds;
        this.txnService = txnService;
    }

    // ---------------------------------------------------------------- list / detail

    public Map<String, Object> list(String search, String genders, String fromDate, String toDate, String page, String limit) {
        LocalDate from = Params.parseDate(blankToNull(fromDate), "fromDate");
        LocalDate to = Params.parseDate(blankToNull(toDate), "toDate");
        List<String> genderList = Params.csv(genders);

        Specification<Patient> spec = (root, q, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase() + "%";
                ps.add(cb.or(
                        cb.like(cb.lower(root.<String>get("patientName")), like),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("mobileNo"), "")), like),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("alternativeMobileNo"), "")), like),
                        cb.like(cb.lower(root.<String>get("uhid")), like),
                        cb.like(cb.lower(cb.coalesce(root.<String>get("email"), "")), like)));
            }
            if (!genderList.isEmpty()) ps.add(root.get("gender").in(genderList));
            if (from != null) ps.add(cb.greaterThanOrEqualTo(root.<LocalDate>get("registrationDate"), from));
            if (to != null) ps.add(cb.lessThanOrEqualTo(root.<LocalDate>get("registrationDate"), to));
            return cb.and(ps.toArray(new Predicate[0]));
        };

        Sort sort = Sort.by(Sort.Order.desc("createdAt"));
        Page<Patient> p = patients.findAll(spec, PageUtil.pageable(page, limit, sort));
        return PageUtil.envelope(p, p.getContent().stream().map(Views::patient).toList(), page, limit);
    }

    /** Everything the Patient Detail screen shows; patients sharing the same mobile number are combined. */
    public Map<String, Object> detail(String id) {
        Patient main = patients.findById(id).orElseThrow(() -> ApiException.notFound("Patient not found"));
        List<Patient> related = main.mobileNo == null ? List.of(main) : patients.findByMobileNo(main.mobileNo);
        if (related.stream().noneMatch(p -> p.id.equals(main.id))) {
            related = new ArrayList<>(related);
            related.add(main);
        }

        List<Map<String, Object>> a = new ArrayList<>(), o = new ArrayList<>(), t = new ArrayList<>();
        for (Patient p : related) {
            appts.findByPatientId(p.id).forEach(x -> a.add(Views.appointment(x)));
            opds.findByPatientIdOrderByDateDesc(p.id).forEach(x -> o.add(Views.opd(x)));
            txns.findByPatientIdOrderByPaymentDateTimeDesc(p.id).forEach(x -> t.add(Views.transaction(x)));
        }
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("patient", Views.patient(main));
        r.put("relatedPatients", related.stream().map(Views::patient).toList());
        r.put("appointments", a);
        r.put("opds", o);
        r.put("transactions", t);
        r.put("documents", List.of()); // document upload is not part of this backend (see README)
        return r;
    }

    // ---------------------------------------------------------------- create / update / delete

    @Transactional
    public Patient create(Map<String, String> f, List<String> categories) {
        Patient p = new Patient();
        apply(p, f, true);
        p.uhid = nextUhid();
        p = patients.save(p);
        recordPayment(p, f, categories, p.registrationDate);
        bookFutureAppointment(p);
        return p;
    }

    @Transactional
    public Patient update(String id, Map<String, String> f, List<String> categories) {
        Patient p = patients.findById(id).orElseThrow(() -> ApiException.notFound("Patient not found"));
        apply(p, f, false);
        p = patients.save(p);
        LocalDate txDate = Params.date(f, "transactionDate");
        recordPayment(p, f, categories, txDate == null ? LocalDate.now() : txDate);
        return p;
    }

    /** Deleting a patient also removes their visits, appointments and payments (the UI asks for confirmation). */
    @Transactional
    public void delete(String id) {
        if (!patients.existsById(id)) throw ApiException.notFound("Patient not found");
        txns.deleteByPatientId(id);
        opds.deleteByPatientId(id);
        appts.deleteByPatientId(id);
        patients.deleteById(id);
        patients.flush();
    }

    /** Excel import. Rows whose mobile number already exists (or repeats in the file) are skipped. */
    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkCreate(Map<String, Object> body) {
        Object rows = body.get("patients");
        if (!(rows instanceof List<?> list) || list.isEmpty()) throw ApiException.badRequest("No patients provided");
        int created = 0, skipped = 0;
        Set<String> seen = new HashSet<>();
        for (Object o : list) {
            Map<String, Object> row = (Map<String, Object>) o;
            String name = Params.str(row, "patientName");
            String mobile = DoctorService.clean(Params.str(row, "mobileNo"));
            if (name == null || (mobile != null && (!DoctorService.PHONE.matcher(mobile).matches()
                    || patients.existsByMobileNo(mobile) || !seen.add(mobile)))) {
                skipped++;
                continue;
            }
            Patient p = new Patient();
            p.patientName = name;
            p.mobileNo = mobile;
            p.email = validEmailOrNull(Params.str(row, "email"));
            String g = Params.str(row, "gender");
            p.gender = g != null && GENDERS.contains(g) ? g : "Male";
            try { p.age = Params.integer(row, "age"); } catch (ApiException e) { p.age = null; }
            p.address = Params.str(row, "address");
            p.city = Params.str(row, "city");
            p.pincode = Params.str(row, "pincode");
            p.country = Optional.ofNullable(Params.str(row, "country")).orElse("India");
            LocalDate reg;
            try { reg = Params.date(row, "registeredAt"); } catch (ApiException e) { reg = null; }
            p.registrationDate = reg == null ? LocalDate.now() : reg;
            p.uhid = nextUhid();
            patients.saveAndFlush(p);
            created++;
        }
        Map<String, Object> r = com.swaminarayan.clinic.dto.ApiResponse.message(created + " patients imported");
        r.put("createdCount", created);
        r.put("skippedCount", skipped);
        return r;
    }

    // ---------------------------------------------------------------- helpers

    private void apply(Patient p, Map<String, String> f, boolean create) {
        String name = Params.str(f, "patientName");
        if (name == null) throw ApiException.badRequest("Patient name is required");
        if (name.length() > 150) throw ApiException.badRequest("Patient name is too long");

        String mobile = DoctorService.clean(Params.str(f, "mobileNo"));
        String alt = DoctorService.clean(Params.str(f, "alternativeMobileNo"));
        if (mobile != null && !DoctorService.PHONE.matcher(mobile).matches())
            throw ApiException.badRequest("Mobile number must be 8-15 digits");
        if (alt != null && !DoctorService.PHONE.matcher(alt).matches())
            throw ApiException.badRequest("Alternative mobile number must be 8-15 digits");

        String email = Params.str(f, "email");
        if (email != null && !DoctorService.EMAIL.matcher(email).matches())
            throw ApiException.badRequest("Please enter a valid email address");

        String gender = Params.str(f, "gender");
        if (gender != null && !GENDERS.contains(gender)) throw ApiException.badRequest("Gender must be Male, Female or Other");

        Integer age = Params.integer(f, "age");
        if (age != null && (age < 0 || age > 150)) throw ApiException.badRequest("Age must be between 0 and 150");
        Double height = Params.dbl(f, "height");
        Double weight = Params.dbl(f, "weight");
        if ((height != null && height <= 0) || (weight != null && weight <= 0))
            throw ApiException.badRequest("Height and weight must be positive numbers");

        p.patientName = name;
        p.mobileNo = mobile;
        p.alternativeMobileNo = alt;
        p.gender = gender == null ? "Male" : gender;
        p.dob = Params.date(f, "dob");
        p.age = age;
        p.email = email;
        p.aadharNo = Params.str(f, "aadharNo");
        p.panNo = Params.str(f, "panNo");
        p.height = height;
        p.weight = weight;
        p.bloodGroup = Params.str(f, "bloodGroup");
        p.medicalAlert = masters.optional(MasterType.MEDICAL_ALERT, Params.str(f, "medicalAlertId"), "medical alert");
        p.occupation = Params.str(f, "occupation");
        p.referredBy = Params.str(f, "referredBy");
        p.familyHistory = Params.str(f, "familyHistory");
        p.address = Params.str(f, "address");
        p.city = Params.str(f, "city");
        p.pincode = Params.str(f, "pincode");
        p.country = Optional.ofNullable(Params.str(f, "country")).orElse("India");
        p.appointmentType = Params.str(f, "appointmentType");
        p.appointmentDateTime = Params.dateTime(f, "appointmentDateTime");

        String doctorId = Params.str(f, "doctorId");
        p.doctor = doctorId == null ? null
                : doctors.findById(doctorId).orElseThrow(() -> ApiException.badRequest("Invalid doctor"));

        if (create) {
            LocalDate reg = Params.date(f, "registrationDate");
            p.registrationDate = reg == null ? LocalDate.now() : reg;
        }
    }

    /**
     * Registration-form payment: PaymentReceived -> Credit(fee), Refund -> Debit(fee),
     * SurgeonCharges -> Debit(surgeonChargesAmount). Nothing is recorded when no amount was entered.
     */
    private void recordPayment(Patient p, Map<String, String> f, List<String> categories, LocalDate date) {
        BigDecimal fee = Params.decimal(f, "registrationFee");
        BigDecimal surgeon = Params.decimal(f, "surgeonChargesAmount");
        boolean hasFee = fee != null && fee.signum() > 0;
        boolean hasSurgeon = surgeon != null && surgeon.signum() > 0;
        if (!hasFee && !hasSurgeon) return;

        String modeId = Params.str(f, "paymentMode");
        MasterItem mode = masters.required(MasterType.PAYMENT_BY, modeId, "Payment method");
        List<String> cats = categories == null || categories.isEmpty() ? List.of("PaymentReceived") : categories;
        LocalDateTime when = date.atTime(LocalTime.now().withNano(0));

        if (hasFee) {
            if (cats.contains("Refund")) txnService.record(p, mode, "Debit", "Refund", fee, when, "Refund (patient form)");
            if (cats.contains("PaymentReceived") || cats.stream().noneMatch(c -> c.equals("Refund") || c.equals("SurgeonCharges")))
                txnService.record(p, mode, "Credit", "PaymentReceived", fee, when, "Registration fee");
        }
        if (hasSurgeon && cats.contains("SurgeonCharges"))
            txnService.record(p, mode, "Debit", "SurgeonCharges", surgeon, when, "Surgeon charges");
    }

    /** Registration form option "Future Appointment" + preferred date/time books a pending appointment. */
    private void bookFutureAppointment(Patient p) {
        if (!"Future Appointment".equals(p.appointmentType) || p.appointmentDateTime == null) return;
        Appointment a = new Appointment();
        a.patient = p;
        a.doctor = p.doctor;
        a.appointmentDate = p.appointmentDateTime.toLocalDate();
        a.appointmentTime = String.format("%02d:%02d", p.appointmentDateTime.getHour(), p.appointmentDateTime.getMinute());
        a.duration = 15;
        a.status = "pending";
        a.note = "Booked from patient registration";
        appts.save(a);
    }

    private String nextUhid() {
        String max = patients.findMaxUhid();
        long n = 0;
        if (max != null) {
            try { n = Long.parseLong(max.replaceAll("\\D", "")); } catch (NumberFormatException ignored) { }
        }
        return String.format("UHID%06d", n + 1);
    }

    private static String validEmailOrNull(String e) {
        return e != null && DoctorService.EMAIL.matcher(e).matches() ? e : null;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
