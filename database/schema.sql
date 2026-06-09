-- =====================================================
-- UrbanWatch Database Schema
-- PostgreSQL 13+
-- Gerado a partir das entidades JPA
-- =====================================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (
        role IN ('CITIZEN', 'CITY_HALL', 'ADMIN')
    ),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE calls (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (
        status IN (
            'PENDENTE',
            'RECEBIDO',
            'EM_AVALIACAO',
            'EM_DESLOCAMENTO',
            'EM_EXECUCAO',
            'FINALIZADO',
            'PAUSADO'
        )
    ),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    sla_level VARCHAR(20) NOT NULL CHECK (
        sla_level IN ('NORMAL', 'ATENCAO', 'CRITICO')
    ),
    paused BOOLEAN NOT NULL,
    prefeitura_observation TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    paused_at TIMESTAMP,
    user_id BIGINT NOT NULL,
    CONSTRAINT fk_calls_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);

CREATE TABLE call_history (
    id BIGSERIAL PRIMARY KEY,
    call_id BIGINT NOT NULL,
    status_anterior VARCHAR(30) CHECK (
        status_anterior IN (
            'PENDENTE',
            'RECEBIDO',
            'EM_AVALIACAO',
            'EM_DESLOCAMENTO',
            'EM_EXECUCAO',
            'FINALIZADO',
            'PAUSADO'
        )
    ),
    status_novo VARCHAR(30) NOT NULL CHECK (
        status_novo IN (
            'PENDENTE',
            'RECEBIDO',
            'EM_AVALIACAO',
            'EM_DESLOCAMENTO',
            'EM_EXECUCAO',
            'FINALIZADO',
            'PAUSADO'
        )
    ),
    observacao TEXT,
    data_alteracao TIMESTAMP NOT NULL,
    CONSTRAINT fk_call_history_call
        FOREIGN KEY (call_id)
        REFERENCES calls(id)
);

CREATE TABLE call_images (
    id BIGSERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    data BYTEA NOT NULL,
    created_at TIMESTAMP NOT NULL,
    call_id BIGINT NOT NULL,
    CONSTRAINT fk_call_images_call
        FOREIGN KEY (call_id)
        REFERENCES calls(id)
);

CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    call_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    CONSTRAINT fk_comments_call
        FOREIGN KEY (call_id)
        REFERENCES calls(id),
    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);

CREATE TABLE call_reviews (
    id BIGSERIAL PRIMARY KEY,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL,
    call_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    CONSTRAINT fk_call_reviews_call
        FOREIGN KEY (call_id)
        REFERENCES calls(id),
    CONSTRAINT fk_call_reviews_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),
    CONSTRAINT uk_call_reviews_call_user
        UNIQUE (call_id, user_id)
);

CREATE TABLE review_images (
    id BIGSERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    data BYTEA NOT NULL,
    created_at TIMESTAMP NOT NULL,
    review_id BIGINT NOT NULL,
    CONSTRAINT fk_review_images_review
        FOREIGN KEY (review_id)
        REFERENCES call_reviews(id)
);

CREATE TABLE votes (
    id BIGSERIAL PRIMARY KEY,
    value BOOLEAN NOT NULL,            -- true = like, false = dislike
    created_at TIMESTAMP NOT NULL,
    call_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    CONSTRAINT fk_votes_call
        FOREIGN KEY (call_id)
        REFERENCES calls(id),
    CONSTRAINT fk_votes_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),
    CONSTRAINT uk_votes_call_user
        UNIQUE (call_id, user_id)
);
