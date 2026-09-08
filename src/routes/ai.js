// routes/ai.js — AI-powered features backed by local Ollama
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import pool from '../config/database.js';
import { ollamaChat, getDailyTokensUsed } from '../services/ollamaService.js';

const router = Router();
router.use(authMiddleware);

// ── Token tracking helpers ────────────────────────────────────────────────────
// Check balance; returns { ok, balance } without deducting
async function checkTokenBalance(tenantId) {
  const [[row]] = await pool.execute(
    'SELECT ai_tokens_balance FROM tenants WHERE id = ?', [tenantId]
  );
  const balance = Number(row?.ai_tokens_balance ?? 0);
  return { ok: balance > 0, balance };
}

// Log usage to ai_usage_logs and deduct from ai_tokens_balance
async function recordAiTokenUsage(tenantId, feature, inputTokens, outputTokens, cached) {
  const total = inputTokens + outputTokens;
  if (total === 0 && !cached) return; // nothing to record for 0-token responses
  await pool.execute(
    `INSERT INTO ai_usage_logs
       (tenant_id, feature, model, input_tokens, output_tokens, total_tokens, cached, created_at)
     VALUES (?, ?, 'llama3.2:3b', ?, ?, ?, ?, NOW())`,
    [tenantId, feature, inputTokens, outputTokens, total, cached ? 1 : 0]
  );
  if (total > 0 && !cached) {
    await pool.execute(
      'UPDATE tenants SET ai_tokens_balance = GREATEST(0, ai_tokens_balance - ?) WHERE id = ?',
      [total, tenantId]
    );
  }
}

// ── GET /api/ai/token-usage ───────────────────────────────────────────────────
// Returns token usage stats for current session (today) + this month + per-feature
router.get('/token-usage', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    // Current balance
    const [[tenant]] = await pool.execute(
      'SELECT ai_tokens_balance FROM tenants WHERE id = ?', [tenantId]
    );
    const balance = Number(tenant?.ai_tokens_balance ?? 0);

    // Today's usage from in-memory counter (session)
    const tokensToday = getDailyTokensUsed(tenantId);

    // DB: this month per-feature
    const [byFeature] = await pool.execute(
      `SELECT feature,
         COUNT(*) AS calls,
         SUM(input_tokens) AS input_tokens,
         SUM(output_tokens) AS output_tokens,
         SUM(total_tokens) AS total_tokens
       FROM ai_usage_logs
       WHERE tenant_id = ? AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
       GROUP BY feature ORDER BY total_tokens DESC`,
      [tenantId]
    );

    // DB: this month totals
    const [[month]] = await pool.execute(
      `SELECT COUNT(*) AS calls, SUM(total_tokens) AS tokens
       FROM ai_usage_logs
       WHERE tenant_id = ? AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
      [tenantId]
    );

    // DB: all-time totals
    const [[allTime]] = await pool.execute(
      `SELECT COUNT(*) AS calls, SUM(total_tokens) AS tokens
       FROM ai_usage_logs WHERE tenant_id = ?`,
      [tenantId]
    );

    res.json({
      success: true,
      data: {
        balance,
        session: { tokens: tokensToday },
        thisMonth: {
          calls:  Number(month?.calls  ?? 0),
          tokens: Number(month?.tokens ?? 0),
        },
        allTime: {
          calls:  Number(allTime?.calls  ?? 0),
          tokens: Number(allTime?.tokens ?? 0),
        },
        byFeature: byFeature.map(r => ({
          feature:      r.feature,
          calls:        Number(r.calls),
          inputTokens:  Number(r.input_tokens),
          outputTokens: Number(r.output_tokens),
          totalTokens:  Number(r.total_tokens),
        })),
      },
    });
  } catch (err) {
    console.error('[ai/token-usage]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/suggest-reply ────────────────────────────────────────────────
// Body: { phone }  →  { suggestions: string[] }
router.post('/suggest-reply', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone is required' });

    const tenantId = req.user.tenantId;

    const bal = await checkTokenBalance(tenantId);
    if (!bal.ok) return res.status(402).json({ error: 'AI token balance empty. Top up in Billing → AI Tokens.', code: 'NO_AI_TOKENS', balance: bal.balance });

    // Fetch last 12 messages for context
    const [rows] = await pool.execute(
      `SELECT direction, message FROM message_logs
       WHERE tenant_id = ? AND contact_phone = ?
       ORDER BY COALESCE(sent_at, received_at) DESC LIMIT 12`,
      [tenantId, phone]
    );

    const history = rows.reverse().map(r =>
      `${r.direction === 'inbound' ? 'Customer' : 'Agent'}: ${r.message}`
    ).join('\n');

    const systemPrompt = `You are a helpful WhatsApp business assistant.
Given a conversation, suggest 3 short, natural reply options for the agent to send.
Return ONLY a JSON array of 3 strings. No explanation, no markdown, no extra text.
Example: ["Sure, let me check that for you!", "Can you share more details?", "I'll get back to you shortly."]`;

    const userPrompt = history
      ? `Conversation so far:\n${history}\n\nSuggest 3 reply options for the agent.`
      : 'No messages yet. Suggest 3 friendly opening greetings for a WhatsApp business chat.';

    const { text, inputTokens, outputTokens, cached, remaining } = await ollamaChat({
      tenantId,
      feature: 'suggest-reply',
      systemPrompt,
      userPrompt,
    });

    await recordAiTokenUsage(tenantId, 'suggest-reply', inputTokens, outputTokens, cached);

    // Parse JSON array from model output
    const match = text.match(/\[[\s\S]*?\]/);
    let suggestions = [];
    if (match) {
      try { suggestions = JSON.parse(match[0]); } catch { /* fall through */ }
    }

    // Fallback: split by newline if JSON parse failed
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      suggestions = text.split('\n').filter(l => l.trim()).slice(0, 3);
    }

    res.json({ suggestions: suggestions.slice(0, 3), remaining, tokensUsed: inputTokens + outputTokens });
  } catch (err) {
    if (err.code === 'RATE_LIMIT') return res.status(429).json({ error: err.message });
    console.error('[ai/suggest-reply]', err.message);
    res.status(500).json({ error: 'AI unavailable — try again shortly' });
  }
});

// ── POST /api/ai/draft-campaign ───────────────────────────────────────────────
// Body: { goal, tone?, audience? }  →  { message: string }
router.post('/draft-campaign', async (req, res) => {
  try {
    const { goal, tone = 'friendly', audience = 'customers' } = req.body;
    if (!goal) return res.status(400).json({ error: 'goal is required' });

    const tenantId = req.user.tenantId;

    const bal = await checkTokenBalance(tenantId);
    if (!bal.ok) return res.status(402).json({ error: 'AI token balance empty. Top up in Billing → AI Tokens.', code: 'NO_AI_TOKENS', balance: bal.balance });

    // Fetch tenant name for context
    const [[tenant]] = await pool.execute(
      'SELECT name FROM tenants WHERE id = ?', [tenantId]
    );

    const systemPrompt = `You are a WhatsApp marketing copywriter for ${tenant?.name || 'a business'}.
Write short, engaging WhatsApp message copy (under 160 characters) that feels personal and direct.
Return ONLY the message text — no quotes, no labels, no explanation.
Tone: ${tone}. Target audience: ${audience}.`;

    const userPrompt = `Write a WhatsApp marketing message for this goal: ${goal}`;

    const { text, inputTokens, outputTokens, cached, remaining } = await ollamaChat({
      tenantId,
      feature: 'draft-campaign',
      systemPrompt,
      userPrompt,
    });

    await recordAiTokenUsage(tenantId, 'draft-campaign', inputTokens, outputTokens, cached);

    res.json({ message: text, remaining, tokensUsed: inputTokens + outputTokens });
  } catch (err) {
    if (err.code === 'RATE_LIMIT') return res.status(429).json({ error: err.message });
    console.error('[ai/draft-campaign]', err.message);
    res.status(500).json({ error: 'AI unavailable — try again shortly' });
  }
});

// ── POST /api/ai/build-flow ───────────────────────────────────────────────────
// Body: { description }  →  { nodes: FlowNode[] }
router.post('/build-flow', async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'description is required' });

    const tenantId = req.user.tenantId;

    const bal = await checkTokenBalance(tenantId);
    if (!bal.ok) return res.status(402).json({ error: 'AI token balance empty. Top up in Billing → AI Tokens.', code: 'NO_AI_TOKENS', balance: bal.balance });

    const systemPrompt = `WhatsApp bot designer. Output ONLY a JSON array, no extra text.
Max 4 nodes. Each node: {"trigger":"keyword","message":"reply under 100 chars","message_type":"text|buttons","buttons":[{"id":"b1","title":"Option"}]|null,"next_trigger":"keyword|null"}
Example: [{"trigger":"hi","message":"Hi! Book or get info?","message_type":"buttons","buttons":[{"id":"b1","title":"Book"},{"id":"b2","title":"Info"}],"next_trigger":"book"},{"trigger":"book","message":"Share your preferred time.","message_type":"text","buttons":null,"next_trigger":null}]`;

    const userPrompt = `Flow: ${description.slice(0, 200)}`;

    const { text, inputTokens, outputTokens, cached, remaining } = await ollamaChat({
      tenantId,
      feature: 'build-flow',
      systemPrompt,
      userPrompt,
      maxTokens: 500,
    });

    await recordAiTokenUsage(tenantId, 'build-flow', inputTokens, outputTokens, cached);

    // Extract JSON array from output
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(422).json({ error: 'AI did not return valid nodes — try rephrasing your description' });

    let nodes;
    try {
      nodes = JSON.parse(match[0]);
    } catch {
      return res.status(422).json({ error: 'AI returned malformed JSON — try rephrasing' });
    }

    if (!Array.isArray(nodes) || nodes.length === 0) {
      return res.status(422).json({ error: 'AI returned no nodes — try a more detailed description' });
    }

    // Sanitize each node
    nodes = nodes.map((n, i) => ({
      trigger:      String(n.trigger || `step_${i+1}`).toLowerCase().replace(/\s+/g, '_').slice(0, 30),
      message:      String(n.message || '').slice(0, 500),
      message_type: ['text','buttons','template'].includes(n.message_type) ? n.message_type : 'text',
      buttons:      Array.isArray(n.buttons) ? n.buttons.slice(0, 3).map((b, j) => ({
        id: `btn_${j+1}`, title: String(b.title || b.id || `Option ${j+1}`).slice(0, 20),
      })) : null,
      next_trigger: n.next_trigger ? String(n.next_trigger).toLowerCase().replace(/\s+/g, '_').slice(0, 30) : null,
    }));

    res.json({ nodes, remaining, tokensUsed: inputTokens + outputTokens });
  } catch (err) {
    if (err.code === 'RATE_LIMIT') return res.status(429).json({ error: err.message });
    console.error('[ai/build-flow]', err.message);
    res.status(500).json({ error: 'AI unavailable — try again shortly' });
  }
});

// ── POST /api/ai/suggest-drip ─────────────────────────────────────────────────
// Body: { goal }  →  { steps: [{template_name, delay_hours, hint}] }
router.post('/suggest-drip', async (req, res) => {
  try {
    const { goal } = req.body;
    if (!goal) return res.status(400).json({ error: 'goal is required' });

    const tenantId = req.user.tenantId;

    const bal = await checkTokenBalance(tenantId);
    if (!bal.ok) return res.status(402).json({ error: 'AI token balance empty. Top up in Billing → AI Tokens.', code: 'NO_AI_TOKENS', balance: bal.balance });

    const systemPrompt = `You are a WhatsApp drip sequence planner.
Given a nurture or campaign goal, return a suggested sequence of 3-5 steps.
Return ONLY a JSON array. No markdown, no explanation, no extra text.
Each step must have exactly these fields:
- template_name: a short snake_case name for a WhatsApp template (e.g. "welcome_day1")
- delay_hours: integer hours to wait before sending this step (first step is 0)
- hint: one-sentence description of what this message should say

Example: [{"template_name":"welcome_intro","delay_hours":0,"hint":"Introduce the brand and offer a free trial"},{"template_name":"feature_highlight","delay_hours":48,"hint":"Show key product features"},{"template_name":"follow_up","delay_hours":96,"hint":"Ask if they have questions and offer support"}]`;

    const userPrompt = `Suggest a WhatsApp drip sequence for this goal:\n${goal}`;

    const { text, inputTokens, outputTokens, cached, remaining } = await ollamaChat({
      tenantId,
      feature: 'suggest-drip',
      systemPrompt,
      userPrompt,
      maxTokens: 600,
    });

    await recordAiTokenUsage(tenantId, 'suggest-drip', inputTokens, outputTokens, cached);

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(422).json({ error: 'AI did not return valid steps — try rephrasing your goal' });

    let steps;
    try { steps = JSON.parse(match[0]); } catch (parseErr) {
      console.error('[ai/suggest-drip] JSON parse failed, raw:', match[0].slice(0, 300));
      return res.status(422).json({ error: 'AI returned malformed JSON — try rephrasing' });
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(422).json({ error: 'AI returned no steps — try a more detailed goal' });
    }

    steps = steps.slice(0, 6).map((s, i) => ({
      template_name: String(s.template_name || `step_${i + 1}`).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 50),
      delay_hours:   Math.max(0, parseInt(s.delay_hours) || (i === 0 ? 0 : 24)),
      hint:          String(s.hint || '').slice(0, 200),
    }));

    res.json({ steps, remaining, tokensUsed: inputTokens + outputTokens });
  } catch (err) {
    if (err.code === 'RATE_LIMIT') return res.status(429).json({ error: err.message });
    console.error('[ai/suggest-drip]', err.message);
    res.status(500).json({ error: 'AI unavailable — try again shortly' });
  }
});

// ── POST /api/ai/contact-summary ──────────────────────────────────────────────
// Body: { contactId }  →  { summary: string }
router.post('/contact-summary', async (req, res) => {
  try {
    const { contactId } = req.body;
    if (!contactId) return res.status(400).json({ error: 'contactId is required' });

    const tenantId = req.user.tenantId;

    const bal = await checkTokenBalance(tenantId);
    if (!bal.ok) return res.status(402).json({ error: 'AI token balance empty. Top up in Billing → AI Tokens.', code: 'NO_AI_TOKENS', balance: bal.balance });

    const [[contact]] = await pool.execute(
      'SELECT name, phone, email, tags, notes, opt_out, created_at FROM contacts WHERE id = ? AND tenant_id = ?',
      [contactId, tenantId]
    );
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const [messages] = await pool.execute(
      `SELECT direction, message, status, COALESCE(sent_at, received_at) AS ts
       FROM message_logs WHERE tenant_id = ? AND contact_phone = ?
       ORDER BY ts DESC LIMIT 20`,
      [tenantId, contact.phone]
    );

    const history = messages.reverse().map(m =>
      `[${m.direction === 'inbound' ? 'Customer' : 'Agent'}]: ${m.message}`
    ).join('\n');

    const contactInfo = [
      `Name: ${contact.name || 'Unknown'}`,
      `Phone: ${contact.phone}`,
      contact.email ? `Email: ${contact.email}` : null,
      contact.tags ? `Tags: ${contact.tags}` : null,
      contact.notes ? `Notes: ${contact.notes}` : null,
      `Opted out: ${contact.opt_out ? 'Yes' : 'No'}`,
      `Added: ${new Date(contact.created_at).toLocaleDateString()}`,
    ].filter(Boolean).join('\n');

    const systemPrompt = `You are a CRM assistant. Analyze a contact's profile and message history.
Write a concise summary (3-4 sentences) covering:
1. Engagement level (active/passive/silent)
2. Key topics discussed or concerns raised
3. Predicted intent or buying stage
4. Suggested next action for the sales/support team
Return only the summary text — no labels, no bullet points, no markdown.`;

    const userPrompt = `Contact profile:\n${contactInfo}\n\nRecent messages (${messages.length}):\n${history || 'No messages yet.'}`;

    const { text, inputTokens, outputTokens, cached, remaining } = await ollamaChat({
      tenantId,
      feature: 'contact-summary',
      systemPrompt,
      userPrompt,
      maxTokens: 300,
    });

    await recordAiTokenUsage(tenantId, 'contact-summary', inputTokens, outputTokens, cached);

    res.json({ summary: text, remaining, tokensUsed: inputTokens + outputTokens });
  } catch (err) {
    if (err.code === 'RATE_LIMIT') return res.status(429).json({ error: err.message });
    console.error('[ai/contact-summary]', err.message);
    res.status(500).json({ error: 'AI unavailable — try again shortly' });
  }
});

// ── POST /api/ai/campaign-insights ───────────────────────────────────────────
// Body: { campaignId }  →  { insights: string }
router.post('/campaign-insights', async (req, res) => {
  try {
    const { campaignId } = req.body;
    if (!campaignId) return res.status(400).json({ error: 'campaignId is required' });

    const tenantId = req.user.tenantId;

    const bal = await checkTokenBalance(tenantId);
    if (!bal.ok) return res.status(402).json({ error: 'AI token balance empty. Top up in Billing → AI Tokens.', code: 'NO_AI_TOKENS', balance: bal.balance });

    const [[campaign]] = await pool.execute(
      `SELECT name, status, target_audience,
              messages_sent, messages_delivered, messages_read, messages_failed
       FROM campaigns WHERE id = ? AND tenant_id = ?`,
      [campaignId, tenantId]
    );
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const sent      = Number(campaign.messages_sent)      || 0;
    const delivered = Number(campaign.messages_delivered) || 0;
    const readCount = Number(campaign.messages_read)      || 0;
    const failed    = Number(campaign.messages_failed)    || 0;
    const total     = sent + failed;
    const delivRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const readRate  = delivered > 0 ? Math.round((readCount / delivered) * 100) : 0;

    const systemPrompt = `You are a WhatsApp marketing analyst.
Given campaign delivery metrics, write 2-3 sentences of actionable insights:
1. Assess how the campaign performed (delivery/read rates relative to industry benchmarks: good delivery >85%, good read rate >40%)
2. Identify any concern (e.g. high failure rate, low read rate)
3. Suggest one specific next step (e.g. re-target non-openers, A/B test timing, send follow-up to readers)
Return only the insight text — no headers, no bullets, no markdown.`;

    const userPrompt = `Campaign: "${campaign.name}" (${campaign.status})
Target audience: ${campaign.target_audience || 'all contacts'}
Metrics: ${total} targeted, ${sent} sent, ${delivered} delivered (${delivRate}% delivery rate), ${readCount} read (${readRate}% read rate), ${failed} failed.`;

    const { text, inputTokens, outputTokens, cached, remaining } = await ollamaChat({
      tenantId,
      feature: 'campaign-insights',
      systemPrompt,
      userPrompt,
      maxTokens: 250,
    });

    await recordAiTokenUsage(tenantId, 'campaign-insights', inputTokens, outputTokens, cached);

    res.json({ insights: text, remaining, tokensUsed: inputTokens + outputTokens });
  } catch (err) {
    if (err.code === 'RATE_LIMIT') return res.status(429).json({ error: err.message });
    console.error('[ai/campaign-insights]', err.message);
    res.status(500).json({ error: 'AI unavailable — try again shortly' });
  }
});

export default router;
