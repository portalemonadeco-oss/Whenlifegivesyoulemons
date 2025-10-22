/**
 * Simple Node/Express server template for Stripe Checkout + email sending.
 * - Add your STRIPE_SECRET_KEY and EMAIL_SMTP settings as environment variables.
 * - This file is intentionally basic; follow Stripe docs for production readiness.
 */
const express = require('express');
const Stripe = require('stripe');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_SECRET_KEY');

// Create a checkout session (example)
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, customer } = req.body;
    // Map items to Stripe line items
    const line_items = items.map(i => ({
      price_data: {
        currency: 'usd',
        product_data: { name: i.name },
        unit_amount: Math.round(i.price*100),
      },
      quantity: i.qty,
    }));
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: 'https://your-success-url.com?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://your-cancel-url.com',
    });
    res.json({ id: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook endpoint (to receive checkout events)
app.post('/webhook', bodyParser.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  // Verify signature with your STRIPE_WEBHOOK_SECRET
  // For demo, we just acknowledge
  console.log('Webhook received');
  res.status(200).send('ok');
});

// Example email sending function (nodemailer)
async function sendOrderEmail(order) {
  // Configure transporter with env vars:
  // SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'username',
      pass: process.env.SMTP_PASS || 'password'
    }
  });
  const info = await transporter.sendMail({
    from: '"Port A Lemonade Co." <noreply@portalemonadeco.com>',
    to: process.env.ORDER_EMAIL || 'portalemonadeco@gmail.com',
    subject: `New order ${order.id}`,
    text: `New order received:\n\n${JSON.stringify(order, null, 2)}`
  });
  console.log('Email sent', info.messageId);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server listening on', PORT));
