"""Solo replay. Dos conexiones reales: con 5 referencias, dos altas a la vez no pasan de 6 (el segundo espera el bloqueo)."""
import os, subprocess, time
container = os.environ["ADMIN_REPLAY_CONTAINER"]
assert container.startswith("deslizapp-admin-replay-") and container.removeprefix("deslizapp-admin-replay-").isdigit()
cmd = ["docker", "exec", "-i", container, "psql", "-U", "postgres", "-d", "replay_provisional", "-v", "ON_ERROR_STOP=1", "-qAt"]
def run(sql):
    p = subprocess.run(cmd, input=sql, text=True, capture_output=True)
    assert p.returncode == 0, p.stderr
    return p.stdout.strip()
actor = "c9000000-0000-4000-8000-000000000001"
shop = "c9000000-0000-4000-8000-000000000002"
run(f"""do $$ begin if current_database()<>'replay_provisional' then raise exception 'solo replay';end if;end $$;
insert into auth.users(id,email) values('{actor}','marca-concurrencia@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado) values('{shop}','Marca concurrente fixture','marca-concurrente-fixture','activa');
insert into public.miembros(usuario_id,tienda_id,rol) values('{actor}','{shop}','dueno');
insert into public.marca_referencias(tienda_id,ruta,orden) select '{shop}','{shop}/r'||g||'.jpg',g from generate_series(1,5) g;""")
auth = f"select set_config('request.jwt.claim.sub','{actor}',true);set local role authenticated;"
def alta(n, pausa):
    return f"insert into public.marca_referencias(tienda_id,ruta,orden) values ('{shop}','{shop}/n{n}.jpg',{n});" + ("select pg_sleep(2);" if pausa else "")
a = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
a.stdin.write("begin;" + auth + alta(1, True) + "commit;"); a.stdin.close()
for _ in range(60):  # el primero ya insertó y duerme con el bloqueo tomado
    if int(run("select count(*) from pg_stat_activity where datname='replay_provisional' and wait_event='PgSleep';")): break
    time.sleep(.05)
else: raise AssertionError("El primero no llegó al tramo protegido")
b = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
b.stdin.write("begin;" + auth + alta(2, False) + "commit;"); b.stdin.close()
for _ in range(60):  # el segundo espera el bloqueo del primero (no se supone por una pausa)
    if int(run("select count(*) from pg_stat_activity where datname='replay_provisional' and wait_event_type='Lock' and query like '%marca_referencias%';")): break
    time.sleep(.05)
else: raise AssertionError("No se observó espera Lock")
a.wait(); b.wait()
assert a.returncode == 0, a.stderr.read()
err = b.stderr.read()
assert b.returncode != 0 and "marca_referencias_limite" in err, err
assert run(f"select count(*) from public.marca_referencias where tienda_id='{shop}';") == "6"
print("Lock real comprobado: dos altas a la vez con 5 referencias dejan 6, no 7")
run(f"delete from public.tiendas where id='{shop}'; delete from auth.users where id='{actor}';")
