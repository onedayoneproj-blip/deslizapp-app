#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export ADMIN_REPLAY_CONTAINER="deslizapp-admin-replay-$$"
trap 'docker rm -f "$ADMIN_REPLAY_CONTAINER" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$ADMIN_REPLAY_CONTAINER" -e POSTGRES_DB=replay_provisional -e POSTGRES_PASSWORD=solo_prueba_desechable postgres:17.6-alpine >/dev/null
for intento in {1..40}; do
  if docker exec "$ADMIN_REPLAY_CONTAINER" psql -U postgres -d replay_provisional -c 'select 1' >/dev/null 2>&1; then break; fi
  sleep .2
done
psql_local(){ docker exec -i "$ADMIN_REPLAY_CONTAINER" psql -U postgres -d replay_provisional -v ON_ERROR_STOP=1 "$@"; }
docker cp scripts/sql/admin-anular-pago-propuesta.sql "$ADMIN_REPLAY_CONTAINER:/tmp/admin-anular-pago-propuesta.sql"
psql_local < scripts/preparar-replay-inventario.sql >/dev/null
psql_local <<'SQL' >/dev/null
alter table storage.objects add column metadata jsonb default '{}'::jsonb;
alter table storage.objects enable row level security;
grant usage on schema auth, storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated;
SQL
for archivo in supabase/migrations/*.sql; do
  if [[ "$archivo" == *admin_anular_mensualidades_recalculo.sql ]]; then
    # Reproduce la función antigua y ensaya la propuesta ANTES de la migración nueva.
    psql_local < scripts/probar-admin-anulacion-limite.sql
  fi
  if [[ "$archivo" == *20261006012434* ]]; then
    psql_local -c 'create table public.admin_saldo_previo_replay as select id, creditos_retoque from public.tiendas' >/dev/null
  fi
  psql_local --single-transaction < "$archivo" >/dev/null
done
psql_local <<'SQL'
do $$ begin
 if exists(select 1 from public.admin_saldo_previo_replay b join public.tiendas t using(id) where b.creditos_retoque<>t.creditos_retoque or t.creditos_retoque<>coalesce((select sum(cantidad) from public.movimientos_creditos m where m.tienda_id=t.id),0)) then raise exception 'Saldo inicial distinto'; end if;
end $$;
SQL
psql_local < scripts/probar-admin-db.sql
psql_local < scripts/probar-admin-trabajo-db.sql
psql_local < scripts/probar-mi-marca-db.sql
python3 scripts/probar-mi-marca-concurrencia.py
psql_local < scripts/probar-ver-como-bloqueo-db.sql
psql_local < scripts/probar-permisos-db.sql
psql_local < scripts/probar-presentaciones-db.sql
psql_local < scripts/probar-ficha-db.sql
psql_local < scripts/probar-tipo-de-producto-db.sql
psql_local < scripts/probar-publicar-catalogo-db.sql
python3 scripts/probar-enlaces-concurrencia.py
node scripts/comparar-admin-reglas.mjs
node scripts/comparar-admin-mensualidades.mjs
psql_local < scripts/probar-admin-mensualidades-db.sql
python3 scripts/probar-admin-mensualidades-concurrencia.py
# Regresión de tablas compartidas, usando el mismo replay completo.
psql_local < scripts/probar-eliminar-producto-db.sql
psql_local < scripts/probar-catalogo-react-db.sql
psql_local < scripts/probar-pedido-catalogo-panel-db.sql
PANEL_REPLAY_CONTAINER="$ADMIN_REPLAY_CONTAINER" python3 scripts/probar-pedido-catalogo-concurrencia.py
psql_local < scripts/probar-pedido-catalogo-disponibilidad-db.sql
