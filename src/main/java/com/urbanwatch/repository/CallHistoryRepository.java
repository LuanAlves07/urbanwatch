package com.urbanwatch.repository;

import com.urbanwatch.entity.CallHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CallHistoryRepository extends JpaRepository<CallHistory, Long> {

    List<CallHistory> findByCallIdOrderByDataAlteracaoDesc(Long callId);
}
