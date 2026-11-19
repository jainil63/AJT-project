package com.swaminarayan.clinic.config;

import com.swaminarayan.clinic.entity.*;
import com.swaminarayan.clinic.repository.MasterItemRepository;
import com.swaminarayan.clinic.repository.TreatmentRepository;
import com.swaminarayan.clinic.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Creates the default admin and starter master data on first start. Safe to run repeatedly. */
@Component
public class DataInitializer implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository users;
    private final MasterItemRepository masters;
    private final TreatmentRepository treatments;
    private final PasswordEncoder encoder;

    @Value("${app.seed.admin-username}") private String adminUsername;
    @Value("${app.seed.admin-email}") private String adminEmail;
    @Value("${app.seed.admin-password}") private String adminPassword;
    @Value("${app.seed.master-data}") private boolean seedMasters;

    public DataInitializer(UserRepository users, MasterItemRepository masters,
                           TreatmentRepository treatments, PasswordEncoder encoder) {
        this.users = users;
        this.masters = masters;
        this.treatments = treatments;
        this.encoder = encoder;
    }

    @Override
    public void run(String... args) {
        if (!users.existsByUsernameIgnoreCase(adminUsername)) {
            User u = new User();
            u.fullName = "Clinic Admin";
            u.username = adminUsername;
            u.email = adminEmail;
            u.employeeCode = "ADMIN001";
            u.designation = "Administrator";
            u.userType = "Admin";
            u.superAdmin = true;
            u.passwordHash = encoder.encode(adminPassword);
            users.save(u);
            log.info("Default admin created: username '{}'", adminUsername);
        }

        if (!seedMasters) return;
        Map<MasterType, List<String>> defaults = Map.of(
                MasterType.PAYMENT_BY, List.of("Cash", "UPI", "Card", "Net Banking"),
                MasterType.OPD_STATUS, List.of("Consulted", "Treatment Started", "Treatment Completed", "Follow-up Required"),
                MasterType.SPECIALTY, List.of("General Dentistry", "Orthodontics", "Endodontics", "Oral Surgery", "Pedodontics"),
                MasterType.DESIGNATION, List.of("Administrator", "Receptionist", "Dental Assistant", "Accountant"),
                MasterType.MEDICAL_ALERT, List.of("Diabetes", "Hypertension", "Heart Disease", "Allergy to Penicillin", "Pregnancy"),
                MasterType.DOCUMENT_TYPE, List.of("ID Proof", "X-Ray", "Consent Form", "Prescription"));
        defaults.forEach((type, names) -> names.forEach(n -> {
            if (masters.findByTypeAndTextIgnoreCase(type, n).isEmpty()) {
                MasterItem m = new MasterItem();
                m.type = type;
                m.text = n;
                masters.save(m);
            }
        }));

        if (treatments.count() == 0) {
            Object[][] t = {{"Consultation", 300}, {"Scaling & Polishing", 1200}, {"Tooth Extraction", 800},
                    {"Root Canal Treatment", 5000}, {"Composite Filling", 1500}, {"Dental Crown", 6000}};
            for (Object[] row : t) {
                Treatment tr = new Treatment();
                tr.text = (String) row[0];
                tr.pricePerUnit = BigDecimal.valueOf((Integer) row[1]);
                tr.dayCount = 1;
                treatments.save(tr);
            }
        }
        log.info("Starter master data checked/created");
    }
}
