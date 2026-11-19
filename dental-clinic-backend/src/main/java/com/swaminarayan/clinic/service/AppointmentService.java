package com.swaminarayan.clinic.service;

import com.swaminarayan.clinic.dto.Params;
import com.swaminarayan.clinic.dto.Views;
import com.swaminarayan.clinic.entity.*;
import com.swaminarayan.clinic.exception.ApiException;
import com.swaminarayan.clinic.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AppointmentService {
    private static final Pattern TIME = Pattern.compile("^([01]?\\d|2[0-3]):([0-5]\\d)(:[0-5]\\d)?$");
    private static final Set<String> STATUSES = Set.of("pending", "visit", "no-visit");

    private final AppointmentRepository repo;
    private final PatientRepository patients;
    private final DoctorRepository doctors;
    private final TreatmentRepository treatments;

    public AppointmentService(AppointmentRepository repo, PatientRepository patients,
                              DoctorRepository doctors, TreatmentRepository treatments) {
        this.repo = repo;
        this.patients = patients;
        this.doctors = doctors;
        this.treatments = treatments;
    }

    public List<Map<String, Object>> list() {
        return repo.findAllByOrderByAppointmentDateDescAppointmentTimeDesc().stream().map(Views::appointment).toList();
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body) {
        Appointment a = new Appointment();
        apply(a, body, true);
        return Views.appointment(repo.save(a));
    }

    @Transactional
    public Map<String, Object> update(String id, Map<String, Object> body) {
        Appointment a = repo.findById(id).orElseThrow(() -> ApiException.notFound("Appointment not found"));
        apply(a, body, false);
        return Views.appointment(repo.save(a));
    }

    @Transactional
    public void delete(String id) {
        Appointment a = repo.findById(id).orElseThrow(() -> ApiException.notFound("Appointment not found"));
        repo.delete(a);
    }

    private void apply(Appointment a, Map<String, Object> body, boolean create) {
        String patientId = Params.str(body, "patientId");
        if (patientId == null) throw ApiException.badRequest("Patient is required");
        a.patient = patients.findById(patientId).orElseThrow(() -> ApiException.badRequest("Invalid patient"));

        String doctorId = Params.str(body, "doctorId");
        if (doctorId == null && (create || a.doctor != null)) throw ApiException.badRequest("Doctor is required");
        a.doctor = doctorId == null ? null
                : doctors.findById(doctorId).orElseThrow(() -> ApiException.badRequest("Invalid doctor"));

        LocalDate date = Params.date(body, "appointmentDate");
        if (date == null) throw ApiException.badRequest("Appointment date is required");
        String time = Params.str(body, "appointmentTime");
        if (time == null) throw ApiException.badRequest("Appointment time is required");
        Matcher m = TIME.matcher(time);
        if (!m.matches()) throw ApiException.badRequest("Appointment time must be in HH:mm format");
        String normalised = String.format("%02d:%s", Integer.parseInt(m.group(1)), m.group(2));

        Integer duration = Params.integer(body, "duration");
        if (duration == null) duration = a.duration == null ? 15 : a.duration;
        if (duration < 5 || duration > 480) throw ApiException.badRequest("Duration must be between 5 and 480 minutes");

        String status = Params.str(body, "status");
        if (status == null) status = a.status == null ? "pending" : a.status;
        if (!STATUSES.contains(status)) throw ApiException.badRequest("Status must be pending, visit or no-visit");

        String treatmentId = Params.str(body, "treatmentId");
        a.treatment = treatmentId == null ? null
                : treatments.findById(treatmentId).orElseThrow(() -> ApiException.badRequest("Invalid treatment"));

        if (a.doctor != null) checkClash(a, date, normalised, duration);

        a.appointmentDate = date;
        a.appointmentTime = normalised;
        a.duration = duration;
        a.status = status;
        a.note = Params.str(body, "note");
    }

    /** A doctor cannot have two overlapping appointments on the same day. */
    private void checkClash(Appointment self, LocalDate date, String time, int duration) {
        int start = minutes(time), end = start + duration;
        for (Appointment o : repo.findByDoctorIdAndAppointmentDate(self.doctor.id, date)) {
            if (o.id != null && o.id.equals(self.id)) continue;
            int os = minutes(o.appointmentTime), oe = os + (o.duration == null ? 15 : o.duration);
            if (start < oe && os < end)
                throw ApiException.conflict("Dr. " + self.doctor.name + " already has an appointment at "
                        + o.appointmentTime + " on this date");
        }
    }

    private static int minutes(String hhmm) {
        return Integer.parseInt(hhmm.substring(0, 2)) * 60 + Integer.parseInt(hhmm.substring(3, 5));
    }
}
