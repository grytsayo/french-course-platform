const express = require('express');
const router = express.Router();
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../database/db');
const { sendEmail } = require('../services/emailService');
const { generateAccessCode } = require('../utils/helpers');

// YooKassa (ЮKassa) payment creation
router.post('/yukassa/create', async (req, res) => {
  try {
    const { email, name, amount, currency = 'EUR' } = req.body;

    if (!email || !name || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create user or get existing
    let userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    let userId;
    if (userResult.rows.length === 0) {
      const accessCode = generateAccessCode();
      const newUser = await db.query(
        'INSERT INTO users (email, name, access_code) VALUES ($1, $2, $3) RETURNING id',
        [email, name, accessCode]
      );
      userId = newUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    // Create payment record
    const payment = await db.query(
      `INSERT INTO payments (user_id, course_id, amount, currency, payment_method, payment_provider, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [userId, 1, amount, currency, 'card', 'yukassa', 'pending']
    );

    const paymentId = payment.rows[0].id;

    // Create YooKassa payment
    const yukassaResponse = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      {
        amount: {
          value: amount.toFixed(2),
          currency: currency
        },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: `${process.env.BASE_URL}/payment-success.html?payment_id=${paymentId}`
        },
        description: `Курс французского языка - ${name}`,
        metadata: {
          payment_id: paymentId,
          user_id: userId,
          email: email
        }
      },
      {
        auth: {
          username: process.env.YUKASSA_SHOP_ID,
          password: process.env.YUKASSA_SECRET_KEY
        },
        headers: {
          'Idempotence-Key': `payment_${paymentId}_${Date.now()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Update payment with provider ID
    await db.query(
      'UPDATE payments SET provider_payment_id = $1, metadata = $2 WHERE id = $3',
      [yukassaResponse.data.id, JSON.stringify(yukassaResponse.data), paymentId]
    );

    res.json({
      success: true,
      payment_id: paymentId,
      confirmation_url: yukassaResponse.data.confirmation.confirmation_url
    });

  } catch (error) {
    console.error('YooKassa payment error:', error);
    res.status(500).json({
      error: 'Payment creation failed',
      message: error.response?.data || error.message
    });
  }
});

// YooKassa webhook
router.post('/yukassa/webhook', async (req, res) => {
  try {
    const payment = req.body.object;

    if (payment.status === 'succeeded') {
      const paymentId = payment.metadata.payment_id;
      const userId = payment.metadata.user_id;
      const email = payment.metadata.email;

      // Update payment status
      await db.query(
        'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2',
        ['completed', paymentId]
      );

      // Get user access code
      const userResult = await db.query(
        'SELECT access_code FROM users WHERE id = $1',
        [userId]
      );
      const accessCode = userResult.rows[0].access_code;

      // Create enrollment
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 60);

      await db.query(
        'INSERT INTO enrollments (user_id, course_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id, course_id) DO UPDATE SET expires_at = $3',
        [userId, 1, expiresAt]
      );

      // Send email with access code
      await sendEmail({
        to: email,
        subject: 'Доступ к курсу французского языка',
        template: 'payment_success',
        data: {
          accessCode: accessCode,
          courseUrl: `${process.env.BASE_URL}/dashboard.html`
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Stripe payment creation
router.post('/stripe/create', async (req, res) => {
  try {
    const { email, name, amount, currency = 'eur' } = req.body;

    if (!email || !name || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create user or get existing
    let userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    let userId;
    if (userResult.rows.length === 0) {
      const accessCode = generateAccessCode();
      const newUser = await db.query(
        'INSERT INTO users (email, name, access_code) VALUES ($1, $2, $3) RETURNING id',
        [email, name, accessCode]
      );
      userId = newUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    // Create payment record
    const payment = await db.query(
      `INSERT INTO payments (user_id, course_id, amount, currency, payment_method, payment_provider, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [userId, 1, amount, currency.toUpperCase(), 'card', 'stripe', 'pending']
    );

    const paymentId = payment.rows[0].id;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: 'Общайся легко - на Лазурке!',
              description: 'Мини-курс французского языка для туристов',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.BASE_URL}/payment-success.html?payment_id=${paymentId}`,
      cancel_url: `${process.env.BASE_URL}/payment.html`,
      customer_email: email,
      metadata: {
        payment_id: paymentId,
        user_id: userId,
        email: email
      }
    });

    // Update payment with provider ID
    await db.query(
      'UPDATE payments SET provider_payment_id = $1 WHERE id = $2',
      [session.id, paymentId]
    );

    res.json({
      success: true,
      payment_id: paymentId,
      checkout_url: session.url
    });

  } catch (error) {
    console.error('Stripe payment error:', error);
    res.status(500).json({
      error: 'Payment creation failed',
      message: error.message
    });
  }
});

// Stripe webhook
router.post('/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const paymentId = session.metadata.payment_id;
    const userId = session.metadata.user_id;
    const email = session.metadata.email;

    try {
      // Update payment status
      await db.query(
        'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2',
        ['completed', paymentId]
      );

      // Get user access code
      const userResult = await db.query(
        'SELECT access_code FROM users WHERE id = $1',
        [userId]
      );
      const accessCode = userResult.rows[0].access_code;

      // Create enrollment
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 60);

      await db.query(
        'INSERT INTO enrollments (user_id, course_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id, course_id) DO UPDATE SET expires_at = $3',
        [userId, 1, expiresAt]
      );

      // Send email with access code
      await sendEmail({
        to: email,
        subject: 'Access to French Language Course',
        template: 'payment_success',
        data: {
          accessCode: accessCode,
          courseUrl: `${process.env.BASE_URL}/dashboard.html`
        }
      });
    } catch (error) {
      console.error('Webhook processing error:', error);
    }
  }

  res.json({ received: true });
});

// Check payment status
router.get('/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const result = await db.query(
      'SELECT status, amount, currency FROM payments WHERE id = $1',
      [paymentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

module.exports = router;
