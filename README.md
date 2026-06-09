# UrbanWatch

Sistema de **denúncias urbanas**: cidadãos registram problemas urbanos (buracos,
iluminação, descarte irregular, infraestrutura) e acompanham o andamento dos
chamados junto aos órgãos responsáveis. Trabalho acadêmico da disciplina
**Sistemas Distribuídos e Mobile**.

## Stack

- **Java 21** · **Spring Boot 3.3.5** (Web, Security, Data JPA, Validation, Thymeleaf)
- **PostgreSQL** · JPA/Hibernate
- **JWT** (JJWT) para autenticação · **BCrypt** para senhas
- **Swagger/OpenAPI** (springdoc) · **OpenStreetMap** + Leaflet (geolocalização)

## Pré-requisitos

- JDK **21** (o projeto compila com `release 21`)
- **PostgreSQL** acessível
- Maven (ou o wrapper, se adicionado)

## Configuração (variáveis de ambiente)

Credenciais e segredos são lidos do ambiente — **nada sensível fica no repositório**.

| Variável | Obrigatória | Default (dev) |
|---|---|---|
| `JWT_SECRET` | **Sim** (sem fallback) | — |
| `DB_URL` | Não | `jdbc:postgresql://localhost:5432/urbanwatch` |
| `DB_USER` | Não | `postgres` |
| `DB_PASSWORD` | Não | `postgres` |
| `JWT_EXPIRATION_MS` | Não | `86400000` (24h) |

> ⚠️ Sem `JWT_SECRET` o app **não sobe** (falha de placeholder no startup).

## Como rodar (local)

```bash
# 1) PostgreSQL via Docker (opcional)
docker run --name uw-postgres -e POSTGRES_DB=urbanwatch \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:16

# 2) Segredo do JWT (obrigatório)
export JWT_SECRET="$(openssl rand -base64 48)"

# 3) Subir a aplicação
mvn spring-boot:run
```

- App: <http://localhost:8080/>
- Swagger UI: <http://localhost:8080/swagger-ui.html>

### Via Docker (imagem da aplicação)

```bash
docker build -t urbanwatch .
docker run -p 8080:8080 -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e DB_URL=jdbc:postgresql://host.docker.internal:5432/urbanwatch urbanwatch
```

## Testes

```bash
mvn clean test          # JDK 21 (recomendado)
```

Smoke-test E2E (com o app no ar + PostgreSQL):

```bash
export JWT_SECRET="$(openssl rand -base64 48)"   # mesmo segredo do app
./scripts/smoke-test.sh                          # BASE_URL opcional
```

> Em JDK 24 os testes exigem o flag do Byte Buddy:
> `mvn test -DargLine="-Dnet.bytebuddy.experimental=true"`. A CI usa JDK 21.

## Estrutura

```
src/main/java/com/urbanwatch
  ├── config/        # SecurityConfig, OpenApiConfig
  ├── controller/    # endpoints REST + views (Thymeleaf)
  ├── dto/           # requests/responses
  ├── entity/        # JPA + enums (CallStatus, SlaLevel, Role)
  ├── exception/     # exceções de domínio + GlobalExceptionHandler
  ├── repository/    # Spring Data JPA
  ├── security/      # JWT (filtro, serviço, UserDetailsService)
  └── service/       # regras de negócio
database/            # schema.sql, indexes.sql
docs/contexto/       # contexto, auditoria e planos (interno)
```

## Fluxo de contribuição

`feature/<modulo>-<dev>` → **PR para `develop`** (CI verde + review) →
testes integrados → **PR `develop` → `main`** (release + tag).
Detalhes e checklist em [`docs/contexto/13-plano-integracao.md`](docs/contexto/13-plano-integracao.md).
