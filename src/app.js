// src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
dotenv.config();

import * as rateLimiter from './middleware/rateLimiter.js';
import * as eh from './middleware/errorHandler.js';
const apiLimiter = rateLimiter.default || rateLimiter;
const errorHandler = eh.default || eh;

import tenantsRouter from './routes/tenants.js';
import leadsRouter from './routes/leads.js';
import staffRouter from './routes/staff.js';
import dashboardRouter from './routes/dashboard.js';
import appointmentsRouter from './routes/appointments.js';
import campaignsRouter from './routes/campaigns.js';
import transactionsRouter from './routes/transactions.js';
import whatsappRouter from './routes/whatsapp.js';
import webhookRouter from './routes/webhook.js';
import paymentsRouter from './routes/payments.js';
import authRoutes from './routes/authRoutes.js';
import systemRouter from './routes/system.js';
import reportsRouter from './routes/reports.js';
import flowConfigRouter from './routes/flowConfig.js';
import flowsRouter from './routes/flows.js';
import superAdminRouter from './routes/superadmin.js';
import apiKeysRouter from './routes/apiKeys.js';
import webhookSubscriptionsRouter from './routes/webhookSubscriptions.js';
import v1CreditsRouter from './routes/v1/credits.js';
import v1MessagesRouter from './routes/v1/messages.js';
import v1TemplatesRouter from './routes/v1/templates.js';
import v1WebhooksRouter from './routes/v1/webhooks.js';
import v1ContactsRouter from './routes/v1/contacts.js';
import contactsRouter from './routes/contacts.js';
import inboxRouter from './routes/inbox.js';
import tenantSettingsRouter from './routes/tenantSettings.js';
import dripRouter from './routes/drip.js';
import onboardingRouter from './routes/onboarding.js';
import aiRouter from './routes/ai.js';
import templatesRouter from './routes/templates.js';
import { startCampaignScheduler } from './services/campaignScheduler.js';
import { startDripScheduler } from './services/dripScheduler.js';

import * as logger from './utils/logger.js';
const log = logger.log || console.log;

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true,
}));
app.use(cookieParser());

// ── ❗ CRITICAL: Raw body for Cashfree webhook ──────────────────────────────
// MUST be before express.json() — Cashfree signature verification needs raw body
app.use('/api/payments/cashfree/webhook', express.raw({ type: '*/*' }));

// ── ❗ CRITICAL: WhatsApp webhook before rate limiter ───────────────────────
// Meta sends GET (verify) and POST (messages) without auth
app.use('/api/whatsapp', webhookRouter);

// Normal body parsers for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', apiLimiter);

// Auth routes
app.use('/api/auth', authRoutes);

// System routes
app.use('/api/system', systemRouter);

// Protected routes
app.use('/api/tenant', tenantsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/staff', staffRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/flow-config', flowConfigRouter);
app.use('/api/flows', flowsRouter);
app.use('/api/superadmin', superAdminRouter);

// Tenant API key management (JWT-protected)
app.use('/api/api-keys', apiKeysRouter);

// Webhook subscription management (JWT-protected, dashboard-facing)
app.use('/api/webhook-subscriptions', webhookSubscriptionsRouter);

// Contacts management (JWT-protected, dashboard-facing)
app.use('/api/contacts', contactsRouter);

// Inbox / chat threads (JWT-protected, dashboard-facing)
app.use('/api/inbox', inboxRouter);

// Tenant settings — business hours, credit threshold, etc.
app.use('/api/tenant-settings', tenantSettingsRouter);

// Drip sequences
app.use('/api/drip', dripRouter);

// Onboarding status
app.use('/api/onboarding', onboardingRouter);

// AI features (Ollama-backed)
app.use('/api/ai', aiRouter);

// WhatsApp template management (JWT-protected, dashboard-facing)
app.use('/api/templates', templatesRouter);

// CRM Integration API v1 (API-key-protected)
app.use('/api/v1/credits',   v1CreditsRouter);
app.use('/api/v1/messages',  v1MessagesRouter);
app.use('/api/v1/templates', v1TemplatesRouter);
app.use('/api/v1/webhooks',  v1WebhooksRouter);
app.use('/api/v1/contacts',  v1ContactsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  log(`🚀 Server listening on port ${port}`);
  startCampaignScheduler();
  startDripScheduler();
});