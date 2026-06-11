<div align="center">

# UrbanWatch

**Sistema de denúncias urbanas — registre problemas da cidade e acompanhe os chamados.**

[![Java](https://img.shields.io/badge/Java-21-007396?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.5-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Security](https://img.shields.io/badge/Auth-JWT%20%2B%20BCrypt-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](.github/workflows/ci.yml)

</div>

---

## Sobre o Projeto

O **UrbanWatch** é uma plataforma web que permite ao **cidadão registrar problemas
urbanos** — buracos em vias, falhas de iluminação pública, descarte irregular de
lixo, problemas de infraestrutura e outras ocorrências — e **acompanhar o
andamento** dos chamados abertos junto aos órgãos responsáveis (prefeitura).

A aplicação combina uma **API REST** (Spring Boot) com um **frontend web**
(Thymeleaf + JavaScript) que consome essa API, autenticação via **JWT**,
persistência em **PostgreSQL** e **geolocalização** com OpenStreetMap.

## Objetivo

Oferecer um canal simples e transparente entre **cidadãos** e **prefeitura** para:

- **Registrar** ocorrências urbanas com localização e imagens.
- **Acompanhar** o ciclo de vida do chamado (status, histórico, SLA).
- **Interagir** (comentários) e **avaliar** o atendimento prestado.
- Dar à prefeitura ferramentas de **gestão** (status, pausa, observações,
  escalonamento por SLA).

## Contexto Acadêmico

Projeto desenvolvido para a disciplina **Sistemas Distribuídos e Mobile**. Mais do
que um produto, serve como **evidência prática** dos conceitos da disciplina: o
sistema deve ser funcional e demonstrar, no código, os fundamentos de sistemas
distribuídos vistos em aula.

## Artigo

Artigo do projeto: [acessar no Google Drive](https://drive.google.com/drive/folders/1wKn_TQwGmNczZzcMTBWE4V7LP9mgQ8zt?usp=share_link).

## Conceitos de Sistemas Distribuídos Aplicados

| # | Conceito | Onde se manifesta no UrbanWatch |
|---|---|---|
| C1 | **Transparência** | O frontend consome a API REST sem conhecer detalhes do servidor/banco |
| C2 | **Middleware** | Filtros e interceptors do Spring, filtro JWT, camada JPA/Hibernate |
| C3 | **Protocolos HTTP** | Comunicação cliente↔API via REST sobre HTTP |
| C4 | **APIs** | API REST documentada com Swagger/OpenAPI |
| C5 | **Web Services** | Integração com serviço externo OpenStreetMap (geocodificação) |
| C6 | **Banco de Dados** | PostgreSQL acessado via JPA/Hibernate |
| C7 | **Serviços em Nuvem** | Aplicação containerizada (Docker) pronta para deploy em nuvem |
| C8 | **Arquitetura Cliente-Servidor** | Frontend Web ↔ API REST ↔ Banco |
| C9 | **Segurança Distribuída** | Spring Security + JWT + BCrypt + controle de permissões por perfil |

## Funcionalidades

**Autenticação e perfis**
- Cadastro e login de usuários (senha com BCrypt).
- Autenticação via JWT; controle de acesso por perfil: `CITIZEN`, `CITY_HALL`, `ADMIN`.

**Gestão de chamados**
- Criação, edição e listagem de chamados (com geolocalização).
- Ciclo de status com máquina de estados: `PENDENTE → RECEBIDO → EM_AVALIACAO →
  EM_DESLOCAMENTO → EM_EXECUCAO → FINALIZADO` (+ `PAUSADO`).
- Histórico de mudanças de status, pausa/retomada e observações da prefeitura.
- **SLA** com escalonamento automático (`NORMAL` / `ATENCAO` / `CRITICO`).

**Interação e avaliação**
- Comentários nos chamados.
- **Likes / Dislikes** nos chamados (um voto por usuário, com troca/remoção).
- Avaliação do atendimento (nota 0–5 + comentário + imagem), liberada após o
  chamado ser finalizado.

**Mídia e mapa**
- Upload de imagens em chamados e avaliações (com limite de tamanho).
- Visualização em mapa e busca de **chamados próximos** (OpenStreetMap / Leaflet).

**Documentação**
- API documentada e navegável via **Swagger UI**.

## Tecnologias Utilizadas

| Camada | Tecnologias |
|---|---|
| **Backend** | Java 21, Spring Boot 3.3.5 (Web, Security, Data JPA, Validation) |
| **Segurança** | Spring Security, JWT (JJWT 0.12.6), BCrypt |
| **Persistência** | PostgreSQL, JPA / Hibernate |
| **Frontend** | Thymeleaf, Bootstrap, JavaScript (fetch), Leaflet |
| **Integrações** | OpenStreetMap (geocodificação / mapa) |
| **Documentação** | springdoc-openapi (Swagger UI) 2.6.0 |
| **Build / DevOps** | Maven, Docker, GitHub Actions (CI) |
| **Produtividade** | Lombok, Spring DevTools |

## Arquitetura

Arquitetura **cliente-servidor** em camadas:

```
Usuário
   │
   ▼
Frontend Web  (Thymeleaf + Bootstrap + JS via fetch)
   │   HTTP / REST  (JWT no header Authorization)
   ▼
API REST  (Spring Boot 21)
   ├── Controller → Service → Repository
   ├── Spring Security + filtro JWT  (C2, C9)
   └── Swagger/OpenAPI               (C4)
   │   JPA / Hibernate
   ▼
PostgreSQL                            (C6)

Serviço externo: OpenStreetMap (geocodificação / mapa)  (C5)
```

O frontend Thymeleaf serve a "casca" HTML e **consome a própria API REST** via
`fetch`, renderizando os dados no cliente — reforçando a separação cliente-servidor
e a transparência de acesso.

## Estrutura de Pastas

```
urbanwatch/
├── .github/
│   ├── workflows/ci.yml            # CI: mvn clean test (JDK 21)
│   └── pull_request_template.md    # checklist de integração
├── database/
│   ├── schema.sql                  # DDL das tabelas
│   └── indexes.sql                 # índices
├── docs/contexto/                  # contexto, auditoria e planos (interno)
├── scripts/
│   └── smoke-test.sh               # smoke test E2E (curl)
├── src/main/java/com/urbanwatch/
│   ├── config/                     # SecurityConfig, OpenApiConfig
│   ├── controller/                 # endpoints REST + views (Thymeleaf)
│   ├── dto/                        # requests / responses
│   ├── entity/                     # entidades JPA + enums (CallStatus, SlaLevel, Role)
│   ├── exception/                  # exceções de domínio + GlobalExceptionHandler
│   ├── mapper/                     # mapeamento entidade ↔ DTO
│   ├── repository/                 # Spring Data JPA
│   ├── security/                   # JwtService, JwtAuthenticationFilter, UserDetailsService
│   ├── service/                    # regras de negócio
│   └── util/                       # constantes
├── src/main/resources/
│   ├── static/                     # css, js, imagens
│   ├── templates/                  # páginas Thymeleaf
│   └── application.properties
├── src/test/java/com/urbanwatch/   # testes (JUnit 5 + Mockito)
├── Dockerfile
└── pom.xml
```

## Banco de Dados

PostgreSQL. Em desenvolvimento o schema é gerado pelo Hibernate
(`ddl-auto=update`); os scripts em `database/` documentam a estrutura.

| Tabela | Descrição |
|---|---|
| `users` | Usuários, credenciais (hash) e perfil (`role`) |
| `calls` | Chamados/denúncias (status, SLA, localização, observação da prefeitura) |
| `call_history` | Histórico de transições de status do chamado |
| `call_images` | Imagens anexadas ao chamado (BYTEA) |
| `comments` | Comentários dos usuários nos chamados |
| `call_reviews` | Avaliações do atendimento (nota, comentário) — única por `(call_id, user_id)` |
| `review_images` | Imagens anexadas às avaliações (BYTEA) |

**Enums:** `CallStatus` (PENDENTE, RECEBIDO, EM_AVALIACAO, EM_DESLOCAMENTO,
EM_EXECUCAO, FINALIZADO, PAUSADO) · `SlaLevel` (NORMAL, ATENCAO, CRITICO) ·
`Role` (CITIZEN, CITY_HALL, ADMIN).

## Instalação

Pré-requisitos: **JDK 21**, **Maven** e **PostgreSQL** (ou Docker).

```bash
# clonar
git clone https://github.com/LuanAlves07/urbanwatch.git
cd urbanwatch

# banco via Docker (opcional)
docker run --name uw-postgres -e POSTGRES_DB=urbanwatch \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 -d postgres:16

# build
mvn clean package
```

## Configuração

Credenciais e segredos são lidos de **variáveis de ambiente** — nada sensível fica
no repositório.

| Variável | Obrigatória | Default (dev) |
|---|---|---|
| `JWT_SECRET` | **Sim** (sem fallback) | — |
| `DB_URL` | Não | `jdbc:postgresql://localhost:5432/urbanwatch` |
| `DB_USER` | Não | `postgres` |
| `DB_PASSWORD` | Não | `postgres` |
| `JWT_EXPIRATION_MS` | Não | `86400000` (24h) |

> ⚠️ Sem `JWT_SECRET` a aplicação **não inicia** (falha de resolução de placeholder
> no startup). Gere um segredo forte: `openssl rand -base64 48`.

## Execução

```bash
# segredo obrigatório
export JWT_SECRET="$(openssl rand -base64 48)"

# subir a aplicação
mvn spring-boot:run
```

- Aplicação: <http://localhost:8080/>
- Swagger UI: <http://localhost:8080/swagger-ui.html>

**Via Docker:**

```bash
docker build -t urbanwatch .
docker run -p 8080:8080 \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e DB_URL=jdbc:postgresql://host.docker.internal:5432/urbanwatch \
  urbanwatch
```

**Testes:**

```bash
mvn clean test                 # JUnit 5 + Mockito (JDK 21)
./scripts/smoke-test.sh        # smoke test E2E (app no ar + PostgreSQL)
```

> Em JDK 24, os testes exigem `-DargLine="-Dnet.bytebuddy.experimental=true"`.
> A CI usa JDK 21.

## Fluxo Git da Equipe

```
feature/<modulo>-<dev>  ──►  develop  ──►  (testes integrados)  ──►  main (release)
```

- Cada módulo é desenvolvido em sua **branch individual** a partir de `develop`.
- Integração em `develop` **somente via Pull Request** (CI `build-test` verde + 1
  aprovação). `develop` e `main` são **branches protegidas**.
- O release para `main` ocorre após os testes integrados, com **tag de versão**.
- Detalhes, riscos e resolução de conflitos: [`docs/contexto/13-plano-integracao.md`](docs/contexto/13-plano-integracao.md).

## Integrantes

| Nome | RA | GitHub |
|---|---|---|
| Luan Matheus Santos Alves | 824219029 | [@LuanAlves07](https://github.com/LuanAlves07) |
| Samuel Bispo Sampaio | 824218589 | — |
| Victor Moreira Cruz | 12525220499 | — |
| Matheus Queiroz de Araújo | 12525131483 | — |
| Roberto Junnyo Wenceslau Ribeiro | 1242022776 | — |
| Guilherme Lima Macário | 1352423478 | — |
| Gabrielle Aparecida Félix dos Santos | 12524239827 | — |
| Nathan de Souza Luchesi | 942515703 | — |
| Adriano Henrique Xavier Rodrigues | 325224607 | — |
| Raul Carneiro Torres Menezes | 12524236526 | — |
| Gabriel Lima Rodrigues | 1292114741 | — |

## Capturas de Tela

> _Adicione as imagens em `docs/screenshots/` e referencie abaixo._

| Tela | Preview |
|---|---|
| Home / mapa | `![Home](docs/screenshots/home.png)` |
| Login / cadastro | `![Login](docs/screenshots/login.png)` |
| Detalhe do chamado | `![Chamado](docs/screenshots/chamado.png)` |
| Painel da prefeitura | `![Prefeitura](docs/screenshots/prefeitura.png)` |

## Roadmap

- [x] Autenticação (JWT) e perfis de usuário
- [x] CRUD de chamados + histórico de status
- [x] SLA com escalonamento automático
- [x] Comentários e avaliações (com imagem)
- [x] Geolocalização e mapa (OpenStreetMap)
- [x] Documentação Swagger/OpenAPI
- [x] CI (GitHub Actions) + cobertura de testes inicial
- [x] Likes / Dislikes nos chamados
- [x] Testes integrados E2E com PostgreSQL
- [x] Merge `develop → main` + tag `v1.0.0`
- [ ] Deploy em nuvem

## Melhorias Futuras

- **Recuperação de senha** ("esqueci minha senha").
- **Paginação com metadados** no frontend (hoje usa array com teto de segurança).
- **Notificações** (e-mail / push) de mudança de status.
- **Cobertura de testes** rumo a 80%+ (incl. testes de integração com Testcontainers).
- **Observabilidade**: logs estruturados e métricas.
- **Armazenamento de mídia** externo (object storage) em vez de BYTEA.

## Licença

Distribuído sob a licença **MIT** — veja o arquivo [`LICENSE`](LICENSE).
Projeto acadêmico, desenvolvido para a disciplina de Sistemas Distribuídos e Mobile.

## Histórico de Versões

| Versão | Marco |
|---|---|
| `0.1.0` | Base de autenticação e segurança (Spring Security + JWT) |
| `0.2.0` | Core de chamados (CRUD, status, histórico, SLA, prefeitura) |
| `0.3.0` | Geolocalização e integração OpenStreetMap; comentários, avaliações e imagens |
| `0.4.0` | Auditoria técnica: correções de segurança, CI, testes, README e padronização |
| `1.0.0` | _(planejado)_ Release na `main` após testes integrados |

---

<div align="center">
Feito para a disciplina de <strong>Sistemas Distribuídos e Mobile</strong>.
</div>
