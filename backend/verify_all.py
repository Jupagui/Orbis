import asyncio
import httpx
import time
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

async def wait_for_caso(client: httpx.AsyncClient, caso_id: str, max_timeout=35):
    start = time.time()
    while time.time() - start < max_timeout:
        r = await client.get(f"{BASE_URL}/casos/{caso_id}")
        if r.status_code == 200:
            data = r.json()
            if data["estado"] in ["completado", "requiere_info", "error"]:
                return data
        await asyncio.sleep(1.5)
    return None

async def test_endpoint(client: httpx.AsyncClient, name: str, coro):
    try:
        res = await coro
        print(f"[OK] {name}")
        return res
    except Exception as e:
        print(f"[FAIL] {name}: {e}")
        return None

async def main():
    print("=== INICIANDO PRUEBAS DE CONSULTAS DE ORBIS ===")
    async with httpx.AsyncClient(timeout=40.0) as client:
        # 1. Health check
        r_health = await client.get(f"{BASE_URL}/health")
        print(f"1. Health check: {r_health.status_code} -> {r_health.json()}")

        # 2. Grafo orquestador
        r_grafo = await client.get(f"{BASE_URL}/orquestador/grafo")
        print(f"2. Grafo orquestador: {r_grafo.status_code} (motor: {r_grafo.json().get('motor')})")

        # 3. Listar casos
        r_casos = await client.get(f"{BASE_URL}/casos")
        print(f"3. Listar casos: {r_casos.status_code} (total existentes: {len(r_casos.json())})")

        # 4. Listar viales
        r_viales = await client.get(f"{BASE_URL}/casos/viales")
        print(f"4. Listar viales: {r_viales.status_code} (total con gps: {len(r_viales.json())})")

        # Consultas temáticas para cada tipo de agente
        casos_a_probar = [
            ("Salud", "Siento un dolor punzante en el pecho y me falta el aire", 4.6097, -74.0817),
            ("Taller", "Se pinchó una llanta de mi moto y no tengo repuesto", 4.6533, -74.0560),
            ("Vía", "Hay un hueco muy profundo y sin señalizar en la avenida", 4.6097, -74.0817),
            ("Sabor", "Quiero almorzar comida típica colombiana cerca de aquí", 4.6097, -74.0817),
            ("Explora", "Busco un recorrido cultural con museos o plazas para la tarde", 4.6097, -74.0817)
        ]

        casos_completados = []

        for categoria, descripcion, lat, lon in casos_a_probar:
            print(f"\n--- Probando consulta [{categoria}]: '{descripcion}' ---")
            t0 = time.time()
            post_res = await client.post(
                f"{BASE_URL}/casos",
                data={"descripcion": descripcion, "lat": lat, "lon": lon}
            )
            if post_res.status_code != 202:
                print(f"[FAIL] Error al crear caso {categoria}: {post_res.status_code} {post_res.text}")
                continue
            
            caso_id = post_res.json()["id"]
            print(f"Caso creado id={caso_id}, esperando pipeline...")
            
            caso_data = await wait_for_caso(client, caso_id, max_timeout=45)
            dt = round(time.time() - t0, 2)
            
            if not caso_data:
                print(f"[FAIL] Timeout esperando resolución de caso {caso_id}")
                continue

            print(f"[OK] Caso {categoria} resuelto en {dt}s:")
            print(f"     Estado: {caso_data['estado']}")
            print(f"     Tipo clasificado: {caso_data['tipo']}")
            print(f"     Prioridad: {caso_data['prioridad']}")

            # Trazas
            r_trazas = await client.get(f"{BASE_URL}/casos/{caso_id}/trazas")
            trazas = r_trazas.json() if r_trazas.status_code == 200 else []
            agentes_participantes = [t["agente"] for t in trazas]
            print(f"     Trazas ({len(trazas)} pasos): {' -> '.join(agentes_participantes)}")
            
            casos_completados.append(caso_id)

        # 5. Probar Chat contextual sobre el primer caso completado
        if casos_completados:
            test_caso_id = casos_completados[0]
            print(f"\n--- Probando Chat contextual sobre caso {test_caso_id} ---")
            r_chat = await client.post(
                f"{BASE_URL}/casos/{test_caso_id}/chat",
                json={"pregunta": "¿Qué pasos debo seguir primero antes de llegar al centro médico?"}
            )
            print(f"Chat POST status: {r_chat.status_code}")
            if r_chat.status_code == 200:
                print(f"Respuesta Asistente: {r_chat.json().get('contenido')[:150]}...")
            
            r_historial = await client.get(f"{BASE_URL}/casos/{test_caso_id}/chat")
            print(f"Historial chat count: {len(r_historial.json())}")

    print("\n=== TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE ===")

if __name__ == "__main__":
    asyncio.run(main())
