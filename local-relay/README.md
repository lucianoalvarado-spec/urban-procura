# Relay local (Cloudflare Tunnel)

Por qué: el OECE bloquea el tráfico de proveedores cloud a nivel de WAF —
confirmado con Vercel (Node/Edge) y con Cloudflare Workers (con y sin Smart
Placement), los dos fallan. Solo funciona desde una IP residencial/de oficina
normal — como la de esta máquina. Este servidor (`server.js`) corre en tu PC y
sale a internet con esa IP; Cloudflare Tunnel lo expone de forma segura para
que Vercel pueda llamarlo sin abrir puertos en tu router.

**Mientras esta máquina esté prendida y el túnel corriendo, la app en
producción muestra datos reales. Si la apagas, vuelve a datos de muestra
(degradación visible, como el resto de la plataforma) — no se rompe nada, solo
deja de tener datos en vivo.**

## Pasos que te tocan a ti

### 1. Instalar `cloudflared` (el cliente de Cloudflare Tunnel)

```powershell
winget install --id Cloudflare.cloudflared
```
Si `winget` no funciona, descárgalo directo de
https://github.com/cloudflare/cloudflared/releases (el archivo
`cloudflared-windows-amd64.exe` — renómbralo a `cloudflared.exe`).

Cierra y vuelve a abrir la terminal después de instalar.

### 2. Arrancar el relay local

```powershell
cd "C:\Users\User\Desktop\URBAN PLACE\3. URBAN PROCURA\local-relay"
node server.js
```
Déjalo corriendo en esa terminal (no la cierres). Debería decir
`Relay local escuchando en http://localhost:8787`.

### 3. Abrir el túnel (en OTRA terminal, sin cerrar la anterior)

```powershell
cloudflared tunnel --url http://localhost:8787
```
Va a mostrar algo como:
```
https://algo-random-aqui.trycloudflare.com
```
**Copia esa URL.** Ojo: es temporal — si cierras esta terminal o reinicias el
túnel, la URL cambia y hay que actualizar Vercel de nuevo. (Si más adelante
quieres una URL fija que no cambie, avísame y armamos un túnel permanente —
necesita que tengas o compres un dominio en Cloudflare.)

### 4. Actualizar Vercel

Ve a Vercel → proyecto `urban-procura` → Settings → Environments →
Production → `OECE_RELAY_URL` → editar el valor a la URL del paso 3 (sin `/`
al final). `OECE_RELAY_TOKEN` no cambia, ya tiene el valor correcto.

Guarda y redeploy.

### 5. Avísame

Con las tres cosas corriendo (server.js, cloudflared, y Vercel con la URL
actualizada) dime y verifico desde acá.

## Probar que el relay local funciona (antes de abrir el túnel)

```powershell
curl.exe -H "x-relay-token: TU_TOKEN" "http://localhost:8787/proxy/v1/indexCountData?format=json"
```
Si te devuelve el JSON de estadísticas del OECE, el servidor local está bien.
