import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Plus, Trash2, Copy, Check, Eye, EyeOff,
  ChevronDown, ChevronRight, AlertCircle, Zap,
  Activity, BookOpen, Terminal, Shield, ToggleLeft, ToggleRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';


// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  is_active: boolean;
  last_used: string | null;
  created_at: string;
}

interface WebhookSub {
  id: number;
  name: string;
  url: string;
  events: string;
  is_active: boolean;
  failure_count: number;
  last_triggered: string | null;
  created_at: string;
}

const WEBHOOK_EVENTS = ['message.received', 'message.delivered', 'message.read', 'message.failed'];

interface Endpoint {
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  path: string;
  summary: string;
  description: string;
  auth: 'apikey' | 'jwt';
  body?: { field: string; type: string; required: boolean; desc: string }[];
  query?: { field: string; type: string; default?: string; desc: string }[];
  example: { request: string; response: string };
}

// ─── Docs data ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://vaartabot.com/api/v1';

const SECTIONS: { id: string; label: string; endpoints: Endpoint[] }[] = [
  {
    id: 'credits',
    label: 'Credits',
    endpoints: [
      {
        method: 'GET',
        path: '/credits/balance',
        summary: 'Check credit balance',
        auth: 'apikey',
        description: 'Returns current credit balance and total messages sent for the account linked to your API key.',
        example: {
          request: `curl ${BASE_URL}/credits/balance \\
  -H "X-API-Key: vb_your_key"`,
          response: `{
  "success": true,
  "data": {
    "creditsBalance": 1480,
    "totalMessagesSent": 3520
  }
}`,
        },
      },
      {
        method: 'GET',
        path: '/credits/packages',
        summary: 'List credit packages',
        auth: 'apikey',
        description: 'Returns all available credit purchase packages with pricing.',
        example: {
          request: `curl ${BASE_URL}/credits/packages \\
  -H "X-API-Key: vb_your_key"`,
          response: `{
  "success": true,
  "data": [
    { "id": 1, "name": "Starter",    "credits": 500,   "price": 999   },
    { "id": 2, "name": "Basic",      "credits": 2000,  "price": 3499  },
    { "id": 3, "name": "Growth",     "credits": 5000,  "price": 8499  },
    { "id": 4, "name": "Pro",        "credits": 15000, "price": 23999 },
    { "id": 5, "name": "Enterprise", "credits": 30000, "price": 44999 }
  ]
}`,
        },
      },
      {
        method: 'GET',
        path: '/credits/transactions',
        summary: 'Transaction history',
        auth: 'apikey',
        description: 'Paginated list of credit transactions — purchases and usage.',
        query: [
          { field: 'limit', type: 'integer', default: '20', desc: 'Records per page (max 100)' },
          { field: 'offset', type: 'integer', default: '0', desc: 'Offset for pagination' },
        ],
        example: {
          request: `curl "${BASE_URL}/credits/transactions?limit=20&offset=0" \\
  -H "X-API-Key: vb_your_key"`,
          response: `{
  "success": true,
  "data": [
    {
      "id": 142, "type": "purchase",
      "amount": 3499, "credits": 2000,
      "description": "Basic — 2,000 credits",
      "status": "completed",
      "created_at": "2026-07-10T08:22:14.000Z"
    }
  ]
}`,
        },
      },
    ],
  },
  {
    id: 'messages',
    label: 'Messaging',
    endpoints: [
      {
        method: 'POST',
        path: '/messages/send',
        summary: 'Send a single message — 1 credit',
        auth: 'apikey',
        description: 'Send a WhatsApp template message to one recipient. Deducts 1 credit on success. Only Meta-approved templates work.',
        body: [
          { field: 'to', type: 'string', required: true, desc: 'Phone number (10-digit or E.164 with country code)' },
          { field: 'templateName', type: 'string', required: true, desc: 'Exact name of the approved WhatsApp template' },
          { field: 'language', type: 'string', required: false, desc: 'Language code, default "en"' },
          { field: 'variables', type: 'string[]', required: false, desc: 'Values to fill {{1}}, {{2}} … placeholders in order' },
        ],
        example: {
          request: `curl -X POST ${BASE_URL}/messages/send \\
  -H "X-API-Key: vb_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "9876543210",
    "templateName": "summer_sale_promo",
    "language": "en",
    "variables": ["Priya", "30%", "July 31"]
  }'`,
          response: `{
  "success": true,
  "data": {
    "messageId": "wamid.HBgM...",
    "logId": 2847,
    "to": "919876543210",
    "templateName": "summer_sale_promo",
    "creditsUsed": 1
  }
}`,
        },
      },
      {
        method: 'POST',
        path: '/messages/reply',
        summary: 'Reply with free text — no credits',
        auth: 'apikey',
        description: 'Send a free-text reply to a user who messaged you first. WhatsApp only allows this within 24 hours of the user\'s last message — calls outside that window return a 422. No template approval needed. No credit cost.',
        body: [
          { field: 'to', type: 'string', required: true, desc: 'Phone number (10-digit or E.164 with country code)' },
          { field: 'message', type: 'string', required: true, desc: 'Free-form text to send (max 4096 characters)' },
        ],
        example: {
          request: `curl -X POST ${BASE_URL}/messages/reply \\
  -H "X-API-Key: vb_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "9876543210",
    "message": "Hi Priya! Thanks for reaching out. Let me check availability and get back to you shortly."
  }'`,
          response: `{
  "success": true,
  "data": {
    "messageId": "wamid.HBgM...",
    "logId": 2849,
    "to": "919876543210"
  }
}`,
        },
      },
      {
        method: 'POST',
        path: '/messages/bulk-send',
        summary: 'Bulk send — 1 credit each',
        auth: 'apikey',
        description: 'Send the same template to up to 500 recipients. Credits are only charged for successfully delivered messages.',
        body: [
          { field: 'templateName', type: 'string', required: true, desc: 'Approved template name (same for all recipients)' },
          { field: 'language', type: 'string', required: false, desc: 'Language code, default "en"' },
          { field: 'recipients', type: 'array', required: true, desc: 'Array of recipient objects (max 500)' },
          { field: 'recipients[].to', type: 'string', required: true, desc: 'Phone number' },
          { field: 'recipients[].variables', type: 'string[]', required: false, desc: 'Per-recipient template variable values' },
        ],
        example: {
          request: `curl -X POST ${BASE_URL}/messages/bulk-send \\
  -H "X-API-Key: vb_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "templateName": "summer_sale_promo",
    "recipients": [
      { "to": "9876543210", "variables": ["Priya", "30%"] },
      { "to": "9123456789", "variables": ["Rahul", "25%"] }
    ]
  }'`,
          response: `{
  "success": true,
  "data": {
    "sent": 2, "failed": 0, "total": 2,
    "creditsUsed": 2, "creditsRemaining": 1478,
    "results": [
      { "to": "919876543210", "status": "sent", "messageId": "wamid.ABC..." },
      { "to": "919123456789", "status": "sent", "messageId": "wamid.DEF..." }
    ]
  }
}`,
        },
      },
      {
        method: 'GET',
        path: '/messages/status/:messageId',
        summary: 'Delivery status',
        auth: 'apikey',
        description: 'Look up delivery status of a message by the messageId returned from a send call.',
        example: {
          request: `curl ${BASE_URL}/messages/status/wamid.HBgM... \\
  -H "X-API-Key: vb_your_key"`,
          response: `{
  "success": true,
  "data": {
    "status": "delivered",
    "contact_phone": "919876543210",
    "sent_at": "2026-07-12T09:15:00.000Z",
    "delivered_at": "2026-07-12T09:15:04.000Z",
    "read_at": null
  }
}`,
        },
      },
      {
        method: 'GET',
        path: '/messages/logs',
        summary: 'Message logs',
        auth: 'apikey',
        description: 'Paginated message history. Filter by direction (inbound/outbound) or a specific phone number.',
        query: [
          { field: 'direction', type: 'string', default: '—', desc: 'inbound | outbound — omit for all' },
          { field: 'phone', type: 'string', default: '—', desc: 'Filter by contact phone number' },
          { field: 'limit', type: 'integer', default: '20', desc: 'Max records (up to 100)' },
          { field: 'offset', type: 'integer', default: '0', desc: 'Pagination offset' },
        ],
        example: {
          request: `curl "${BASE_URL}/messages/logs?direction=inbound&limit=50" \\
  -H "X-API-Key: vb_your_key"`,
          response: `{
  "success": true,
  "data": [
    {
      "id": 2848, "contact_phone": "919876543210",
      "message": "I want to book an appointment",
      "direction": "inbound", "status": "received",
      "received_at": "2026-07-12T09:30:00.000Z"
    }
  ],
  "limit": 50, "offset": 0
}`,
        },
      },
      {
        method: 'GET',
        path: '/messages/inbox',
        summary: 'Inbox — inbound replies only',
        auth: 'apikey',
        description: 'Returns only messages sent by WhatsApp users to your business number. Optionally filter by a specific contact.',
        query: [
          { field: 'phone', type: 'string', default: '—', desc: 'Filter conversation with one contact' },
          { field: 'limit', type: 'integer', default: '20', desc: 'Max records (up to 100)' },
          { field: 'offset', type: 'integer', default: '0', desc: 'Pagination offset' },
        ],
        example: {
          request: `curl "${BASE_URL}/messages/inbox?phone=919876543210" \\
  -H "X-API-Key: vb_your_key"`,
          response: `{
  "success": true,
  "data": [
    {
      "id": 2848,
      "contact_phone": "919876543210",
      "message": "I want to book an appointment",
      "status": "received",
      "received_at": "2026-07-12T09:30:00.000Z",
      "message_id": "wamid.HBgM..."
    }
  ],
  "limit": 20, "offset": 0
}`,
        },
      },
    ],
  },
  {
    id: 'templates',
    label: 'Templates',
    endpoints: [
      {
        method: 'GET',
        path: '/templates',
        summary: 'List templates',
        auth: 'apikey',
        description: 'Fetch all message templates from Meta for your WhatsApp Business Account. Filter by status or category.',
        query: [
          { field: 'status', type: 'string', default: '—', desc: 'APPROVED | PENDING | REJECTED' },
          { field: 'category', type: 'string', default: '—', desc: 'MARKETING | UTILITY | AUTHENTICATION' },
        ],
        example: {
          request: `curl "${BASE_URL}/templates?status=APPROVED" \\
  -H "X-API-Key: vb_your_key"`,
          response: `{
  "success": true,
  "total": 2,
  "data": [
    {
      "id": "123456789",
      "name": "order_confirmation",
      "status": "APPROVED",
      "category": "UTILITY",
      "language": "en",
      "components": [
        { "type": "BODY", "text": "Hi {{1}}, your order {{2}} is confirmed." }
      ]
    }
  ]
}`,
        },
      },
      {
        method: 'GET',
        path: '/templates/sync',
        summary: 'Sync templates from Meta',
        auth: 'apikey',
        description: 'Re-fetches the latest template list directly from Meta (same as GET /templates but includes a synced_at timestamp).',
        example: {
          request: `curl ${BASE_URL}/templates/sync \\
  -H "X-API-Key: vb_your_key"`,
          response: `{
  "success": true,
  "total": 4,
  "synced_at": "2026-07-12T09:45:00.000Z",
  "data": [ ... ]
}`,
        },
      },
      {
        method: 'POST',
        path: '/templates',
        summary: 'Create a template',
        auth: 'apikey',
        description: 'Submit a new WhatsApp message template to Meta for approval. Use {{1}}, {{2}} … for variable placeholders in the BODY. Approval typically takes a few minutes to 24 hours.',
        body: [
          { field: 'name', type: 'string', required: true, desc: 'Lowercase, underscores only (e.g. order_confirmation)' },
          { field: 'category', type: 'string', required: true, desc: 'MARKETING | UTILITY | AUTHENTICATION' },
          { field: 'language', type: 'string', required: true, desc: 'Language code: en, en_US, hi …' },
          { field: 'components', type: 'array', required: true, desc: 'Meta template components — HEADER, BODY, FOOTER, BUTTONS' },
        ],
        example: {
          request: `curl -X POST ${BASE_URL}/templates \\
  -H "X-API-Key: vb_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "order_confirmation",
    "category": "UTILITY",
    "language": "en",
    "components": [
      { "type": "HEADER", "format": "TEXT", "text": "Order Update" },
      { "type": "BODY",   "text": "Hi {{1}}, order {{2}} confirmed. Arrives {{3}}." },
      { "type": "FOOTER", "text": "Reply STOP to opt out." }
    ]
  }'`,
          response: `{
  "success": true,
  "data": {
    "templateId": "987654321",
    "name": "order_confirmation",
    "category": "UTILITY",
    "language": "en",
    "status": "PENDING",
    "note": "Template submitted for Meta review. Approval typically takes a few minutes to 24 hours."
  }
}`,
        },
      },
    ],
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    endpoints: [
      {
        method: 'GET',
        path: '/webhooks',
        summary: 'List webhook subscriptions',
        auth: 'apikey',
        description: 'Returns all registered webhook endpoints for this account, including their status and failure count.',
        example: {
          request: `curl ${BASE_URL}/webhooks \\
  -H "X-API-Key: vb_your_key"`,
          response: `{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "My CRM",
      "url": "https://mycrm.com/webhooks/whatsapp",
      "events": "message.received",
      "is_active": true,
      "failure_count": 0,
      "last_triggered": "2026-07-12T09:30:00.000Z"
    }
  ]
}`,
        },
      },
      {
        method: 'POST',
        path: '/webhooks',
        summary: 'Register a webhook',
        auth: 'apikey',
        description: 'Register a callback URL to receive real-time push notifications. Vaartabot POSTs a signed JSON payload to your URL whenever a subscribed event occurs. The signing secret is shown only once.',
        body: [
          { field: 'name', type: 'string', required: true, desc: 'Friendly label (e.g. "My CRM")' },
          { field: 'url', type: 'string', required: true, desc: 'HTTPS endpoint that accepts POST requests' },
          { field: 'events', type: 'string[]', required: false, desc: 'Events to subscribe to (default: ["message.received"])' },
        ],
        example: {
          request: `curl -X POST ${BASE_URL}/webhooks \\
  -H "X-API-Key: vb_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My CRM",
    "url": "https://mycrm.com/webhooks/whatsapp",
    "events": ["message.received"]
  }'`,
          response: `{
  "success": true,
  "data": {
    "id": 1,
    "name": "My CRM",
    "url": "https://mycrm.com/webhooks/whatsapp",
    "events": ["message.received"],
    "is_active": true,
    "secret": "a3f9c2e1...",
    "note": "Save your signing secret now — it will not be shown again."
  }
}`,
        },
      },
      {
        method: 'POST',
        path: '/webhooks/:id/test',
        summary: 'Send a test ping',
        auth: 'apikey',
        description: 'Sends a test event to your registered URL so you can verify receipt and signature validation before going live.',
        example: {
          request: `curl -X POST ${BASE_URL}/webhooks/1/test \\
  -H "X-API-Key: vb_your_key"`,
          response: `{
  "success": true,
  "data": {
    "url": "https://mycrm.com/webhooks/whatsapp",
    "statusCode": 200,
    "message": "Test ping delivered — your server responded 200"
  }
}`,
        },
      },
      {
        method: 'PATCH',
        path: '/webhooks/:id',
        summary: 'Update or disable a webhook',
        auth: 'apikey',
        description: 'Update the URL, name, subscribed events, or toggle the webhook on/off.',
        body: [
          { field: 'url', type: 'string', required: false, desc: 'New HTTPS URL' },
          { field: 'name', type: 'string', required: false, desc: 'New label' },
          { field: 'events', type: 'string[]', required: false, desc: 'New event list' },
          { field: 'is_active', type: 'boolean', required: false, desc: 'false to pause, true to resume' },
        ],
        example: {
          request: `curl -X PATCH ${BASE_URL}/webhooks/1 \\
  -H "X-API-Key: vb_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "is_active": false }'`,
          response: `{ "success": true, "message": "Webhook updated" }`,
        },
      },
      {
        method: 'DELETE',
        path: '/webhooks/:id',
        summary: 'Remove a webhook',
        auth: 'apikey',
        description: 'Permanently removes the webhook subscription. No more events will be pushed to that URL.',
        example: {
          request: `curl -X DELETE ${BASE_URL}/webhooks/1 \\
  -H "X-API-Key: vb_your_key"`,
          response: `{ "success": true, "message": "Webhook deleted" }`,
        },
      },
    ],
  },
];

const ERROR_CODES = [
  { code: '400', label: 'Bad Request', desc: 'Missing or invalid request fields — check the error message for details' },
  { code: '401', label: 'Unauthorized', desc: 'Missing or invalid X-API-Key header' },
  { code: '402', label: 'Payment Required', desc: 'Insufficient credits — purchase more at vaartabot.com/billing' },
  { code: '404', label: 'Not Found', desc: 'Message ID, template, or webhook subscription does not exist' },
  { code: '422', label: 'Unprocessable Entity', desc: 'WhatsApp rejected the request — check template name, variable count, or template status' },
  { code: '429', label: 'Too Many Requests', desc: 'Rate limit hit — check Retry-After header' },
  { code: '502', label: 'Bad Gateway', desc: 'Meta Graph API returned an error — retry or check Meta status' },
  { code: '500', label: 'Internal Server Error', desc: 'Retry with back-off; contact support if it persists' },
];

const WEBHOOK_PAYLOAD_EXAMPLE = `{
  "event": "message.received",
  "tenant_id": 42,
  "timestamp": "2026-07-12T09:30:00.000Z",
  "data": {
    "message_id": "wamid.HBgM...",
    "from": "919876543210",
    "type": "text",
    "text": "I want to book an appointment",
    "received_at": "2026-07-12T09:30:00.000Z"
  }
}`;

const WEBHOOK_VERIFY_EXAMPLE = `// Node.js — verify the X-Vaartabot-Signature header
const crypto = require('crypto');

function verifyWebhook(rawBody, signatureHeader, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)            // rawBody must be the raw Buffer, not parsed JSON
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}

// Express example
app.post('/webhooks/whatsapp', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-vaartabot-signature'];
  if (!verifyWebhook(req.body, sig, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  const event = JSON.parse(req.body);
  console.log('New message from', event.data.from, ':', event.data.text);
  res.sendStatus(200);
});`;

// ─── Sub-components ───────────────────────────────────────────────────────────

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  POST: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  DELETE: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  PATCH: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={cn(
      'inline-flex items-center font-mono text-[11px] font-bold px-1.5 py-0.5 rounded',
      METHOD_STYLES[method],
    )}>
      {method}
    </span>
  );
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      className={cn(
        'p-1.5 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground',
        className,
      )}
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-border text-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border-b border-border">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-foreground bg-muted/30">
        {code}
      </pre>
    </div>
  );
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'request' | 'response'>('request');

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        <MethodBadge method={ep.method} />
        <code className="text-sm font-mono text-foreground flex-1">{ep.path}</code>
        <span className="text-xs text-muted-foreground hidden sm:block">{ep.summary}</span>
        {open
          ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-1 border-t border-border space-y-4">
              <p className="text-sm text-muted-foreground">{ep.description}</p>

              {/* Auth indicator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5" />
                {ep.auth === 'apikey'
                  ? <span>Requires <code className="bg-muted px-1 rounded">X-API-Key</code> header</span>
                  : <span>Requires <code className="bg-muted px-1 rounded">Authorization: Bearer</code> JWT</span>
                }
              </div>

              {/* Body params */}
              {ep.body && ep.body.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Request body</p>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Field</th>
                          <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                          <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.body.map(p => (
                          <tr key={p.field} className="border-b border-border last:border-0">
                            <td className="px-3 py-2">
                              <code className="text-xs text-foreground">{p.field}</code>
                              {p.required && (
                                <span className="ml-1.5 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-1 rounded">req</span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.type}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">{p.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Query params */}
              {ep.query && ep.query.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Query parameters</p>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Param</th>
                          <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Default</th>
                          <th className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.query.map(q => (
                          <tr key={q.field} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 font-mono text-xs text-foreground">{q.field}</td>
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{q.default ?? '—'}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">{q.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Example tabs */}
              <div>
                <div className="flex gap-1 mb-2">
                  {(['request', 'response'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={cn(
                        'text-xs px-3 py-1 rounded-md font-medium capitalize transition-colors',
                        tab === t
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <CodeBlock
                  lang={tab === 'request' ? 'cURL' : 'JSON'}
                  code={tab === 'request' ? ep.example.request : ep.example.response}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── API Key Manager ──────────────────────────────────────────────────────────

function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/api-keys');
      setKeys(data.data ?? []);
    } catch {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/api/api-keys', { name: newKeyName.trim() });
      setRevealedKey(data.data.key);
      setNewKeyName('');
      setShowNew(false);
      load();
      toast.success('API key created — save it now, it won\'t appear again');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const toggleKey = async (key: ApiKey) => {
    setToggling(key.id);
    try {
      await api.patch(`/api/api-keys/${key.id}`, { is_active: !key.is_active });
      setKeys(prev => prev.map(k => k.id === key.id ? { ...k, is_active: !k.is_active } : k));
      toast.success(`Key ${key.is_active ? 'disabled' : 'enabled'}`);
    } catch {
      toast.error('Failed to update key');
    } finally {
      setToggling(null);
    }
  };

  const deleteKey = async (key: ApiKey) => {
    if (!window.confirm(`Revoke "${key.name}"? Any CRM using this key will stop working immediately.`)) return;
    setDeleting(key.id);
    try {
      await api.delete(`/api/api-keys/${key.id}`);
      setKeys(prev => prev.filter(k => k.id !== key.id));
      toast.success('API key revoked');
    } catch {
      toast.error('Failed to revoke key');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* One-time reveal */}
      <AnimatePresence>
        {revealedKey && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/40 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">
                  Copy your key now — it won't be shown again
                </p>
                <div className="flex items-center gap-2 bg-white dark:bg-black/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                  <code className="text-sm font-mono text-green-700 dark:text-green-300 flex-1 break-all">
                    {revealedKey}
                  </code>
                  <CopyButton text={revealedKey} />
                </div>
              </div>
            </div>
            <button
              onClick={() => setRevealedKey(null)}
              className="mt-3 text-xs text-green-600 dark:text-green-400 hover:underline"
            >
              I've saved it — dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key list */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Activity className="w-4 h-4 animate-pulse" /> Loading…
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
          <Key className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No API keys yet. Create one to start integrating your CRM.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(key => (
            <motion.div
              key={key.id}
              layout
              className={cn(
                'flex items-center gap-3 border border-border rounded-xl px-4 py-3 transition-colors',
                !key.is_active && 'opacity-50',
              )}
            >
              <Key className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{key.name}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {key.key_prefix}•••••••••••••
                  {key.last_used && (
                    <span className="ml-2">· last used {new Date(key.last_used).toLocaleDateString()}</span>
                  )}
                </p>
              </div>
              <Badge variant={key.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                {key.is_active ? 'Active' : 'Disabled'}
              </Badge>
              <button
                onClick={() => toggleKey(key)}
                disabled={toggling === key.id}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={key.is_active ? 'Disable key' : 'Enable key'}
              >
                {key.is_active
                  ? <ToggleRight className="w-5 h-5 text-primary" />
                  : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button
                onClick={() => deleteKey(key)}
                disabled={deleting === key.id}
                className="text-muted-foreground hover:text-red-500 transition-colors"
                title="Revoke key"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-border rounded-xl p-4 space-y-3 overflow-hidden"
          >
            <Label htmlFor="key-name" className="text-sm">Key name</Label>
            <div className="flex gap-2">
              <Input
                id="key-name"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="e.g. Zoho CRM Production"
                onKeyDown={e => e.key === 'Enter' && createKey()}
                className="flex-1"
              />
              <Button onClick={createKey} disabled={creating || !newKeyName.trim()}>
                {creating ? 'Creating…' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => { setShowNew(false); setNewKeyName(''); }}>
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showNew && (
        <Button
          variant="outline"
          onClick={() => setShowNew(true)}
          className="gap-2"
          disabled={keys.length >= 10}
        >
          <Plus className="w-4 h-4" />
          {keys.length >= 10 ? 'Maximum 10 keys reached' : 'Generate new key'}
        </Button>
      )}
    </div>
  );
}

// ─── WebhookManager ────────────────────────────────────────────────────────────

function WebhookManager() {
  const [subs, setSubs] = useState<WebhookSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>(['message.received']);
  const [revealedSecret, setRevealedSecret] = useState<{ id: number; secret: string } | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [testing, setTesting] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; ok: boolean; msg: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/webhook-subscriptions');
      setSubs(data.data ?? []);
    } catch {
      toast.error('Failed to load webhook subscriptions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!newName.trim() || !newUrl.trim() || !newEvents.length) return;
    setCreating(true);
    try {
      const { data } = await api.post('/api/webhook-subscriptions', {
        name: newName.trim(),
        url: newUrl.trim(),
        events: newEvents,
      });
      setRevealedSecret({ id: data.data.id, secret: data.data.secret });
      setNewName('');
      setNewUrl('');
      setNewEvents(['message.received']);
      setShowNew(false);
      load();
      toast.success('Webhook registered — save your signing secret now');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to register webhook');
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (sub: WebhookSub) => {
    setToggling(sub.id);
    try {
      await api.patch(`/api/webhook-subscriptions/${sub.id}`, { is_active: !sub.is_active });
      setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, is_active: !s.is_active } : s));
      toast.success(`Webhook ${sub.is_active ? 'disabled' : 'enabled'}`);
    } catch {
      toast.error('Failed to update webhook');
    } finally {
      setToggling(null);
    }
  };

  const remove = async (sub: WebhookSub) => {
    if (!window.confirm(`Delete webhook "${sub.name}"? This cannot be undone.`)) return;
    setDeleting(sub.id);
    try {
      await api.delete(`/api/webhook-subscriptions/${sub.id}`);
      setSubs(prev => prev.filter(s => s.id !== sub.id));
      toast.success('Webhook deleted');
    } catch {
      toast.error('Failed to delete webhook');
    } finally {
      setDeleting(null);
    }
  };

  const testPing = async (sub: WebhookSub) => {
    setTesting(sub.id);
    setTestResult(null);
    try {
      const { data } = await api.post(`/api/webhook-subscriptions/${sub.id}/test`);
      setTestResult({ id: sub.id, ok: true, msg: data.data.message });
    } catch (err: any) {
      setTestResult({ id: sub.id, ok: false, msg: err.response?.data?.error ?? 'Test ping failed' });
    } finally {
      setTesting(null);
    }
  };

  const toggleEvent = (ev: string) => {
    setNewEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
  };

  return (
    <div className="space-y-4">
      {/* One-time secret reveal */}
      <AnimatePresence>
        {revealedSecret && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/40 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">
                  Copy your signing secret — it won't be shown again
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mb-2">
                  Use it to verify <code className="bg-green-100 dark:bg-green-900/40 px-1 rounded">X-Vaartabot-Signature</code> on every event your server receives.
                </p>
                <div className="flex items-center gap-2 bg-white dark:bg-black/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                  <code className="text-sm font-mono text-green-700 dark:text-green-300 flex-1 break-all">
                    {revealedSecret.secret}
                  </code>
                  <CopyButton text={revealedSecret.secret} />
                </div>
              </div>
            </div>
            <button
              onClick={() => setRevealedSecret(null)}
              className="mt-3 text-xs text-green-600 dark:text-green-400 hover:underline"
            >
              I've saved it — dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subscription list */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
          <Activity className="w-4 h-4 animate-pulse" /> Loading…
        </div>
      ) : subs.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
          <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No webhook subscriptions yet. Register one to receive real-time message events.
        </div>
      ) : (
        <div className="space-y-2">
          {subs.map(sub => (
            <motion.div key={sub.id} layout className={cn('border border-border rounded-xl p-4 space-y-3', !sub.is_active && 'opacity-60')}>
              <div className="flex items-start gap-3">
                <Zap className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{sub.name}</p>
                  <p className="text-xs font-mono text-muted-foreground truncate">{sub.url}</p>
                  {sub.last_triggered && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Last fired {new Date(sub.last_triggered).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Badge variant={sub.is_active ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                  {sub.is_active ? 'Active' : 'Paused'}
                </Badge>
                <button
                  onClick={() => toggle(sub)}
                  disabled={toggling === sub.id}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={sub.is_active ? 'Pause webhook' : 'Enable webhook'}
                >
                  {sub.is_active
                    ? <ToggleRight className="w-5 h-5 text-primary" />
                    : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => remove(sub)}
                  disabled={deleting === sub.id}
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                  title="Delete webhook"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Event chips + failure count */}
              <div className="flex flex-wrap gap-1 pl-7">
                {sub.events.split(',').map(ev => (
                  <span key={ev} className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    {ev}
                  </span>
                ))}
                {sub.failure_count > 0 && (
                  <span className="text-[10px] font-medium text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
                    {sub.failure_count} failure{sub.failure_count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Test ping */}
              <div className="pl-7 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testPing(sub)}
                  disabled={testing === sub.id}
                  className="text-xs h-7 gap-1.5"
                >
                  <Activity className="w-3 h-3" />
                  {testing === sub.id ? 'Sending…' : 'Send test ping'}
                </Button>
                {testResult?.id === sub.id && (
                  <span className={cn('text-xs', testResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                    {testResult.msg}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-border rounded-xl p-4 space-y-4 overflow-hidden"
          >
            <div className="space-y-1.5">
              <Label htmlFor="wh-name" className="text-sm">Name</Label>
              <Input
                id="wh-name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. My CRM Listener"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-url" className="text-sm">
                URL <span className="text-muted-foreground font-normal">(must be HTTPS)</span>
              </Label>
              <Input
                id="wh-url"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="https://your-crm.com/webhooks/vaartabot"
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Events</Label>
              <div className="flex flex-wrap gap-3">
                {WEBHOOK_EVENTS.map(ev => (
                  <label key={ev} className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newEvents.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                      className="rounded border-border"
                    />
                    <span className="text-xs font-mono text-foreground">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={create}
                disabled={creating || !newName.trim() || !newUrl.trim() || !newEvents.length}
              >
                {creating ? 'Registering…' : 'Register webhook'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowNew(false);
                  setNewName('');
                  setNewUrl('');
                  setNewEvents(['message.received']);
                }}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showNew && (
        <Button
          variant="outline"
          onClick={() => setShowNew(true)}
          className="gap-2"
          disabled={subs.length >= 5}
        >
          <Plus className="w-4 h-4" />
          {subs.length >= 5 ? 'Maximum 5 webhooks reached' : 'Register webhook'}
        </Button>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'keys', label: 'API Keys', icon: Key },
  { id: 'docs', label: 'Reference', icon: BookOpen },
  { id: 'errors', label: 'Error Codes', icon: AlertCircle },
  { id: 'webhooks', label: 'Webhooks', icon: Zap },
] as const;

type Tab = typeof TABS[number]['id'];

export default function ApiDocs() {
  const [tab, setTab] = useState<Tab>('keys');

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">CRM Integration</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">API Reference</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              Connect your CRM to Vaartabot to send WhatsApp campaigns using your credits.
              Generate an API key below and use it in your integration.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              API Live
            </div>
            <a
              href="/api-reference.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 border border-border rounded-full px-3 py-1.5 transition-colors hover:border-foreground/30"
            >
              <ExternalLink className="w-3 h-3" />
              Full docs
            </a>
          </div>
        </div>

        {/* Base URL chip */}
        <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-4 py-2.5 text-sm overflow-x-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">Base URL</span>
          <code className="font-mono text-primary font-medium">{BASE_URL}</code>
          <CopyButton text={BASE_URL} className="ml-auto" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: API Keys */}
        {tab === 'keys' && (
          <motion.div key="keys" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">Your API Keys</h2>
                <p className="text-sm text-muted-foreground">
                  Each key gives a CRM application access to your WhatsApp credits and sending APIs.
                  Keys are tied to this account — all usage is billed from your shared credit balance.
                </p>
              </div>

              {/* Auth header example */}
              <div className="bg-muted/40 border border-border rounded-xl p-4 text-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">How to use in your CRM</p>
                <code className="font-mono text-xs text-foreground leading-relaxed block">
                  X-API-Key: vb_your_api_key_here
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Add this header to every request. Keys start with <code className="bg-muted px-1 rounded">vb_</code>.
                </p>
              </div>

              <ApiKeyManager />
            </div>

            {/* Quick-start */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">Quick start</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { n: '1', title: 'Generate key', desc: 'Create an API key above and copy it into your CRM config.' },
                  { n: '2', title: 'Check balance', desc: 'Call GET /credits/balance to confirm credits are available.' },
                  { n: '3', title: 'Send messages', desc: 'Call POST /messages/send with your approved template name.' },
                ].map(s => (
                  <div key={s.n} className="flex gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{s.n}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: Reference */}
        {tab === 'docs' && (
          <motion.div key="docs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Auth box */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Authentication</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                All <code className="bg-muted px-1 rounded text-foreground">/api/v1/</code> endpoints require the
                <code className="bg-muted px-1 rounded text-foreground ml-1">X-API-Key</code> header.
                Generate your key in the <button onClick={() => setTab('keys')} className="text-primary underline underline-offset-2">API Keys tab</button>.
              </p>
              <CodeBlock lang="HTTP" code={`GET /api/v1/credits/balance\nHost: vaartabot.com\nX-API-Key: vb_your_api_key_here`} />
            </div>

            {/* Sections */}
            {SECTIONS.map(section => (
              <div key={section.id} className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{section.label}</h2>
                {section.endpoints.map(ep => (
                  <EndpointCard key={ep.path} ep={ep} />
                ))}
                {/* Webhook push payload explainer */}
                {section.id === 'webhooks' && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Push payload format</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Vaartabot POSTs this JSON body to your URL for every subscribed event.
                        The <code className="bg-muted px-1 rounded">X-Vaartabot-Signature</code> header contains an HMAC-SHA256 signature of the raw body.
                      </p>
                      <CodeBlock lang="JSON" code={WEBHOOK_PAYLOAD_EXAMPLE} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Verifying the signature</p>
                      <CodeBlock lang="Node.js" code={WEBHOOK_VERIFY_EXAMPLE} />
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                      <strong>Available events:</strong>{' '}
                      <code>message.received</code>, <code>message.delivered</code>, <code>message.read</code>, <code>message.failed</code>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Tab: Errors */}
        {/* Tab: Webhooks */}
        {tab === 'webhooks' && (
          <motion.div key="webhooks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">Webhook Subscriptions</h2>
                <p className="text-sm text-muted-foreground">
                  Register a URL and Vaartabot will POST a signed event to it whenever a WhatsApp message
                  arrives. Every delivery is signed with HMAC-SHA256 — verify the{' '}
                  <code className="bg-muted px-1 rounded text-foreground">X-Vaartabot-Signature</code>{' '}
                  header on your server before trusting the payload.
                </p>
              </div>

              <CodeBlock
                lang="Verify signature (Node.js)"
                code={`const sig = req.headers['x-vaartabot-signature'];
const expected = 'sha256=' + crypto
  .createHmac('sha256', YOUR_SIGNING_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');
if (sig !== expected) return res.sendStatus(401);`}
              />

              <WebhookManager />
            </div>
          </motion.div>
        )}

        {tab === 'errors' && (
          <motion.div key="errors" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">HTTP Status Codes</h2>
                <p className="text-sm text-muted-foreground">
                  Every response has a top-level <code className="bg-muted px-1 rounded">success</code> boolean.
                  On failure, <code className="bg-muted px-1 rounded">error</code> contains a human-readable message.
                </p>
              </div>

              <CodeBlock lang="Error shape" code={`{
  "success": false,
  "error": "Insufficient credits. Purchase more at https://vaartabot.com/billing",
  "creditsBalance": 0   // included only on 402
}`} />

              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Meaning</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">How to handle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ERROR_CODES.map(e => (
                      <tr key={e.code} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">{e.code}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{e.label}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{e.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 p-4 bg-muted/30 border border-border rounded-xl text-xs text-muted-foreground">
                <strong className="text-foreground">Rate limit:</strong> 100 requests/min per API key.
                On limit hit, a <code className="bg-muted px-1 rounded">429</code> is returned with a <code className="bg-muted px-1 rounded">Retry-After</code> header.
                Bulk send accepts up to 500 recipients per call with a built-in 300 ms throttle between sends.
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
