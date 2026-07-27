# Relay OECE (Cloudflare Workers)

Por qué existe esto: ver el comentario en `src/index.js`. En resumen — el OECE
bloquea el tráfico desde la red de Vercel (403 confirmado con diagnóstico
directo), así que este Worker reenvía las peticiones desde la red de Cloudflare
en su lugar.

## Pasos que tienes que hacer tú (no puedo hacerlos por ti — requieren tu cuenta)

1. **Crear cuenta gratis en Cloudflare** (si no tienes una): https://dash.cloudflare.com/sign-up
   No hace falta tarjeta para el plan gratis de Workers (100,000 requests/día).

2. **Iniciar sesión con Wrangler** (el CLI de Cloudflare, ya instalado en esta carpeta):
   ```bash
   cd cloudflare-relay
   npx wrangler login
   ```
   Esto abre el navegador para autorizar — hazlo tú desde tu propia sesión.

3. **Definir el token secreto** (el mismo valor que después va a `OECE_RELAY_TOKEN`
   en las variables de entorno de Vercel — inventa una cadena larga y random):
   ```bash
   npx wrangler secret put RELAY_TOKEN
   ```
   Te va a pedir que pegues el valor.

4. **Desplegar**:
   ```bash
   npx wrangler deploy
   ```
   Al terminar te va a mostrar la URL del Worker, algo como:
   `https://urban-procura-oece-relay.<tu-subdominio>.workers.dev`

5. **Avísame la URL** (no hace falta que me des el token) y yo configuro el resto:
   agrego las variables de entorno en el código (`OECE_RELAY_URL`,
   `OECE_RELAY_TOKEN`) — tú las tienes que pegar en Vercel (Project Settings →
   Environment Variables) porque no tengo acceso a tu dashboard de Vercel.

## Verificar que funciona

```bash
curl -H "x-relay-token: TU_TOKEN" "https://<tu-worker>.workers.dev/proxy/v1/indexCountData?format=json"
```
Si responde con el JSON de estadísticas del OECE (no un 403), el relay funciona.

## Desarrollo local

```bash
npm run dev
```
