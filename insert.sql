
-- Inserindo cidadãos
INSERT INTO users (nome, email, senha)
VALUES 
('Maria Souza', 'maria@email.com', 'senha123'),
('João Pereira', 'joao@email.com', 'abc123');

-- Inserindo chamados
INSERT INTO calls (
    title, description, status, latitude, longitude, sla_level,
    paused, prefeitura_observation, created_at, updated_at, paused_at, user_id
)
VALUES
('Buraco na rua', 'Buraco grande na Av. Brasil', 'PENDENTE',
 -20.819, -49.379, 'NORMAL',
 false, NULL, NOW(), NULL, NULL, 1),

('Lâmpada queimada', 'Poste sem iluminação na praça central', 'RECEBIDO',
 -20.820, -49.380, 'ATENCAO',
 false, 'Será verificado pela equipe', NOW(), NULL, NULL, 5),

('Coleta de lixo atrasada', 'Caminhão não passou no bairro ontem', 'EM_AVALIACAO',
 -20.821, -49.381, 'CRITICO'
 true, 'Serviço pausado por manutenção', NOW(), NULL, NOW(), 6);

 --Inserindo status dos chamados
 INSERT INTO call_history (
    call_id, status_anterior, status_novo, observacao, data_alteracao
)
VALUES
(5, 'PENDENTE', 'RECEBIDO', 'Chamado recebido pela equipe da prefeitura', NOW()),
(5, 'RECEBIDO', 'EM_AVALIACAO', 'Equipe técnica iniciou avaliação', NOW()),
(5, 'EM_AVALIACAO', 'EM_EXECUCAO', 'Serviço em andamento', NOW());

--inserindo imagens dos chamados
INSERT INTO call_images (
    file_name, content_type, data, created_at, call_id
)
VALUES (
    'teste.png',
    'image/png',
    decode('DEADBEEF', 'hex'),
    NOW(),
    6
);

--inserindo comentários
INSERT INTO comments (
    content, created_at, call_id, user_id
)
VALUES
('Esse buraco está atrapalhando muito o trânsito', NOW(), 4, 1),
('A lâmpada queimada deixa a praça perigosa à noite', NOW(), 5, 5),
('O lixo acumulado está causando mau cheiro', NOW(), 6, 6);

--Inserindo reações
INSERT INTO votes (
    vote_type, created_at, user_id, comment_id
)
VALUES
('LIKE', NOW(), 1, 4),
('DISLIKE', NOW(), 5, 5),
('LIKE', NOW(), 6, 6);

--Inserindo avaliações
INSERT INTO call_reviews (
    rating, comment, created_at, call_id, user_id
)
VALUES
(5, 'Atendimento rápido e eficiente', NOW(), 4, 1),
(3, 'Demorou um pouco, mas resolveram', NOW(), 5, 5),
(1, 'Serviço não foi concluído', NOW(), 6, 6);

--Inserindo imagens associadas às avaliações dos chamados
INSERT INTO review_images (
    file_name, content_type, data, created_at, review_id
)
VALUES (
    'avaliacao_teste.png',
    'image/png',
    decode('DEADBEEF', 'hex'),
    NOW(),
    1
);
