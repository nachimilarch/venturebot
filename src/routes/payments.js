// src/routes/payments.js
import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// ─── Cashfree Config (functions — read at request time) ───────────────────────

const getCFBase = () =>
  (process.env.CASHFREE_ENV || 'PROD') === 'PROD'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

const getCFHeaders = () => ({
  'x-client-id': process.env.CASHFREE_APP_ID,
  'x-client-secret': process.env.CASHFREE_SECRET_KEY,
  'x-api-version': '2023-08-01',
  'Content-Type': 'application/json',
});

// ─── Credit Packages ──────────────────────────────────────────────────────────

const CREDIT_PACKAGES = {
1: { credits: 500,   price: 999,   name: 'Starter'    },
  2: { credits: 2000,  price: 3499,  name: 'Basic'      },
  3: { credits: 5000,  price: 8499,  name: 'Growth'     },
  4: { credits: 15000, price: 23999, name: 'Pro'        },
  5: { credits: 30000, price: 44999, name: 'Enterprise' },
};

const AI_TOKEN_PACKAGES = {
  1: { tokens: 100_000,    price: 299,   name: 'AI Starter' },
  2: { tokens: 500_000,    price: 999,   name: 'AI Basic'   },
  3: { tokens: 2_000_000,  price: 3499,  name: 'AI Growth'  },
  4: { tokens: 10_000_000, price: 14999, name: 'AI Pro'     },
};

const SUBSCRIPTION_PLANS = {
  starter: { name: 'Starter', price: 1499, priceYearly: 14990, conversations: 1000, users: 3, popular: false },
  growth: { name: 'Growth', price: 2999, priceYearly: 29990, conversations: 5000, users: 10, popular: true },
  business: { name: 'Business', price: 7999, priceYearly: 79990, conversations: 20000, users: -1, popular: false },
  enterprise: { name: 'Enterprise', price: 0, priceYearly: 0, conversations: -1, users: -1, custom: true },
};

// ─── GET /api/payments/plans (public) ─────────────────────────────────────────

router.get('/plans', (req, res) => {
  res.json({ success: true, data: { creditPackages: CREDIT_PACKAGES, subscriptionPlans: SUBSCRIPTION_PLANS, aiTokenPackages: AI_TOKEN_PACKAGES } });
});

// ─── POST /api/payments/cashfree/webhook (public — called by Cashfree) ────────
// ⚠️  Must be BEFORE router.use(authMiddleware) and registered in app.js with express.raw

router.post('/cashfree/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const rawBody = req.body.toString('utf8');
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    // Verify signature
    const signedPayload = timestamp + rawBody;
    const expectedSig = crypto
      .createHmac('sha256', process.env.CASHFREE_SECRET_KEY)
      .update(signedPayload)
      .digest('base64');

    if (signature !== expectedSig) {
      console.warn('[Cashfree:webhook] ❌ Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(rawBody);
    const { type, data } = event;

    console.log(`[Cashfree:webhook] Event: ${type} | order: ${data?.order?.order_id}`);

    if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId = data.order.order_id;
      const paymentId = String(data.payment.cf_payment_id);

      const [[txn]] = await pool.execute(
        'SELECT * FROM transactions WHERE transaction_ref = ? LIMIT 1',
        [orderId]
      );

      if (txn && txn.status !== 'completed') {
        await pool.execute(
          'UPDATE transactions SET status = "completed", payment_id = ?, updated_at = NOW() WHERE transaction_ref = ?',
          [paymentId, orderId]
        );
        if (txn.type === 'ai_token_purchase') {
          await pool.execute(
            'UPDATE tenants SET ai_tokens_balance = ai_tokens_balance + ? WHERE id = ?',
            [txn.credits, txn.tenant_id]
          );
          console.log(`[Cashfree:webhook] ✅ AI tokens +${txn.credits} to tenant ${txn.tenant_id}`);
        } else {
          await pool.execute(
            'UPDATE tenants SET credits_balance = credits_balance + ? WHERE id = ?',
            [txn.credits, txn.tenant_id]
          );
          console.log(`[Cashfree:webhook] ✅ Credited ${txn.credits} to tenant ${txn.tenant_id}`);
        }
      } else if (txn?.status === 'completed') {
        console.log(`[Cashfree:webhook] ℹ️  Already processed: ${orderId}`);
      } else {
        console.warn(`[Cashfree:webhook] ⚠️  Transaction not found: ${orderId}`);
      }
    }

    if (type === 'PAYMENT_FAILED_WEBHOOK') {
      const orderId = data.order.order_id;
      await pool.execute(
        'UPDATE transactions SET status = "failed", updated_at = NOW() WHERE transaction_ref = ?',
        [orderId]
      );
      console.log(`[Cashfree:webhook] ❌ Payment failed: ${orderId}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Cashfree:webhook]', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ─── POST /api/payments/payu/webhook — surl/furl called by PayU server (no auth)

router.post('/payu/webhook', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const body = req.body;
    const { txnid, status, hash: receivedHash, mihpayid = '' } = body;
    const key  = process.env.PAYU_KEY  || '';
    const salt = process.env.PAYU_SALT || '';

    const expectedHash = payuReverseHash(body, salt, key);
    if (receivedHash !== expectedHash) {
      console.warn(`[PayU:webhook] ❌ Hash mismatch txnid:${txnid}`);
      return res.status(400).send('Invalid signature');
    }

    console.log(`[PayU:webhook] ${status} | txnid:${txnid} | mihpayid:${mihpayid}`);

    if (status === 'success') {
      const [[txn]] = await pool.execute(
        'SELECT * FROM transactions WHERE transaction_ref = ? LIMIT 1', [txnid]
      );
      if (txn && txn.status !== 'completed') {
        await pool.execute(
          'UPDATE transactions SET status = "completed", payment_id = ?, updated_at = NOW() WHERE transaction_ref = ?',
          [mihpayid, txnid]
        );
        if (txn.type === 'ai_token_purchase') {
          await pool.execute('UPDATE tenants SET ai_tokens_balance = ai_tokens_balance + ? WHERE id = ?', [txn.credits, txn.tenant_id]);
          console.log(`[PayU:webhook] ✅ AI tokens +${txn.credits} → tenant ${txn.tenant_id}`);
        } else {
          await pool.execute('UPDATE tenants SET credits_balance = credits_balance + ? WHERE id = ?', [txn.credits, txn.tenant_id]);
          console.log(`[PayU:webhook] ✅ Credits +${txn.credits} → tenant ${txn.tenant_id}`);
        }
      } else if (txn?.status === 'completed') {
        console.log(`[PayU:webhook] ℹ️  Already processed: ${txnid}`);
      }
    } else {
      await pool.execute(
        'UPDATE transactions SET status = "failed", updated_at = NOW() WHERE transaction_ref = ?', [txnid]
      );
      console.log(`[PayU:webhook] ❌ Failed: ${txnid}`);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[PayU:webhook]', err.message);
    res.status(500).send('Error');
  }
});

// ─── POST /api/payments/payu/return — browser redirect from PayU after payment
// PayU POSTs here from the user's browser; we credit (failsafe) then redirect.

router.post('/payu/return', express.urlencoded({ extended: false }), async (req, res) => {
  const FRONTEND = process.env.FRONTEND_URL || 'https://vaartabot.com';
  const body = req.body;
  const { txnid, status, hash: receivedHash, mihpayid = '' } = body;
  const key  = process.env.PAYU_KEY  || '';
  const salt = process.env.PAYU_SALT || '';

  try {
    const expectedHash = payuReverseHash(body, salt, key);
    if (receivedHash !== expectedHash) {
      console.warn(`[PayU:return] ❌ Hash mismatch txnid:${txnid}`);
      return res.redirect(`${FRONTEND}/billing?payment=failed&reason=hash`);
    }

    if (status === 'success') {
      const [[txn]] = await pool.execute(
        'SELECT * FROM transactions WHERE transaction_ref = ? LIMIT 1', [txnid]
      );
      if (txn && txn.status !== 'completed') {
        await pool.execute(
          'UPDATE transactions SET status = "completed", payment_id = ?, updated_at = NOW() WHERE transaction_ref = ?',
          [mihpayid, txnid]
        );
        if (txn.type === 'ai_token_purchase') {
          await pool.execute('UPDATE tenants SET ai_tokens_balance = ai_tokens_balance + ? WHERE id = ?', [txn.credits, txn.tenant_id]);
        } else {
          await pool.execute('UPDATE tenants SET credits_balance = credits_balance + ? WHERE id = ?', [txn.credits, txn.tenant_id]);
        }
      }
      return res.redirect(`${FRONTEND}/billing?payment=success`);
    } else {
      await pool.execute(
        'UPDATE transactions SET status = "failed", updated_at = NOW() WHERE transaction_ref = ?', [txnid]
      );
      return res.redirect(`${FRONTEND}/billing?payment=failed`);
    }
  } catch (err) {
    console.error('[PayU:return]', err.message);
    return res.redirect(`${FRONTEND}/billing?payment=failed`);
  }
});

// ─── Auth required for all routes below ──────────────────────────────────────

router.use(authMiddleware);

// ─── GET /api/payments/history ────────────────────────────────────────────────

router.get('/history', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM transactions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.tenantId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/payments/subscription ──────────────────────────────────────────

router.get('/subscription', async (req, res) => {
  try {
    const [[tenant]] = await pool.execute(
      'SELECT subscription_plan, subscription_status, subscription_start, subscription_end FROM tenants WHERE id = ?',
      [req.user.tenantId]
    );
    const planDetails = tenant?.subscription_plan ? SUBSCRIPTION_PLANS[tenant.subscription_plan] : null;
    res.json({ success: true, data: { ...tenant, planDetails } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/payments/create-order ─────────────────────────────────────────

router.post('/create-order', async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ success: false, error: 'Invalid package' });

    const tenantId = req.user.tenantId;
    const orderId = `VB_${tenantId}_${Date.now()}`;

    // Get tenant info — phone from whatsapp_config
    const [[tenant]] = await pool.execute(
      `SELECT 
         t.name,
         u.email,
         REGEXP_REPLACE(wc.display_phone_number, '[^0-9]', '') AS phone
       FROM tenants t
       LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
       LEFT JOIN whatsapp_config wc ON wc.tenant_id = t.id AND wc.is_active = 1
       WHERE t.id = ? LIMIT 1`,
      [tenantId]
    );

    // Clean phone: "917083820068" → "7083820068" (Cashfree needs 10 digits)
    const rawPhone = tenant?.phone || '';
    const cleanPhone = rawPhone.length === 12 ? rawPhone.slice(2) : rawPhone.slice(-10);
    const finalPhone = cleanPhone || '9999999999';

    const FRONTEND = (process.env.FRONTEND_URL || 'https://vaartabot.com').replace(/\/$/, '');
    const BACKEND = (process.env.BACKEND_URL || 'https://api.vaartabot.com').replace(/\/$/, '');

    // Create order on Cashfree
    const { data } = await axios.post(
      `${getCFBase()}/orders`,
      {
        order_id: orderId,
        order_amount: pkg.price,
        order_currency: 'INR',
        customer_details: {
          customer_id: `tenant_${tenantId}`,
          customer_name: tenant?.name || 'VaartaBot User',
          customer_email: tenant?.email || 'noreply@vaartabot.in',
          customer_phone: finalPhone,
        },
        order_meta: {
          return_url: `${FRONTEND}/billing?status=success&order_id=${orderId}`,
          notify_url: `${BACKEND}/api/payments/cashfree/webhook`,
        },
        order_note: `${pkg.name} — ${pkg.credits} credits`,
      },
      { headers: getCFHeaders() }
    );

    // Save pending transaction
    await pool.execute(
      `INSERT INTO transactions
         (tenant_id, type, amount, credits, description, status, transaction_ref, created_at)
       VALUES (?, 'purchase', ?, ?, ?, 'pending', ?, NOW())`,
      [tenantId, pkg.price, pkg.credits, `${pkg.name} — ${pkg.credits.toLocaleString()} credits`, orderId]
    );

    console.log(`[Cashfree] 🆕 Order: ${orderId} | tenant:${tenantId} | ₹${pkg.price} | phone:${finalPhone}`);

    res.json({
      success: true,
      orderId,
      paymentSessionId: data.payment_session_id,
      amount: pkg.price,
      packageInfo: pkg,
    });
  } catch (err) {
    console.error('[Cashfree:create-order]', err.response?.data || err.message);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// ─── POST /api/payments/verify ────────────────────────────────────────────────

router.post('/verify', async (req, res) => {
  try {
    const { orderId } = req.body;
    const tenantId = req.user.tenantId;

    const { data } = await axios.get(
      `${getCFBase()}/orders/${orderId}`,
      { headers: getCFHeaders() }
    );

    console.log(`[Cashfree:verify] order:${orderId} status:${data.order_status}`);

    if (data.order_status === 'PAID') {
      const [[txn]] = await pool.execute(
        'SELECT * FROM transactions WHERE transaction_ref = ? AND tenant_id = ? LIMIT 1',
        [orderId, tenantId]
      );

      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

      if (txn.status === 'completed') {
        const [[t]] = await pool.execute('SELECT credits_balance FROM tenants WHERE id = ?', [tenantId]);
        return res.json({ success: true, creditsAdded: txn.credits, newBalance: t.credits_balance, alreadyProcessed: true });
      }

      await pool.execute(
        'UPDATE transactions SET status = "completed", updated_at = NOW() WHERE transaction_ref = ?',
        [orderId]
      );
      await pool.execute(
        'UPDATE tenants SET credits_balance = credits_balance + ? WHERE id = ?',
        [txn.credits, tenantId]
      );

      const [[t]] = await pool.execute('SELECT credits_balance FROM tenants WHERE id = ?', [tenantId]);

      console.log(`[Cashfree:verify] ✅ Credited ${txn.credits} to tenant ${tenantId}`);
      return res.json({ success: true, creditsAdded: txn.credits, newBalance: t.credits_balance });
    }

    res.json({ success: false, status: data.order_status });
  } catch (err) {
    console.error('[Cashfree:verify]', err.response?.data || err.message);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// ─── POST /api/payments/create-ai-order ──────────────────────────────────────

router.post('/create-ai-order', async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = AI_TOKEN_PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ success: false, error: 'Invalid AI token package' });

    const tenantId = req.user.tenantId;
    const orderId = `VBAI_${tenantId}_${Date.now()}`;

    const [[tenant]] = await pool.execute(
      `SELECT
         t.name,
         u.email,
         REGEXP_REPLACE(wc.display_phone_number, '[^0-9]', '') AS phone
       FROM tenants t
       LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
       LEFT JOIN whatsapp_config wc ON wc.tenant_id = t.id AND wc.is_active = 1
       WHERE t.id = ? LIMIT 1`,
      [tenantId]
    );

    const rawPhone = tenant?.phone || '';
    const cleanPhone = rawPhone.length === 12 ? rawPhone.slice(2) : rawPhone.slice(-10);
    const finalPhone = cleanPhone || '9999999999';

    const FRONTEND = (process.env.FRONTEND_URL || 'https://vaartabot.com').replace(/\/$/, '');
    const BACKEND = (process.env.BACKEND_URL || 'https://api.vaartabot.com').replace(/\/$/, '');

    const { data } = await axios.post(
      `${getCFBase()}/orders`,
      {
        order_id: orderId,
        order_amount: pkg.price,
        order_currency: 'INR',
        customer_details: {
          customer_id: `tenant_${tenantId}`,
          customer_name: tenant?.name || 'VaartaBot User',
          customer_email: tenant?.email || 'noreply@vaartabot.in',
          customer_phone: finalPhone,
        },
        order_meta: {
          return_url: `${FRONTEND}/billing?status=success&order_id=${orderId}`,
          notify_url: `${BACKEND}/api/payments/cashfree/webhook`,
        },
        order_note: `${pkg.name} — ${pkg.tokens.toLocaleString()} AI tokens`,
      },
      { headers: getCFHeaders() }
    );

    await pool.execute(
      `INSERT INTO transactions
         (tenant_id, type, amount, credits, description, status, transaction_ref, created_at)
       VALUES (?, 'ai_token_purchase', ?, ?, ?, 'pending', ?, NOW())`,
      [tenantId, pkg.price, pkg.tokens, `${pkg.name} — ${pkg.tokens.toLocaleString()} AI tokens`, orderId]
    );

    console.log(`[Cashfree] 🤖 AI order: ${orderId} | tenant:${tenantId} | ₹${pkg.price}`);

    res.json({
      success: true,
      orderId,
      paymentSessionId: data.payment_session_id,
      amount: pkg.price,
      packageInfo: pkg,
    });
  } catch (err) {
    console.error('[Cashfree:create-ai-order]', err.response?.data || err.message);
    res.status(500).json({ success: false, error: 'Failed to create AI token order' });
  }
});

// ─── POST /api/payments/verify-ai ────────────────────────────────────────────

router.post('/verify-ai', async (req, res) => {
  try {
    const { orderId } = req.body;
    const tenantId = req.user.tenantId;

    const { data } = await axios.get(
      `${getCFBase()}/orders/${orderId}`,
      { headers: getCFHeaders() }
    );

    console.log(`[Cashfree:verify-ai] order:${orderId} status:${data.order_status}`);

    if (data.order_status === 'PAID') {
      const [[txn]] = await pool.execute(
        'SELECT * FROM transactions WHERE transaction_ref = ? AND tenant_id = ? LIMIT 1',
        [orderId, tenantId]
      );

      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

      if (txn.status === 'completed') {
        const [[t]] = await pool.execute('SELECT ai_tokens_balance FROM tenants WHERE id = ?', [tenantId]);
        return res.json({ success: true, tokensAdded: txn.credits, newBalance: t.ai_tokens_balance, alreadyProcessed: true });
      }

      await pool.execute(
        'UPDATE transactions SET status = "completed", updated_at = NOW() WHERE transaction_ref = ?',
        [orderId]
      );
      await pool.execute(
        'UPDATE tenants SET ai_tokens_balance = ai_tokens_balance + ? WHERE id = ?',
        [txn.credits, tenantId]
      );

      const [[t]] = await pool.execute('SELECT ai_tokens_balance FROM tenants WHERE id = ?', [tenantId]);

      console.log(`[Cashfree:verify-ai] ✅ AI tokens +${txn.credits} to tenant ${tenantId}`);
      return res.json({ success: true, tokensAdded: txn.credits, newBalance: t.ai_tokens_balance });
    }

    res.json({ success: false, status: data.order_status });
  } catch (err) {
    console.error('[Cashfree:verify-ai]', err.response?.data || err.message);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PayU Payment Gateway
// ═══════════════════════════════════════════════════════════════════════════════

const getPayUVerifyURL = () =>
  (process.env.PAYU_ENV || 'PROD') === 'PROD'
    ? 'https://info.payu.in/merchant/postservice.php?form=2'
    : 'https://test.payu.in/merchant/postservice.php?form=2';

// sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
function payuForwardHash(key, txnid, amount, productinfo, firstname, email, salt) {
  const parts = [key, txnid, amount, productinfo, firstname, email, '', '', '', '', '', '', '', '', '', '', salt];
  return crypto.createHash('sha512').update(parts.join('|')).digest('hex');
}

// Reverse hash for webhook signature verification
// sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|KEY)
function payuReverseHash({ status, txnid, amount, productinfo, firstname, email, udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '' }, salt, key) {
  const str = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  return crypto.createHash('sha512').update(str).digest('hex');
}

// sha512(SALT|command|var1|KEY)
function payuVerifyHash(salt, txnid, key) {
  return crypto.createHash('sha512').update(`${salt}|verify_payment|${txnid}|${key}`).digest('hex');
}

async function getPayUTenantDetails(tenantId) {
  const [[tenant]] = await pool.execute(
    `SELECT t.name, u.email,
            REGEXP_REPLACE(wc.display_phone_number, '[^0-9]', '') AS phone
       FROM tenants t
       LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
       LEFT JOIN whatsapp_config wc ON wc.tenant_id = t.id AND wc.is_active = 1
      WHERE t.id = ? LIMIT 1`,
    [tenantId]
  );
  const rawPhone = tenant?.phone || '';
  const phone = (rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone) || '9999999999';
  return {
    firstname: (tenant?.name || 'VaartaBot User').split(' ')[0],
    email: tenant?.email || 'noreply@vaartabot.in',
    phone,
  };
}

// ─── POST /api/payments/payu/create-order ─────────────────────────────────────

router.post('/payu/create-order', async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ success: false, error: 'Invalid package' });

    const tenantId = req.user.tenantId;
    const txnid    = `VB_${tenantId}_${Date.now()}`;
    const amount   = pkg.price.toFixed(2);
    const key      = process.env.PAYU_KEY  || '';
    const salt     = process.env.PAYU_SALT || '';

    const { firstname, email, phone } = await getPayUTenantDetails(tenantId);
    const productinfo = `${pkg.name} — ${pkg.credits} credits`;

    const BACKEND  = (process.env.BACKEND_URL || 'https://vaartabot.com').replace(/\/$/, '');
    const surl     = `${BACKEND}/api/payments/payu/return`;
    const furl     = `${BACKEND}/api/payments/payu/return`;
    const hash     = payuForwardHash(key, txnid, amount, productinfo, firstname, email, salt);

    await pool.execute(
      `INSERT INTO transactions (tenant_id, type, amount, credits, description, status, transaction_ref, created_at)
       VALUES (?, 'purchase', ?, ?, ?, 'pending', ?, NOW())`,
      [tenantId, pkg.price, pkg.credits, productinfo, txnid]
    );

    console.log(`[PayU] 🆕 Order: ${txnid} | tenant:${tenantId} | ₹${pkg.price}`);

    res.json({ success: true, txnid, hash, key, amount, productinfo, firstname, email, phone, surl, furl, packageInfo: pkg });
  } catch (err) {
    console.error('[PayU:create-order]', err.message);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// ─── POST /api/payments/payu/verify ──────────────────────────────────────────

router.post('/payu/verify', async (req, res) => {
  try {
    const { txnid } = req.body;
    const tenantId  = req.user.tenantId;
    const key       = process.env.PAYU_KEY  || '';
    const salt      = process.env.PAYU_SALT || '';

    const verifyHash = payuVerifyHash(salt, txnid, key);
    const { data } = await axios.post(
      getPayUVerifyURL(),
      new URLSearchParams({ key, command: 'verify_payment', var1: txnid, hash: verifyHash }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const txnDetails = data?.transaction_details?.[txnid];
    const payuStatus = txnDetails?.status;
    const mihpayid   = txnDetails?.mihpayid || '';

    console.log(`[PayU:verify] txnid:${txnid} status:${payuStatus}`);

    if (payuStatus === 'success') {
      const [[txn]] = await pool.execute(
        'SELECT * FROM transactions WHERE transaction_ref = ? AND tenant_id = ? LIMIT 1',
        [txnid, tenantId]
      );
      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

      if (txn.status === 'completed') {
        const [[t]] = await pool.execute('SELECT credits_balance FROM tenants WHERE id = ?', [tenantId]);
        return res.json({ success: true, creditsAdded: txn.credits, newBalance: t.credits_balance, alreadyProcessed: true });
      }

      await pool.execute('UPDATE transactions SET status = "completed", payment_id = ?, updated_at = NOW() WHERE transaction_ref = ?', [mihpayid, txnid]);
      await pool.execute('UPDATE tenants SET credits_balance = credits_balance + ? WHERE id = ?', [txn.credits, tenantId]);
      const [[t]] = await pool.execute('SELECT credits_balance FROM tenants WHERE id = ?', [tenantId]);

      console.log(`[PayU:verify] ✅ Credits +${txn.credits} → tenant ${tenantId}`);
      return res.json({ success: true, creditsAdded: txn.credits, newBalance: t.credits_balance });
    }

    res.json({ success: false, status: payuStatus || 'unknown' });
  } catch (err) {
    console.error('[PayU:verify]', err.response?.data || err.message);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// ─── POST /api/payments/payu/create-ai-order ─────────────────────────────────

router.post('/payu/create-ai-order', async (req, res) => {
  try {
    const { packageId } = req.body;
    const pkg = AI_TOKEN_PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ success: false, error: 'Invalid AI token package' });

    const tenantId = req.user.tenantId;
    const txnid    = `VBAI_${tenantId}_${Date.now()}`;
    const amount   = pkg.price.toFixed(2);
    const key      = process.env.PAYU_KEY  || '';
    const salt     = process.env.PAYU_SALT || '';

    const { firstname, email, phone } = await getPayUTenantDetails(tenantId);
    const productinfo = `${pkg.name} — ${pkg.tokens.toLocaleString()} AI tokens`;

    const BACKEND  = (process.env.BACKEND_URL || 'https://vaartabot.com').replace(/\/$/, '');
    const surl     = `${BACKEND}/api/payments/payu/return`;
    const furl     = `${BACKEND}/api/payments/payu/return`;
    const hash     = payuForwardHash(key, txnid, amount, productinfo, firstname, email, salt);

    await pool.execute(
      `INSERT INTO transactions (tenant_id, type, amount, credits, description, status, transaction_ref, created_at)
       VALUES (?, 'ai_token_purchase', ?, ?, ?, 'pending', ?, NOW())`,
      [tenantId, pkg.price, pkg.tokens, productinfo, txnid]
    );

    console.log(`[PayU] 🤖 AI order: ${txnid} | tenant:${tenantId} | ₹${pkg.price}`);

    res.json({ success: true, txnid, hash, key, amount, productinfo, firstname, email, phone, surl, furl, packageInfo: pkg });
  } catch (err) {
    console.error('[PayU:create-ai-order]', err.message);
    res.status(500).json({ success: false, error: 'Failed to create AI token order' });
  }
});

// ─── POST /api/payments/payu/verify-ai ───────────────────────────────────────

router.post('/payu/verify-ai', async (req, res) => {
  try {
    const { txnid } = req.body;
    const tenantId  = req.user.tenantId;
    const key       = process.env.PAYU_KEY  || '';
    const salt      = process.env.PAYU_SALT || '';

    const verifyHash = payuVerifyHash(salt, txnid, key);
    const { data } = await axios.post(
      getPayUVerifyURL(),
      new URLSearchParams({ key, command: 'verify_payment', var1: txnid, hash: verifyHash }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const txnDetails = data?.transaction_details?.[txnid];
    const payuStatus = txnDetails?.status;
    const mihpayid   = txnDetails?.mihpayid || '';

    console.log(`[PayU:verify-ai] txnid:${txnid} status:${payuStatus}`);

    if (payuStatus === 'success') {
      const [[txn]] = await pool.execute(
        'SELECT * FROM transactions WHERE transaction_ref = ? AND tenant_id = ? LIMIT 1',
        [txnid, tenantId]
      );
      if (!txn) return res.status(404).json({ success: false, error: 'Transaction not found' });

      if (txn.status === 'completed') {
        const [[t]] = await pool.execute('SELECT ai_tokens_balance FROM tenants WHERE id = ?', [tenantId]);
        return res.json({ success: true, tokensAdded: txn.credits, newBalance: t.ai_tokens_balance, alreadyProcessed: true });
      }

      await pool.execute('UPDATE transactions SET status = "completed", payment_id = ?, updated_at = NOW() WHERE transaction_ref = ?', [mihpayid, txnid]);
      await pool.execute('UPDATE tenants SET ai_tokens_balance = ai_tokens_balance + ? WHERE id = ?', [txn.credits, tenantId]);
      const [[t]] = await pool.execute('SELECT ai_tokens_balance FROM tenants WHERE id = ?', [tenantId]);

      console.log(`[PayU:verify-ai] ✅ AI tokens +${txn.credits} → tenant ${tenantId}`);
      return res.json({ success: true, tokensAdded: txn.credits, newBalance: t.ai_tokens_balance });
    }

    res.json({ success: false, status: payuStatus || 'unknown' });
  } catch (err) {
    console.error('[PayU:verify-ai]', err.response?.data || err.message);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// ─── POST /api/payments/test-purchase (dev only) ──────────────────────────────

router.post('/test-purchase', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  try {
    const pkg = CREDIT_PACKAGES[req.body.packageId];
    if (!pkg) return res.status(400).json({ error: 'Invalid package' });

    await pool.execute(
      'UPDATE tenants SET credits_balance = credits_balance + ? WHERE id = ?',
      [pkg.credits, req.user.tenantId]
    );
    await pool.execute(
      `INSERT INTO transactions (tenant_id, type, credits, amount, status, description, created_at)
       VALUES (?, 'credit', ?, ?, 'completed', ?, NOW())`,
      [req.user.tenantId, pkg.credits, pkg.price, `Test purchase — ${pkg.credits.toLocaleString()} credits`]
    );

    res.json({ success: true, creditsAdded: pkg.credits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;