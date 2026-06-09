-- =====================================================
-- UrbanWatch — Dados de demonstracao (seed)
-- Adaptado ao schema real (colunas em ingles, role/created_at, senha BCrypt).
-- Substitui o antigo insert.sql.
--
-- Pre-requisito: tabelas ja criadas (pelo Hibernate ddl-auto=update ao subir o
-- app, ou via database/schema.sql + indexes.sql). Recomendado em banco limpo.
--
-- Senha de TODOS os usuarios de demo: demo1234  (hash BCrypt abaixo).
-- =====================================================

-- ---------- Usuarios ----------
INSERT INTO users (name, email, password, role, created_at) VALUES
('Maria Souza',        'maria@demo.com',      '$2a$10$dlbP78sB9UwmDOwT.dUZQO2OW5aje3ErD6dVDf2vbd1zqXAgb45VC', 'CITIZEN',   NOW()),
('João Pereira',       'joao@demo.com',       '$2a$10$dlbP78sB9UwmDOwT.dUZQO2OW5aje3ErD6dVDf2vbd1zqXAgb45VC', 'CITIZEN',   NOW()),
('Prefeitura Central', 'prefeitura@demo.com', '$2a$10$dlbP78sB9UwmDOwT.dUZQO2OW5aje3ErD6dVDf2vbd1zqXAgb45VC', 'CITY_HALL', NOW()),
('Admin Sistema',      'admin@demo.com',      '$2a$10$dlbP78sB9UwmDOwT.dUZQO2OW5aje3ErD6dVDf2vbd1zqXAgb45VC', 'ADMIN',     NOW())
ON CONFLICT (email) DO NOTHING;

-- ---------- Chamados ----------
INSERT INTO calls (title, description, status, latitude, longitude, sla_level, paused, prefeitura_observation, created_at, updated_at, paused_at, user_id) VALUES
('Buraco na Av. Brasil',        'Buraco grande próximo ao número 1200, risco para motociclistas.', 'PENDENTE',    -20.819, -49.379, 'NORMAL',  false, NULL,                         NOW(), NULL,  NULL,  (SELECT id FROM users WHERE email='maria@demo.com')),
('Lâmpada queimada na praça',   'Poste sem iluminação na praça central há três dias.',             'RECEBIDO',    -20.820, -49.380, 'ATENCAO', false, 'Equipe de iluminação acionada.', NOW(), NOW(), NULL, (SELECT id FROM users WHERE email='joao@demo.com')),
('Coleta de lixo atrasada',     'Caminhão não passou no bairro nesta semana.',                     'EM_EXECUCAO', -20.821, -49.381, 'CRITICO', false, 'Roteiro de coleta em correção.', NOW(), NOW(), NULL, (SELECT id FROM users WHERE email='maria@demo.com')),
('Calçada danificada',          'Calçada quebrada dificultando acessibilidade.',                   'FINALIZADO',  -20.818, -49.378, 'NORMAL',  false, 'Reparo concluído pela equipe.',  NOW(), NOW(), NULL, (SELECT id FROM users WHERE email='joao@demo.com'));

-- ---------- Historico de status (do chamado finalizado) ----------
INSERT INTO call_history (call_id, status_anterior, status_novo, observacao, data_alteracao) VALUES
((SELECT id FROM calls WHERE title='Calçada danificada' ORDER BY id DESC LIMIT 1), 'PENDENTE',    'RECEBIDO',    'Chamado recebido pela prefeitura.', NOW()),
((SELECT id FROM calls WHERE title='Calçada danificada' ORDER BY id DESC LIMIT 1), 'RECEBIDO',    'EM_EXECUCAO', 'Equipe enviada ao local.',          NOW()),
((SELECT id FROM calls WHERE title='Calçada danificada' ORDER BY id DESC LIMIT 1), 'EM_EXECUCAO', 'FINALIZADO',  'Serviço concluído.',                NOW());

-- ---------- Comentarios ----------
INSERT INTO comments (content, created_at, call_id, user_id) VALUES
('Passo por aqui todo dia, obrigado por registrarem!', NOW(), (SELECT id FROM calls WHERE title='Buraco na Av. Brasil'    ORDER BY id DESC LIMIT 1), (SELECT id FROM users WHERE email='joao@demo.com')),
('A situação está piorando, precisa de atenção.',      NOW(), (SELECT id FROM calls WHERE title='Coleta de lixo atrasada' ORDER BY id DESC LIMIT 1), (SELECT id FROM users WHERE email='maria@demo.com'));

-- ---------- Avaliacao (apenas chamado FINALIZADO) ----------
INSERT INTO call_reviews (rating, comment, created_at, call_id, user_id) VALUES
(5, 'Atendimento rápido e eficiente, parabéns!', NOW(), (SELECT id FROM calls WHERE title='Calçada danificada' ORDER BY id DESC LIMIT 1), (SELECT id FROM users WHERE email='joao@demo.com'));

-- ---------- Votos (likes / dislikes) ----------
INSERT INTO votes (value, created_at, call_id, user_id) VALUES
(true,  NOW(), (SELECT id FROM calls WHERE title='Buraco na Av. Brasil'    ORDER BY id DESC LIMIT 1), (SELECT id FROM users WHERE email='joao@demo.com')),
(true,  NOW(), (SELECT id FROM calls WHERE title='Buraco na Av. Brasil'    ORDER BY id DESC LIMIT 1), (SELECT id FROM users WHERE email='maria@demo.com')),
(false, NOW(), (SELECT id FROM calls WHERE title='Coleta de lixo atrasada' ORDER BY id DESC LIMIT 1), (SELECT id FROM users WHERE email='joao@demo.com'));
