package com.urbanwatch.repository;

import com.urbanwatch.entity.Call;
import com.urbanwatch.entity.CallStatus;
import com.urbanwatch.entity.SlaLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CallRepository extends JpaRepository<Call, Long> {

    List<Call> findByStatus(CallStatus status);

    List<Call> findBySlaLevel(SlaLevel slaLevel);

    List<Call> findByUserId(Long userId);

    List<Call> findByPausedTrue();

    List<Call> findByLatitudeNotNullAndLongitudeNotNull();
}
