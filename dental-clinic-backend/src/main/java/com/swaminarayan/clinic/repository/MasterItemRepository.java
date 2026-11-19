package com.swaminarayan.clinic.repository;

import com.swaminarayan.clinic.entity.MasterItem;
import com.swaminarayan.clinic.entity.MasterType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MasterItemRepository extends JpaRepository<MasterItem, String> {
    List<MasterItem> findByTypeOrderByTextAsc(MasterType type);
    Optional<MasterItem> findByIdAndType(String id, MasterType type);
    Optional<MasterItem> findByTypeAndTextIgnoreCase(MasterType type, String text);
}
