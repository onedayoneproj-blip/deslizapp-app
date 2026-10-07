"""Solo replay. Dos conexiones reales abren el MISMO enlace a la vez: solo una lo reclama; la otra espera el bloqueo y recibe
enlace_no_valido (docs/prompts/colaboradores-e-invitaciones.md §7)."""
import os, subprocess, time
container = os.environ["ADMIN_REPLAY_CONTAINER"]
assert container.startswith("deslizapp-admin-replay-") and container.removeprefix("deslizapp-admin-replay-").isdigit()
cmd = ["docker", "exec", "-i", container, "psql", "-U", "postgres", "-d", "replay_provisional", "-v", "ON_ERROR_STOP=1", "-qAt"]
def run(sql):
    p = subprocess.run(cmd, input=sql, text=True, capture_output=True)
    assert p.returncode == 0, p.stderr
    return p.stdout.strip()
duena, ana, beto = "c8000000-0000-4000-8000-000000000001", "c8000000-0000-4000-8000-000000000002", "c8000000-0000-4000-8000-000000000003"
tienda = "c8000000-0000-4000-8000-0000000000aa"
run(f"""do $$ begin if current_database()<>'replay_provisional' then raise exception 'solo replay';end if;end $$;
insert into auth.users(id,email,raw_app_meta_data,email_confirmed_at) values
 ('{duena}','enlace-duena@prueba.invalid','{{"provider":"google"}}',now()),
 ('{ana}','enlace-ana@prueba.invalid','{{"provider":"google"}}',now()),
 ('{beto}','enlace-beto@prueba.invalid','{{"provider":"google"}}',now());
insert into public.tiendas(id,nombre,slug,estado) values('{tienda}','Enlace concurrente fixture','enlace-concurrente-fixture','activa');
insert into public.miembros(usuario_id,tienda_id,rol) values('{duena}','{tienda}','dueno');""")
def como(u): return f"select set_config('request.jwt.claim.sub','{u}',true);set local role authenticated;"
codigo = run(f"begin;{como(duena)}select public.crear_enlace_colaborador('{tienda}','editor',null);commit;").splitlines()[-1]
assert len(codigo) == 43, codigo
a = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
a.stdin.write(f"begin;{como(ana)}select public.reclamar_enlace('{codigo}');select pg_sleep(2);commit;"); a.stdin.close()
for _ in range(60):  # Ana ya lo reclamó y duerme con la fila bloqueada
    if int(run("select count(*) from pg_stat_activity where datname='replay_provisional' and wait_event='PgSleep';")): break
    time.sleep(.05)
else: raise AssertionError("Ana no llegó al tramo protegido")
b = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
b.stdin.write(f"begin;{como(beto)}select public.reclamar_enlace('{codigo}');commit;"); b.stdin.close()
for _ in range(60):  # Beto espera el bloqueo de Ana (no se supone por una pausa)
    if int(run("select count(*) from pg_stat_activity where datname='replay_provisional' and wait_event_type='Lock' and query like '%reclamar_enlace%';")): break
    time.sleep(.05)
else: raise AssertionError("No se observó espera Lock")
a.wait(); b.wait()
assert a.returncode == 0, a.stderr.read()
err = b.stderr.read()
assert b.returncode != 0 and "enlace_no_valido" in err, err
fila = run(f"select estado||'/'||reclamado_por from public.enlaces_invitacion where tienda_id='{tienda}';")
assert fila == f"esperando/{ana}", fila
print("Pasó: dos aperturas a la vez del mismo enlace; solo una lo reclama, la otra espera el bloqueo y recibe enlace_no_valido.")
run(f"delete from public.tiendas where id='{tienda}'; delete from auth.users where id in ('{duena}','{ana}','{beto}');")
