"""Solo replay. Dos conexiones reales; espera Lock observada, fixtures ficticios."""
import os, subprocess, time, json
container = os.environ["ADMIN_REPLAY_CONTAINER"]
assert container.startswith("deslizapp-admin-replay-") and container.removeprefix("deslizapp-admin-replay-").isdigit()
cmd = ["docker", "exec", "-i", container, "psql", "-U", "postgres", "-d", "replay_provisional", "-v", "ON_ERROR_STOP=1", "-qAt"]
def run(sql):
    p = subprocess.run(cmd, input=sql, text=True, capture_output=True)
    assert p.returncode == 0, p.stderr
    return p.stdout.strip()
actor = "a9000000-0000-4000-8000-000000000001"
shop = "a9000000-0000-4000-8000-000000000002"
run(f"""do $$ begin if current_database()<>'replay_provisional' then raise exception 'solo replay';end if;end $$;
insert into auth.users(id,email) values('{actor}','concurrencia@prueba.invalid');
insert into public.admins(usuario_id,email) values('{actor}','concurrencia@prueba.invalid');
insert into public.tiendas(id,nombre,slug,estado) values('{shop}','Concurrente fixture','mensualidad-concurrente-fixture','activa');""")
auth = f"select set_config('request.jwt.claim.sub','{actor}',true);set local role authenticated;"
def payment():
    lines=run("begin;"+auth+f"select public.admin_registrar_pago('{shop}','mensualidad',1000,'efectivo');commit;").splitlines()
    return json.loads(next(x for x in lines if x.startswith("{")))["pago"]["id"]
def overlap(first, second, succeeds=True):
    a=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    a.stdin.write("begin;"+auth+first+"select pg_sleep(2);commit;");a.stdin.close()
    # Detectar que el primero ya tiene el bloqueo, sin suponerlo por una pausa.
    for _ in range(60):
        if int(run("select count(*) from pg_stat_activity where datname='replay_provisional' and wait_event='PgSleep';")): break
        time.sleep(.05)
    else: raise AssertionError("No entró en tramo protegido")
    b=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    b.stdin.write("begin;"+auth+second+"commit;");b.stdin.close()
    for _ in range(40):
        if int(run("select count(*) from pg_stat_activity where datname='replay_provisional' and wait_event_type='Lock' and query like '%admin_%pago%';")): break
        time.sleep(.025)
    else: raise AssertionError("No se observó espera Lock")
    a.wait();b.wait()
    assert a.returncode==0,a.stderr.read()
    err=b.stderr.read()
    assert (b.returncode==0) if succeeds else (b.returncode!=0 and "pago_ya_anulado" in err),err
    print("Lock real comprobado:", "ambas operaciones atómicas" if succeeds else "un único ganador; segundo rechazado")
a=payment()
overlap(f"select public.admin_registrar_pago('{shop}','mensualidad',1000,'efectivo');",f"select public.admin_anular_pago('{a}','anular A');")
assert run(f"select pagado_hasta=(public.hoy_rd()+interval '1 month')::date from public.tiendas where id='{shop}';")=="t"
b=run(f"select id from public.pagos where tienda_id='{shop}' and anula_a is null and id<>'{a}' order by numero limit 1;")
overlap(f"select public.admin_anular_pago('{b}','anular B');",f"select public.admin_anular_pago('{b}','duplicado');",False)
assert run(f"select pagado_hasta is null from public.tiendas where id='{shop}';")=="t"
assert run(f"select count(*) from public.pagos where anula_a='{b}';")=="1"
assert run(f"select count(*) from public.registro_admin where tienda_id='{shop}' and accion='anular_pago';")=="2"
# Orden inverso: anulación obtiene lock antes de registrar.
c=payment()
overlap(f"select public.admin_anular_pago('{c}','anular C');",f"select public.admin_registrar_pago('{shop}','mensualidad',1000,'efectivo');")
assert run(f"select pagado_hasta=(public.hoy_rd()+interval '1 month')::date from public.tiendas where id='{shop}';")=="t"
print("Concurrencia registro/anulación en ambos órdenes y doble anulación OK; fixtures solo en contenedor que se elimina.")
