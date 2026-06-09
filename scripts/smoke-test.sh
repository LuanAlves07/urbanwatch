#!/usr/bin/env bash
# =====================================================
# UrbanWatch — smoke test E2E (requer o app no ar + PostgreSQL)
# Valida o checklist da auditoria: registro/login, escalonamento de
# privilegio (C1), 404/403/409/413.
#
# Uso:
#   export JWT_SECRET="$(openssl rand -base64 48)"   # antes de subir o app
#   mvn spring-boot:run                              # em outro terminal
#   ./scripts/smoke-test.sh                          # BASE_URL opcional
# =====================================================
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
PASS=0; FAIL=0
TS=$(date +%s 2>/dev/null || echo 0)
EMAIL="smoke_${TS}@x.com"
PASSWORD="secret123"

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

# status_of METHOD PATH [data] [auth-header]
status_of() {
  local method="$1" path="$2" data="${3:-}" auth="${4:-}"
  local args=(-s -o /dev/null -w '%{http_code}' -X "$method" "$BASE_URL$path"
              -H 'Content-Type: application/json')
  [ -n "$auth" ] && args+=(-H "Authorization: Bearer $auth")
  [ -n "$data" ] && args+=(-d "$data")
  curl "${args[@]}"
}

echo "== UrbanWatch smoke test ($BASE_URL) =="

# 1) Registro com role:ADMIN deve ser IGNORADO -> usuario vira CITIZEN (C1)
REG_BODY="{\"name\":\"Smoke\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"ADMIN\"}"
REG_JSON=$(curl -s -X POST "$BASE_URL/auth/register" -H 'Content-Type: application/json' -d "$REG_BODY")
echo "$REG_JSON" | grep -q '"role":"CITIZEN"' \
  && ok "C1: registro ignora role=ADMIN e cria CITIZEN" \
  || bad "C1: esperado role CITIZEN no registro. Resposta: $REG_JSON"

# 2) Login -> captura token
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$TOKEN" ] && ok "login retorna token JWT" || bad "login nao retornou token"

# 3) Criar chamado (autenticado) -> 201
CALL_BODY='{"title":"Buraco na via","description":"Buraco grande","latitude":-23.5,"longitude":-46.6}'
CODE=$(status_of POST /calls "$CALL_BODY" "$TOKEN")
[ "$CODE" = "201" ] && ok "POST /calls autenticado -> 201" || bad "POST /calls -> $CODE (esperado 201)"

# 4) Buscar chamado inexistente -> 404 (H5)
CODE=$(status_of GET /calls/999999 "" "")
[ "$CODE" = "404" ] && ok "H5: GET /calls/999999 -> 404" || bad "H5: GET inexistente -> $CODE (esperado 404)"

# 5) Criar sem token -> 401/403
CODE=$(status_of POST /calls "$CALL_BODY" "")
{ [ "$CODE" = "401" ] || [ "$CODE" = "403" ]; } \
  && ok "POST /calls sem token -> $CODE" || bad "POST sem token -> $CODE (esperado 401/403)"

echo "== Resultado: $PASS ok, $FAIL falhas =="
echo "Observacao: 403 de ownership (H1), 409 de transicao (H4) e 413 de upload (H3)"
echo "exigem dados/arquivos especificos; valide-os manualmente conforme o checklist do PR."
[ "$FAIL" -eq 0 ]
