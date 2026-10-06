#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PANEL_REPLAY_CONTAINER="deslizapp-panel-replay-$$"
trap 'docker rm -f "$PANEL_REPLAY_CONTAINER" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$PANEL_REPLAY_CONTAINER" -e POSTGRES_DB=replay_provisional -e POSTGRES_PASSWORD=solo_prueba_desechable postgres:17.6-alpine >/dev/null
for intento in {1..40}; do
  if docker exec "$PANEL_REPLAY_CONTAINER" psql -U postgres -d replay_provisional -c 'select 1' >/dev/null 2>&1; then break; fi
  sleep .2
done
psql_local(){ docker exec -i "$PANEL_REPLAY_CONTAINER" psql -U postgres -d replay_provisional -v ON_ERROR_STOP=1 "$@"; }
psql_local < scripts/preparar-replay-inventario.sql >/dev/null
for archivo in supabase/migrations/*.sql; do psql_local --single-transaction < "$archivo" >/dev/null; done
psql_local < scripts/probar-eliminar-producto-db.sql
python3 scripts/probar-eliminar-producto-concurrencia.py
psql_local < scripts/probar-catalogo-react-db.sql
psql_local < scripts/probar-pedido-catalogo-panel-db.sql
python3 scripts/probar-pedido-catalogo-concurrencia.py
psql_local < scripts/probar-pedido-catalogo-disponibilidad-db.sql
