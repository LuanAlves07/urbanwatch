-- =====================================================
-- UrbanWatch Indexes
-- Índices para otimização de consultas
-- =====================================================

CREATE INDEX idx_calls_user
ON calls(user_id);

CREATE INDEX idx_call_history_call
ON call_history(call_id);

CREATE INDEX idx_call_images_call
ON call_images(call_id);

CREATE INDEX idx_comments_call
ON comments(call_id);

CREATE INDEX idx_comments_user
ON comments(user_id);

CREATE INDEX idx_call_reviews_call
ON call_reviews(call_id);

CREATE INDEX idx_call_reviews_user
ON call_reviews(user_id);

CREATE INDEX idx_review_images_review
ON review_images(review_id);
