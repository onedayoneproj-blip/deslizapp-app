#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
catalogo_container="deslizapp-replay-catalogo-$$"
trap 'docker rm -f "$catalogo_container" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$catalogo_container" -e POSTGRES_DB=replay_provisional -e POSTGRES_PASSWORD=solo_prueba_desechable postgres:17.6-alpine >/dev/null
for intento in {1..40}; do
 if docker exec "$catalogo_container" psql -h 127.0.0.1 -U postgres -d replay_provisional -c "select 1" >/dev/null 2>&1; then break; fi
 sleep .2
done
psql_local(){ docker exec -i "$catalogo_container" psql -U postgres -d replay_provisional -v ON_ERROR_STOP=1 "$@"; }
psql_local < scripts/preparar-replay-inventario.sql >/dev/null
for archivo in supabase/migrations/*.sql; do psql_local < "$archivo" >/dev/null; done
psql_local < scripts/probar-catalogo-react-db.sql
