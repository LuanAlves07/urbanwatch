package com.urbanwatch.repository;

import com.urbanwatch.entity.Vote;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoteRepository extends JpaRepository<Vote, Long> {

    Optional<Vote> findByCallIdAndUserId(Long callId, Long userId);

    long countByCallIdAndValue(Long callId, boolean value);
}
