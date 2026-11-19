package com.swaminarayan.clinic.service;

import com.swaminarayan.clinic.dto.Params;
import com.swaminarayan.clinic.dto.Views;
import com.swaminarayan.clinic.entity.*;
import com.swaminarayan.clinic.exception.ApiException;
import com.swaminarayan.clinic.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
public class DashboardService {
    private final PatientRepository patients;
    private final OpdRepository opds;
    private final AppointmentRepository appts;
    private final TransactionRepository txns;
    private final TransactionService txnService;
    private final OpdService opdService;

    public DashboardService(PatientRepository patients, OpdRepository opds, AppointmentRepository appts,
                            TransactionRepository txns, TransactionService txnService, OpdService opdService) {
        this.patients = patients;
        this.opds = opds;
        this.appts = appts;
        this.txns = txns;
        this.txnService = txnService;
        this.opdService = opdService;
    }

    /** { stats: {...}, todayPatients: [rows], appointments: [rows] } for the selected date range. */
    public Map<String, Object> stats(String startDate, String endDate) {
        LocalDate today = LocalDate.now();
        LocalDate from = startDate == null || startDate.isBlank() ? today : Params.parseDate(startDate, "startDate");
        LocalDate to = endDate == null || endDate.isBlank() ? from : Params.parseDate(endDate, "endDate");
        if (to.isBefore(from)) throw ApiException.badRequest("endDate cannot be before startDate");

        List<Patient> newPatients = patients.findByRegistrationDateBetween(from, to);
        List<Opd> visits = opds.findByDateBetween(from, to);
        List<Appointment> appointments = appts.findByAppointmentDateBetweenOrderByAppointmentDateAscAppointmentTimeAsc(from, to);
        List<PaymentTransaction> payments = txns.findByPaymentDateTimeBetween(from.atStartOfDay(), to.atTime(LocalTime.MAX));

        BigDecimal collection = BigDecimal.ZERO;
        Map<String, BigDecimal> paidByPatient = new HashMap<>();
        for (PaymentTransaction t : payments) {
            if (!"Credit".equals(t.paymentType)) continue;
            collection = collection.add(t.amount);
            if (t.patient != null) paidByPatient.merge(t.patient.id, t.amount, BigDecimal::add);
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("todayPatients", newPatients.size());
        stats.put("todayVisits", visits.size());
        stats.put("todayAppointments", appointments.size());
        stats.put("todayCollection", collection);

        // One row per patient: latest visit in range, otherwise the registration date.
        Map<String, Patient> byId = new LinkedHashMap<>();
        Map<String, LocalDate> activity = new HashMap<>();
        Map<String, String> doctorName = new HashMap<>();
        for (Patient p : newPatients) {
            byId.put(p.id, p);
            activity.put(p.id, p.registrationDate);
            if (p.doctor != null) doctorName.put(p.id, p.doctor.name);
        }
        for (Opd v : visits) {
            byId.putIfAbsent(v.patient.id, v.patient);
            LocalDate prev = activity.get(v.patient.id);
            if (prev == null || v.date.isAfter(prev) || (v.date.equals(prev) && v.doctor != null)) {
                activity.put(v.patient.id, v.date);
                if (v.doctor != null) doctorName.put(v.patient.id, v.doctor.name);
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Patient p : byId.values()) {
            LocalDate act = activity.get(p.id);
            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("credit", paidByPatient.getOrDefault(p.id, BigDecimal.ZERO));
            summary.put("balance", txnService.balance(p.id).get("outstandingBalance"));
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", p.id);
            r.put("uhid", p.uhid);
            r.put("patientName", p.patientName);
            r.put("mobileNo", p.mobileNo);
            r.put("doctor", doctorName.getOrDefault(p.id, ""));
            boolean isNew = p.registrationDate != null && !p.registrationDate.isBefore(from) && !p.registrationDate.isAfter(to);
            r.put("patientType", isNew ? "New" : "Follow-up");
            r.put("paymentSummary", summary);
            r.put("activityDate", act.toString());
            rows.add(r);
        }
        rows.sort((a, b) -> ((String) b.get("activityDate")).compareTo((String) a.get("activityDate")));

        List<Map<String, Object>> apptRows = new ArrayList<>();
        for (Appointment a : appointments) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", a.id);
            r.put("patient", a.patient.patientName);
            r.put("doctor", a.doctor == null ? "" : a.doctor.name);
            r.put("time", a.appointmentTime);
            r.put("treatment", a.treatment == null ? "" : a.treatment.text);
            r.put("date", a.appointmentDate.toString());
            r.put("status", a.status);
            apptRows.add(r);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("stats", stats);
        out.put("todayPatients", rows);
        out.put("appointments", apptRows);
        return out;
    }

    /** The visit and payments of one patient on one day (feeds the dashboard edit popup). */
    public Map<String, Object> visitAndPayments(String patientId, String date) {
        if (patientId == null || date == null) throw ApiException.badRequest("patientId and date are required");
        LocalDate d = Params.parseDate(date, "date");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("visit", opds.findFirstByPatientIdAndDateOrderByCreatedAtDesc(patientId, d).map(Views::opd).orElse(null));
        out.put("transactions", txns.findByPatientIdAndPaymentDateTimeBetween(patientId, d.atStartOfDay(), d.atTime(LocalTime.MAX))
                .stream().map(Views::transaction).toList());
        return out;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public void updateVisitAndPayments(Map<String, Object> body) {
        String patientId = Params.str(body, "patientId");
        LocalDate original = Params.date(body, "originalDate");
        if (patientId == null || original == null) throw ApiException.badRequest("patientId and originalDate are required");
        LocalDate target = Params.date(body, "newDate");
        if (target == null) target = original;

        Object visitData = body.get("visitData");
        if (visitData instanceof Map<?, ?> vd) {
            Opd visit = opds.findFirstByPatientIdAndDateOrderByCreatedAtDesc(patientId, original)
                    .orElseThrow(() -> ApiException.notFound("Visit not found for this date"));
            opdService.applyDetails(visit, (Map<String, Object>) vd);
            visit.date = target;
            opds.save(visit);
        }

        Object tx = body.get("transactionsData");
        if (tx instanceof List<?> list) {
            for (Object o : list) {
                Map<String, Object> row = (Map<String, Object>) o;
                String id = Params.str(row, "id");
                if (id == null) continue;
                PaymentTransaction t = txns.findById(id).orElseThrow(() -> ApiException.notFound("Transaction not found"));
                if (t.patient == null || !t.patient.id.equals(patientId))
                    throw ApiException.badRequest("Transaction does not belong to this patient");
                txnService.apply(t, row);
                LocalDateTime old = t.paymentDateTime;
                t.paymentDateTime = target.atTime(old.toLocalTime());
                txns.save(t);
            }
        }
    }
}
