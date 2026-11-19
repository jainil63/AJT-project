package com.swaminarayan.clinic.dto;

import com.swaminarayan.clinic.entity.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Entity -> JSON mappers. The JSON field names (e.g. "Doctor", "MedicalAlert", "PaymentBy")
 * deliberately mirror what the existing React pages read.
 */
public final class Views {
    private Views() {}

    private static Map<String, Object> map() { return new LinkedHashMap<>(); }

    public static Map<String, Object> master(MasterItem m) {
        if (m == null) return null;
        Map<String, Object> r = map();
        r.put("id", m.id);
        r.put("text", m.text);
        r.put("name", m.text);      // Specialty / Designation screens read "name"
        r.put("createdAt", m.createdAt);
        return r;
    }

    public static Map<String, Object> user(User u) {
        Map<String, Object> r = map();
        r.put("id", u.id);
        r.put("fullName", u.fullName);
        r.put("username", u.username);
        r.put("email", u.email);
        r.put("mobileNumber", u.mobileNumber);
        r.put("employeeCode", u.employeeCode);
        r.put("designation", u.designation);
        r.put("userType", u.userType);
        r.put("isSuperAdmin", u.superAdmin);
        r.put("isDisabled", u.disabled);
        r.put("branchId", null);
        return r;
    }

    public static Map<String, Object> doctor(Doctor d) {
        if (d == null) return null;
        Map<String, Object> r = map();
        r.put("id", d.id);
        r.put("name", d.name);
        r.put("gender", d.gender);
        r.put("mobileNo", d.mobileNo);
        r.put("alternativeMobileNo", d.alternativeMobileNo);
        r.put("doctorType", d.doctorType);
        r.put("accessPrescription", d.accessPrescription);
        r.put("accessBilling", d.accessBilling);
        r.put("accessPatients", d.accessPatients);
        r.put("accessAppointments", d.accessAppointments);
        r.put("email", d.email);
        r.put("description", d.description);
        r.put("googleProfileUrl", d.googleProfileUrl);
        r.put("colorCode", d.colorCode);
        r.put("specialtyId", d.specialty == null ? null : d.specialty.id);
        r.put("Specialty", master(d.specialty));
        r.put("authorisedSignatory", d.authorisedSignatory);
        r.put("createdAt", d.createdAt);
        return r;
    }

    public static Map<String, Object> patientRef(Patient p) {
        if (p == null) return null;
        Map<String, Object> r = map();
        r.put("id", p.id);
        r.put("uhid", p.uhid);
        r.put("patientName", p.patientName);
        r.put("mobileNo", p.mobileNo);
        return r;
    }

    public static Map<String, Object> doctorRef(Doctor d) {
        if (d == null) return null;
        Map<String, Object> r = map();
        r.put("id", d.id);
        r.put("name", d.name);
        r.put("colorCode", d.colorCode);
        return r;
    }

    public static Map<String, Object> treatment(Treatment t) {
        if (t == null) return null;
        Map<String, Object> r = map();
        r.put("id", t.id);
        r.put("text", t.text);
        r.put("pricePerUnit", t.pricePerUnit);
        r.put("dayCount", t.dayCount);
        r.put("createdAt", t.createdAt);
        return r;
    }

    public static Map<String, Object> patient(Patient p) {
        Map<String, Object> r = map();
        r.put("id", p.id);
        r.put("uhid", p.uhid);
        r.put("patientName", p.patientName);
        r.put("mobileNo", p.mobileNo);
        r.put("alternativeMobileNo", p.alternativeMobileNo);
        r.put("gender", p.gender);
        r.put("dob", p.dob);
        r.put("age", p.age);
        r.put("email", p.email);
        r.put("aadharNo", p.aadharNo);
        r.put("panNo", p.panNo);
        r.put("height", p.height);
        r.put("weight", p.weight);
        r.put("bloodGroup", p.bloodGroup);
        r.put("medicalAlertId", p.medicalAlert == null ? null : p.medicalAlert.id);
        r.put("MedicalAlert", master(p.medicalAlert));
        r.put("occupation", p.occupation);
        r.put("referredBy", p.referredBy);
        r.put("familyHistory", p.familyHistory);
        r.put("address", p.address);
        r.put("city", p.city);
        r.put("pincode", p.pincode);
        r.put("country", p.country);
        r.put("doctorId", p.doctor == null ? null : p.doctor.id);
        r.put("Doctor", doctorRef(p.doctor));
        r.put("registrationDate", p.registrationDate);
        r.put("appointmentType", p.appointmentType);
        r.put("appointmentDateTime", p.appointmentDateTime);
        r.put("patientPhoto", p.patientPhoto);
        r.put("createdAt", p.createdAt);
        return r;
    }

    public static Map<String, Object> appointment(Appointment a) {
        Map<String, Object> r = map();
        r.put("id", a.id);
        r.put("patientId", a.patient.id);
        r.put("doctorId", a.doctor == null ? null : a.doctor.id);
        r.put("treatmentId", a.treatment == null ? null : a.treatment.id);
        r.put("appointmentDate", a.appointmentDate);
        r.put("appointmentTime", a.appointmentTime);
        r.put("duration", a.duration);
        r.put("note", a.note);
        r.put("status", a.status);
        r.put("appointmentStatus", a.status);
        r.put("Patient", patientRef(a.patient));
        r.put("Doctor", doctorRef(a.doctor));
        r.put("Treatment", treatment(a.treatment));
        r.put("createdAt", a.createdAt);
        return r;
    }

    public static Map<String, Object> opd(Opd o) {
        Map<String, Object> r = map();
        r.put("id", o.id);
        r.put("patientId", o.patient.id);
        r.put("doctorId", o.doctor == null ? null : o.doctor.id);
        r.put("statusId", o.status == null ? null : o.status.id);
        r.put("paymentTypeId", o.paymentBy == null ? null : o.paymentBy.id);
        r.put("treatmentId", o.treatment == null ? null : o.treatment.id);
        r.put("date", o.date);
        r.put("remark", o.remark);
        r.put("bloodPressure", o.bloodPressure);
        r.put("height", o.height);
        r.put("weight", o.weight);
        r.put("Patient", patientRef(o.patient));
        r.put("Doctor", doctorRef(o.doctor));
        r.put("Status", master(o.status));
        r.put("PaymentBy", master(o.paymentBy));
        r.put("Treatment", treatment(o.treatment));
        r.put("createdAt", o.createdAt);
        return r;
    }

    public static Map<String, Object> transaction(PaymentTransaction t) {
        Map<String, Object> r = map();
        r.put("id", t.id);
        r.put("patientId", t.patient == null ? null : t.patient.id);
        r.put("paymentById", t.paymentBy == null ? null : t.paymentBy.id);
        r.put("paymentType", t.paymentType);
        r.put("paymentCategory", t.paymentCategory);
        r.put("amount", t.amount);
        r.put("paymentDateTime", t.paymentDateTime);
        r.put("remark", t.remark);
        r.put("Patient", patientRef(t.patient));
        r.put("PaymentBy", master(t.paymentBy));
        r.put("createdAt", t.createdAt);
        return r;
    }
}
