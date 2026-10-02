# ClasesPro Checkout con Stripe

Este proyecto incluye un backend mínimo con Express para crear sesiones de pago de Stripe y un formulario de compra en la página principal.

## Requisitos

- Node.js 18+
- Una cuenta de Stripe con clave secreta y clave pública

## Instalación

```bash
npm install
cp .env.example .env
```

## Configuración

Edita el archivo `.env` y reemplaza tus valores reales:

```env
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta
STRIPE_WEBHOOK_SECRET=whsec_tu_clave_webhook
FRONTEND_URL=http://localhost:3000
PORT=3000
```

## Webhook de Stripe

Para probar pagos reales en local, activa un túnel con Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/webhook
```

Copia el valor de `whsec_...` que te devuelva Stripe y colócalo en `STRIPE_WEBHOOK_SECRET`.

Con esto, cuando Stripe confirme un pago, el evento `checkout.session.completed` llega al backend y se guarda el pedido en memoria.

## Ejecutar

```bash
npm start
```

Luego abre en el navegador:

```text
http://localhost:3000/index2.html
```

## Flujo de pago

1. El usuario llena el formulario.
2. El frontend llama a `/crear-pago`.
3. El backend crea la sesión de Stripe Checkout.
4. El navegador redirige a Stripe con `redirectToCheckout({ sessionId })`.
5. Stripe lleva al usuario a `gracias.html` en caso de éxito.

## Importante

- Nunca publiques la clave secreta en el frontend.
- Usa la clave pública del frontend y la secreta SOLO del backend.
