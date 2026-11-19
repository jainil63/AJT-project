package com.swaminarayan.clinic.repository;

import com.swaminarayan.clinic.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findFirstByUsernameIgnoreCaseOrEmailIgnoreCaseOrEmployeeCodeIgnoreCaseOrMobileNumber(
            String username, String email, String employeeCode, String mobileNumber);
    boolean existsByUsernameIgnoreCase(String username);
}
