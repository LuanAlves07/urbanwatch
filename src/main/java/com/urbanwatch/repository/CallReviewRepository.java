package com.urbanwatch.repository;

import com.urbanwatch.entity.CallReview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CallReviewRepository extends JpaRepository<CallReview, Long> {

    Optional<CallReview> findByCallId(Long callId);

    boolean existsByCallIdAndUserId(Long callId, Long userId);
}