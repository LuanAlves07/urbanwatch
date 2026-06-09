<!-- Preencha e marque os itens. Detalhes em docs/contexto/13-plano-integracao.md -->

## O que muda
<!-- Resumo objetivo do que este PR entrega -->

## Tipo
- [ ] feat
- [ ] fix
- [ ] refactor
- [ ] test
- [ ] chore / docs

## Módulo / dependências
<!-- Qual módulo (auth, chamados, comentários, reviews, imagens, geo, frontend)?
     Depende de algum outro módulo já integrado? -->

## Checklist de integração segura
- [ ] Branch partiu de `develop` atualizado e foi sincronizada recentemente.
- [ ] `mvn clean test` verde localmente.
- [ ] Sem `target/`, segredos ou credenciais reais no diff.
- [ ] Rotas novas refletidas no `SecurityConfig`; tabelas novas no `schema.sql`.
- [ ] Hot files revisados com atenção (união correta, sem `ours/theirs` cego):
      `SecurityConfig`, `GlobalExceptionHandler`, `application.properties`, `pom.xml`, `schema.sql`.
- [ ] CI (build-test) verde e sem conflitos.

## Como testar
<!-- Passos para validar. Se exigir banco, cite o cenário do smoke-test. -->
