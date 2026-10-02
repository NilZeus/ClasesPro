require('dotenv').config();

const express = require('express');
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const hasPlaceholderValue = (value) => typeof value === 'string' && /TU_CLAVE|replace_me/i.test(value);
const stripeConfigured = Boolean(stripeSecretKey) && stripeSecretKey.startsWith('sk_') && !hasPlaceholderValue(stripeSecretKey);
const stripe = stripeConfigured ? require('stripe')(stripeSecretKey) : null;

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${PORT}`;
const endpointSecret = stripeWebhookSecret;
const pedidos = [];

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    if (!stripe || !endpointSecret || !endpointSecret.startsWith('whsec_') || hasPlaceholderValue(endpointSecret)) {
      throw new Error('Falta STRIPE_WEBHOOK_SECRET en el entorno o tiene un valor de ejemplo');
    }

    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const pedido = {
      id: session.id,
      email: session.customer_details?.email || session.customer_email || null,
      plan: session.metadata?.plan || 'Sin nombre',
      amount_total: session.amount_total,
      currency: session.currency,
      status: session.payment_status,
      created: new Date(session.created * 1000).toISOString()
    };

    pedidos.push(pedido);
    console.log('Pedido confirmado:', pedido);
  }

  return res.json({ received: true });
});

app.use(express.json());
app.use(express.static(__dirname));

app.get('/pedidos', (req, res) => {
  res.json({ pedidos });
});

app.post('/crear-pago', async (req, res) => {
  try {
    if (!stripeConfigured || !stripe) {
      return res.status(500).json({
        error: 'Stripe no está configurado. Define STRIPE_SECRET_KEY en tu archivo .env con tu clave real.'
      });
    }

    const { plan, precio, email } = req.body || {};

    if (!plan || !precio || !email) {
      return res.status(400).json({
        error: 'Faltan datos: plan, precio y email son requeridos.'
      });
    }

    const amount = Number(precio);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        error: 'El precio debe ser un número válido mayor a cero.'
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan
            },
            unit_amount: Math.round(amount * 100)
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      customer_email: email,
      success_url: `${FRONTEND_URL}/gracias.html`,
      cancel_url: `${FRONTEND_URL}/index2.html`,
      metadata: {
        plan
      }
    });

    return res.json({ id: session.id });
  } catch (error) {
    console.error('Error al crear la sesión de Stripe:', error);
    return res.status(500).json({
      error: 'No se pudo crear la sesión de pago.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
