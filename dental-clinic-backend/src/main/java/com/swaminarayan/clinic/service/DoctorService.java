package com.swaminarayan.clinic.service;

import com.swaminarayan.clinic.dto.Params;
import com.swaminarayan.clinic.dto.Views;
import com.swaminarayan.clinic.entity.Doctor;
import com.swaminarayan.clinic.entity.MasterType;
import com.swaminarayan.clinic.exception.ApiException;
import com.swaminarayan.clinic.repository.DoctorRepository;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class DoctorService {
    static final Pattern PHONE = Pattern.compile("^\\+?[0-9]{8,15}$");
    static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Set<String> TYPES = Set.of("Consultant", "Visiting", "Full Time");

    private final DoctorRepository repo;
    private final MasterService masters;
    private final FileStorageService files;
    private final PasswordEncoder encoder;

    public DoctorService(DoctorRepository repo, MasterService masters, FileStorageService files, PasswordEncoder encoder) {
        this.repo = repo;
        this.masters = masters;
        this.files = files;
        this.encoder = encoder;
    }

    public List<Map<String, Object>> list() {
        return repo.findAll(Sort.by("name")).stream().map(Views::doctor).toList();
    }

    @Transactional
    public Doctor create(Map<String, String> f, MultipartFile signature) {
        Doctor d = new Doctor();
        apply(d, f, signature, true);
        return repo.save(d);
    }

    @Transactional
    public Doctor update(String id, Map<String, String> f, MultipartFile signature) {
        Doctor d = repo.findById(id).orElseThrow(() -> ApiException.notFound("Doctor not found"));
        apply(d, f, signature, false);
        return repo.save(d);
    }

    @Transactional
    public void delete(String id) {
        Doctor d = repo.findById(id).orElseThrow(() -> ApiException.notFound("Doctor not found"));
        repo.delete(d);
        repo.flush();
    }

    private void apply(Doctor d, Map<String, String> f, MultipartFile signature, boolean create) {
        String name = Params.str(f, "name");
        if (name == null) throw ApiException.badRequest("Doctor name is required");
        if (name.length() > 150) throw ApiException.badRequest("Doctor name is too long");

        String mobile = clean(Params.str(f, "mobileNo"));
        String alt = clean(Params.str(f, "alternativeMobileNo"));
        if (mobile != null && !PHONE.matcher(mobile).matches()) throw ApiException.badRequest("Mobile number must be 8-15 digits");
        if (alt != null && !PHONE.matcher(alt).matches()) throw ApiException.badRequest("Alternative mobile number must be 8-15 digits");

        String email = Params.str(f, "email");
        if (email != null && !EMAIL.matcher(email).matches()) throw ApiException.badRequest("Please enter a valid email address");

        String type = Params.str(f, "doctorType");
        if (type != null && !TYPES.contains(type)) throw ApiException.badRequest("Invalid doctor type");

        String gender = Params.str(f, "gender");
        if (gender != null && !Set.of("Male", "Female", "Other").contains(gender)) throw ApiException.badRequest("Invalid gender");

        String password = Params.str(f, "password");
        if (password != null && !password.equals("********")) {
            if (password.length() < 6) throw ApiException.badRequest("Password must be at least 6 characters");
            d.passwordHash = encoder.encode(password);
        }

        d.name = name;
        d.gender = gender;
        d.mobileNo = mobile;
        d.alternativeMobileNo = alt;
        d.doctorType = type == null ? "Consultant" : type;
        d.accessPrescription = Params.bool(f, "accessPrescription");
        d.accessBilling = Params.bool(f, "accessBilling");
        d.accessPatients = Params.bool(f, "accessPatients");
        d.accessAppointments = Params.bool(f, "accessAppointments");
        d.email = email;
        d.description = Params.str(f, "description");
        d.googleProfileUrl = Params.str(f, "googleProfileUrl");
        d.colorCode = Params.str(f, "colorCode");
        d.specialty = masters.optional(MasterType.SPECIALTY, Params.str(f, "specialtyId"), "specialty");

        String stored = files.save(signature, "signatures", 2L * 1024 * 1024);
        if (stored != null) d.authorisedSignatory = stored;
    }

    static String clean(String s) {
        return s == null ? null : s.replaceAll("[\\s-]", "");
    }
}
