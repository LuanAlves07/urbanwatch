# UrbanWatch Database

## Visão Geral

O UrbanWatch é uma plataforma para registro e acompanhamento de denúncias urbanas realizadas pelos cidadãos.

O banco de dados foi desenvolvido utilizando PostgreSQL e integrado ao Spring Boot através do Hibernate/JPA.

---

## Tecnologias

* PostgreSQL 13+
* Spring Boot 3
* Hibernate/JPA
* Maven
* Java 21

---

## Estrutura das Tabelas

### users

Armazena os usuários do sistema.

Campos principais:

* id
* name
* email
* password
* role
* created_at

---

### calls

Armazena os chamados/denúncias criados pelos cidadãos.

Campos principais:

* title
* description
* status
* latitude
* longitude
* sla_level
* prefeitura_observation

Relacionamento:

* Muitos chamados pertencem a um usuário.

---

### call_history

Armazena o histórico de mudanças de status dos chamados.

Exemplo:

* PENDENTE → RECEBIDO
* RECEBIDO → EM_EXECUCAO
* EM_EXECUCAO → FINALIZADO

---

### call_images

Armazena imagens anexadas aos chamados.

---

### comments

Armazena comentários realizados em chamados.

---

### call_reviews

Armazena avaliações feitas pelos cidadãos após a conclusão de um chamado.

---

### review_images

Armazena imagens anexadas às avaliações.

---

## Relacionamentos

users (1) -------- (N) calls

calls (1) -------- (N) call_history

calls (1) -------- (N) call_images

calls (1) -------- (N) comments

users (1) -------- (N) comments

calls (1) -------- (N) call_reviews

users (1) -------- (N) call_reviews

call_reviews (1) -------- (N) review_images

---

## Índices

Foram adicionados índices para otimizar consultas realizadas pelas APIs REST do sistema.

Principais índices:

* idx_calls_user
* idx_call_history_call
* idx_call_images_call
* idx_comments_call
* idx_comments_user
* idx_call_reviews_call
* idx_call_reviews_user
* idx_review_images_review

---

## Integração com Spring Boot

A integração é realizada através das entidades JPA localizadas em:

src/main/java/com/urbanwatch/entity

A criação automática das tabelas é feita pelo Hibernate através da configuração:

spring.jpa.hibernate.ddl-auto=update

---

## Porta da Aplicação

http://localhost:8080

## Swagger

http://localhost:8080/swagger-ui/index.html
