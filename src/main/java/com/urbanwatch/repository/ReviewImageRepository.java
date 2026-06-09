package com.urbanwatch.repository;

import com.urbanwatch.entity.ReviewImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewImageRepository extends JpaRepository<ReviewImage, Long> {

    List<ReviewImage> findByReviewIdOrderByCreatedAtDesc(Long reviewId);
}