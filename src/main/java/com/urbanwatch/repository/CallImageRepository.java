package com.urbanwatch.repository;

import com.urbanwatch.entity.CallImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CallImageRepository extends JpaRepository<CallImage, Long> {

    List<CallImage> findByCallIdOrderByCreatedAtDesc(Long callId);
}