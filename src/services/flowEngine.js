// src/services/flowEngine.js
import pool from '../config/database.js';
import whatsappTemplateService from './whatsappTemplateService.js';
import { getWhatsAppConfig } from './whatsappConfigService.js';
import { ollamaChat } from './ollamaService.js';


// ─── Send helpers ─────────────────────────────────────────────────────────────


async function sendText(to, text, config) {
  await whatsappTemplateService.sendTextMessage(to, text, config);
}


async function sendButtons(to, bodyText, buttons, config, footerText = '') {
  await whatsappTemplateService.sendRawMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      ...(footerText && { footer: { text: footerText } }),
      action: {
        buttons: buttons.map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  }, config);
}


async function sendList(to, bodyText, buttonLabel, sections, config, footerText = '') {
  await whatsappTemplateService.sendRawMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      ...(footerText && { footer: { text: footerText } }),
      action: { button: buttonLabel, sections },
    },
  }, config);
}


// ─── Tenant flow config cache ─────────────────────────────────────────────────


const flowConfigCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;


async function getTenantFlowConfig(tenantId) {
  const cached = flowConfigCache.get(tenantId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.config;


  const [rows] = await pool.execute(
    'SELECT * FROM tenant_flow_config WHERE tenant_id = ? LIMIT 1',
    [tenantId]
  );


  const config = rows[0] || null;

  if (config) {
    if (config.appointment_types && typeof config.appointment_types === 'string')
      config.appointment_types = JSON.parse(config.appointment_types);
    if (config.slot_times && typeof config.slot_times === 'string')
      config.slot_times = JSON.parse(config.slot_times);
  }

  flowConfigCache.set(tenantId, { config, ts: Date.now() });
  return config;
}


// Both names exported — flows.js uses invalidateFlowCache, flowConfig.js uses invalidateFlowConfig
export function invalidateFlowConfig(tenantId) {
  flowConfigCache.delete(tenantId);
}

export const invalidateFlowCache = invalidateFlowConfig;


// ─── Defaults (fallback if tenant has no custom config) ───────────────────────


const DEFAULTS = {
  welcome_message: `👋 Hi! Welcome to *{bizName}*.\n\nI'm your virtual assistant. I can help you:\n✅ Share your requirements\n✅ Book an appointment or call\n✅ Connect with our team\n\nCould you tell me your *full name*?`,
  ask_interest_msg: `Nice to meet you, *{name}*! 😊\n\nWhat are you looking for?\n\n_Please describe briefly_`,
  ask_budget_msg: `Got it! And what is your approximate *budget* or *timeline*?`,
  onboarding_done_msg: `✅ *Thank you, {name}!*\n\nYour details have been saved. Our team will review your requirements.\n\nWhat would you like to do next?`,
  menu_header_msg: `{greeting}\n\nHow can I help you today?`,
  talk_team_msg: `💬 *Talk to Our Team*\n\nA member of the *{bizName}* team will reach out to you shortly. 🙏\n\nFeel free to reply with any questions.`,
  industry_prompt: 'requirement',
  slot_days_ahead: 2,
  slot_times: ['10:00 AM', '12:00 PM', '03:00 PM', '05:00 PM'],
  appointment_types: [
    { id: 'type_visit', title: 'In-Person Visit', description: 'Visit our office or location' },
    { id: 'type_call', title: 'Phone Call', description: "We'll call you at a set time" },
    { id: 'type_video', title: 'Video Call', description: 'Online meeting via Google Meet' },
  ],
};


function cfg(flowConfig, key, replacements = {}) {
  let value = flowConfig[key] || DEFAULTS[key] || '';
  Object.entries(replacements).forEach(([k, v]) => {
    value = value.replaceAll(`{${k}}`, v ?? '');
  });
  return value;
}


// ─── Session helpers ──────────────────────────────────────────────────────────


async function getOrCreateSession(phone) {
  const [rows] = await pool.execute(
    'SELECT * FROM conversation_states WHERE phone_number = ? LIMIT 1',
    [phone]
  );
  if (rows.length) return rows[0];


  await pool.execute(
    `INSERT INTO conversation_states (phone_number, state, data, created_at)
     VALUES (?, 'START', '{}', NOW())`,
    [phone]
  );
  const [newRows] = await pool.execute(
    'SELECT * FROM conversation_states WHERE phone_number = ? LIMIT 1',
    [phone]
  );
  return newRows[0];
}


async function updateStep(phone, newState, data = {}) {
  await pool.execute(
    `UPDATE conversation_states
     SET state = ?, data = ?, updated_at = NOW()
     WHERE phone_number = ?`,
    [newState, JSON.stringify(data), phone]
  );
}


async function resetSession(phone) {
  await pool.execute(
    `UPDATE conversation_states
     SET state = 'START', data = '{}', updated_at = NOW()
     WHERE phone_number = ?`,
    [phone]
  );
}


// ─── DB helpers ───────────────────────────────────────────────────────────────


async function findLead(tenantId, phone) {
  const [rows] = await pool.execute(
    'SELECT * FROM leads WHERE tenant_id = ? AND phone = ? LIMIT 1',
    [tenantId, phone]
  );
  return rows[0] || null;
}


async function createLead(tenantId, phone, name, interest = null, budget = null) {
  const existing = await findLead(tenantId, phone);
  if (existing) {
    if (existing.name === 'WhatsApp User') {
      await pool.execute(
        'UPDATE leads SET name = ?, property = ?, budget = ?, updated_at = NOW() WHERE id = ?',
        [name, interest, budget, existing.id]
      );
    }
    const [updated] = await pool.execute('SELECT * FROM leads WHERE id = ?', [existing.id]);
    return updated[0];
  }


  const [result] = await pool.execute(
    `INSERT INTO leads
       (tenant_id, name, phone, source, status, property, budget, score,
        whatsapp_opt_in, whatsapp_opt_in_source, whatsapp_opt_in_at, created_at)
     VALUES (?, ?, ?, 'whatsapp_bot', 'new', ?, ?, 40, 1, 'whatsapp_bot', NOW(), NOW())`,
    [tenantId, name, phone, interest, budget]
  );
  const [newRows] = await pool.execute('SELECT * FROM leads WHERE id = ?', [result.insertId]);
  return newRows[0];
}


async function getLeadAppointments(tenantId, leadId) {
  const [rows] = await pool.execute(
    `SELECT id, date, time, type, status, notes FROM appointments
     WHERE tenant_id = ? AND lead_id = ?
     ORDER BY date DESC, time DESC LIMIT 5`,
    [tenantId, leadId]
  );
  return rows;
}


async function createAppointment(tenantId, leadId, date, time, type, notes = '') {
  const [result] = await pool.execute(
    `INSERT INTO appointments
       (tenant_id, lead_id, date, time, type, status, notes, booked_via, created_at)
     VALUES (?, ?, ?, ?, ?, 'scheduled', ?, 'whatsapp_bot', NOW())`,
    [tenantId, leadId, date, time, type, notes]
  );
  await pool.execute('UPDATE leads SET status = "appointment" WHERE id = ?', [leadId]);
  return result.insertId;
}


async function logInbound(tenantId, phone, text) {
  await pool.execute(
    `INSERT INTO message_logs
       (tenant_id, contact_phone, message, status, direction, received_at, created_at)
     VALUES (?, ?, ?, 'received', 'inbound', NOW(), NOW())`,
    [tenantId, phone, text]
  ).catch(() => { });
}


async function getTenantName(tenantId, config) {
  if (config._tenantName) return config._tenantName;
  const [rows] = await pool.execute('SELECT name FROM tenants WHERE id = ? LIMIT 1', [tenantId]);
  config._tenantName = rows[0]?.name || 'us';
  return config._tenantName;
}


// ─── Slots ────────────────────────────────────────────────────────────────────


function buildSlots(flowConfig) {
  const daysAhead = flowConfig.slot_days_ahead || DEFAULTS.slot_days_ahead;
  const times = flowConfig.slot_times || DEFAULTS.slot_times;
  const slots = [];


  for (let d = 1; d <= daysAhead; d++) {
    const date = relDate(d);
    const dayLabel = d === 1 ? 'Tomorrow' : `${d} days from now`;
    times.forEach((time, i) => {
      slots.push({
        id: `slot_${d}_${i}`,
        label: `${dayLabel} — ${time}`,
        date,
        time,
      });
    });
  }
  return slots.slice(0, 10);
}


function relDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}


function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}


const RESET_WORDS = new Set([
  'hi', 'hello', 'hey', 'start', 'menu',
  'get started', 'hii', 'helo', 'hola',
]);


// ═════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═════════════════════════════════════════════════════════════════════════════


// ─── Custom flow node handler ──────────────────────────────────────────────────
// Checks flow_nodes for an active flow matching the trigger keyword.
// Returns true if handled (caller should return), false if no match.
async function processCustomFlowNode(tenantId, from, inputNorm, waConfig) {
  const [flows] = await pool.execute(
    'SELECT id FROM flows WHERE tenant_id = ? AND is_active = 1 LIMIT 1',
    [tenantId],
  );
  if (flows.length === 0) return false;

  const session = await getOrCreateSession(from);
  const expectedTrigger = session.state?.startsWith('custom:')
    ? session.state.slice(7)  // strip "custom:" prefix
    : null;

  // Match either the expected next_trigger or any trigger in this flow
  const [nodes] = await pool.execute(
    `SELECT * FROM flow_nodes WHERE flow_id = ? AND \`trigger\` = ? LIMIT 1`,
    [flows[0].id, expectedTrigger || inputNorm],
  );

  // If we have an expected trigger but user sent something else, no match
  if (nodes.length === 0) {
    if (expectedTrigger) {
      // Awaiting a specific reply — prompt user
      await sendText(from, `Please choose one of the options above.`, waConfig);
      return true;
    }
    return false;
  }

  const node = nodes[0];
  const buttons = node.buttons
    ? (typeof node.buttons === 'string' ? JSON.parse(node.buttons) : node.buttons)
    : null;

  if (node.message_type === 'buttons' && buttons?.length) {
    await sendButtons(from, node.message, buttons, waConfig);
  } else if (node.message_type === 'template') {
    await whatsappTemplateService.sendTemplate(from, node.message, 'en_US', [], waConfig);
  } else {
    await sendText(from, node.message, waConfig);
  }

  // Update session state to wait for next_trigger (if any)
  if (node.next_trigger) {
    await pool.execute(
      'UPDATE conversation_states SET state = ?, updated_at = NOW() WHERE phone = ?',
      [`custom:${node.next_trigger}`, from],
    );
  } else {
    await resetSession(from);
  }

  return true;
}

// ─── AI Auto-responder ────────────────────────────────────────────────────────
// Returns true if a response was sent, false if disabled or error.
async function tryAiAutoRespond(tenantId, from, userInput, waConfig) {
  try {
    const [[setting]] = await pool.execute(
      "SELECT value FROM tenant_settings WHERE tenant_id = ? AND setting_key = 'ai_autoresponder_enabled'",
      [tenantId]
    );
    if (!setting || setting.value !== 'true') return false;

    // If session is in a structured booking state, let the flow engine handle it
    const session = await getOrCreateSession(from);
    const BOOKING_STATES = new Set(['BOOK_TYPE', 'BOOK_SLOT', 'BOOK_CONFIRM', 'MY_APPTS', 'CANCEL_CONFIRM']);
    if (BOOKING_STATES.has(session.state)) return false;

    // Check credits
    const [[creditRow]] = await pool.execute(
      'SELECT credits_balance, name FROM tenants WHERE id = ? LIMIT 1', [tenantId]
    );
    if (!creditRow || Number(creditRow.credits_balance) <= 0) {
      console.warn(`[AI:autoresponder] No credits for tenant ${tenantId}`);
      return false;
    }
    const tenantName = creditRow.name || 'our business';

    // Check AI token balance
    const [[tokenRow]] = await pool.execute(
      'SELECT ai_tokens_balance FROM tenants WHERE id = ?', [tenantId]
    );
    if (!tokenRow || Number(tokenRow.ai_tokens_balance) <= 0) {
      console.warn(`[AI:autoresponder] No AI tokens for tenant ${tenantId}`);
      return false;
    }

    // Acknowledge media messages without invoking the LLM
    if (userInput.startsWith('__') && userInput.endsWith('__')) {
      const mediaLabel = userInput === '__image__' ? 'image' :
                         userInput === '__document__' ? 'file' :
                         userInput === '__audio__' ? 'voice message' : 'media';
      const ack = `Thanks for sending that ${mediaLabel}! Our team has been notified and will review it shortly. 😊`;
      await sendText(from, ack, waConfig);
      await pool.execute(
        'UPDATE tenants SET credits_balance = GREATEST(0, credits_balance - 1) WHERE id = ?',
        [tenantId]
      );
      await pool.execute(
        `INSERT INTO message_logs (tenant_id, contact_phone, message, status, direction, sent_at, created_at)
         VALUES (?, ?, ?, 'sent', 'outbound', NOW(), NOW())`,
        [tenantId, from, ack]
      ).catch(() => {});
      return true;
    }

    // Detect booking/appointment intent → trigger structured booking flow
    const BOOKING_KEYWORDS = ['book', 'appointment', 'schedule', 'meeting', 'slot', 'reserve', 'demo', 'visit', 'call me back'];
    const hasBookingIntent = BOOKING_KEYWORDS.some(k => userInput.toLowerCase().includes(k));
    if (hasBookingIntent) {
      const fc = (await getTenantFlowConfig(tenantId)) || {};
      const bridgeMsg = `I'd be happy to help you schedule a meeting! Here are the available appointment types:`;
      await sendText(from, bridgeMsg, waConfig);
      await pool.execute(
        'UPDATE tenants SET credits_balance = GREATEST(0, credits_balance - 1) WHERE id = ?',
        [tenantId]
      );
      await pool.execute(
        `INSERT INTO message_logs (tenant_id, contact_phone, message, status, direction, sent_at, created_at)
         VALUES (?, ?, ?, 'sent', 'outbound', NOW(), NOW())`,
        [tenantId, from, bridgeMsg]
      ).catch(() => {});
      await showBookType(from, {}, waConfig, { ...DEFAULTS, ...fc });
      return true;
    }

    // Fetch custom system prompt if set
    const [[promptRow]] = await pool.execute(
      "SELECT value FROM tenant_settings WHERE tenant_id = ? AND setting_key = 'ai_system_prompt'",
      [tenantId]
    );
    const customPrompt = promptRow?.value
      ? promptRow.value.replace(/^"|"$/g, '')
      : null;

    const [msgs] = await pool.execute(
      `SELECT direction, message FROM message_logs
       WHERE tenant_id = ? AND contact_phone = ?
       ORDER BY COALESCE(sent_at, received_at) DESC LIMIT 10`,
      [tenantId, from]
    );
    const history = msgs.reverse()
      .map(m => `${m.direction === 'inbound' ? 'Customer' : 'Agent'}: ${m.message}`)
      .join('\n');

    // Default prompt strictly confines AI to the company's own services
    const systemPrompt = customPrompt ||
      `You are a WhatsApp customer support assistant for ${tenantName}.
Your ONLY role is to answer questions about ${tenantName}'s own products, services, pricing, and appointments.
Reply in 1-2 short sentences. Be friendly and professional.
If a question is not related to ${tenantName}'s services, politely decline and say "I can only help with ${tenantName}-related questions. For anything else, please contact our team."
Never discuss competitors, give general advice, or answer off-topic questions.
Never make up prices, dates, availability, or any details you are not certain about.
If you don't know something about the business, say "I'll connect you with our team for that."`;

    const userPrompt = history
      ? `Conversation:\n${history}\n\nRespond to the customer's latest message.`
      : `Customer says: ${userInput}\n\nWrite a friendly, helpful reply.`;

    const { text, inputTokens = 0, outputTokens = 0 } = await ollamaChat({
      tenantId: String(tenantId),
      feature: 'autoresponder',
      systemPrompt,
      userPrompt,
    });

    if (text) {
      await sendText(from, text, waConfig);

      await pool.execute(
        `INSERT INTO message_logs (tenant_id, contact_phone, message, status, direction, sent_at, created_at)
         VALUES (?, ?, ?, 'sent', 'outbound', NOW(), NOW())`,
        [tenantId, from, text]
      ).catch(() => {});

      await pool.execute(
        'UPDATE tenants SET credits_balance = GREATEST(0, credits_balance - 1) WHERE id = ?',
        [tenantId]
      );

      const totalTokens = inputTokens + outputTokens;
      if (totalTokens > 0) {
        await pool.execute(
          `INSERT INTO ai_usage_logs (tenant_id, feature, model, input_tokens, output_tokens, total_tokens, cached, created_at)
           VALUES (?, 'autoresponder', 'llama3.2:3b', ?, ?, ?, 0, NOW())`,
          [tenantId, inputTokens, outputTokens, totalTokens]
        ).catch(() => {});
        await pool.execute(
          'UPDATE tenants SET ai_tokens_balance = GREATEST(0, ai_tokens_balance - ?) WHERE id = ?',
          [totalTokens, tenantId]
        );
      }

      console.log(`[AI:autoresponder] replied to ${from} (tenant ${tenantId}), tokens: ${totalTokens}`);
    }
    return true;
  } catch (err) {
    console.error('[AI:autoresponder] error:', err.message);
    return false;
  }
}

export async function processFlow(tenantId, from, userInput, rawMessage) {
  await logInbound(tenantId, from, userInput);


  let waConfig;
  try {
    waConfig = await getWhatsAppConfig(tenantId);
    if (!waConfig) throw new Error('No active config');
  } catch (err) {
    console.error(`[Flow] No WhatsApp config for tenant ${tenantId}:`, err.message);
    return;
  }


  const inputNorm = userInput.trim().toLowerCase();

  // ── Opt-out ──────────────────────────────────────────────────────────────
  if (inputNorm === 'stop' || inputNorm === 'unsubscribe') {
    const session = await getOrCreateSession(from);
    await sendText(from, `You've been unsubscribed.\n\nReply *START* anytime to reactivate. 👋`, waConfig);
    await resetSession(from);
    return;
  }

  // ── AI autoresponder (when enabled, handles the entire conversation) ───────
  const aiHandled = await tryAiAutoRespond(tenantId, from, userInput, waConfig);
  if (aiHandled) return;

  // ── Custom flow nodes (take priority over hardcoded flow) ─────────────────
  const customHandled = await processCustomFlowNode(tenantId, from, inputNorm, waConfig);
  if (customHandled) return;

  let flowConfig = await getTenantFlowConfig(tenantId);
  const session = await getOrCreateSession(from);
  const BOOKING_STATES_SET = new Set(['BOOK_TYPE', 'BOOK_SLOT', 'BOOK_CONFIRM', 'MY_APPTS', 'CANCEL_CONFIRM', 'MAIN_MENU', 'ONBOARDING_NAME', 'ONBOARDING_INTEREST', 'ONBOARDING_BUDGET', 'CANCEL_CONFIRM']);
  if (!flowConfig) {
    if (!BOOKING_STATES_SET.has(session.state) && session.state !== 'START') return;
    flowConfig = {}; // use DEFAULTS via cfg()
  }

  const state = session.state;
  const sessionData = session.data
    ? (typeof session.data === 'string' ? JSON.parse(session.data) : session.data)
    : {};


  console.log(`[Flow] tenant:${tenantId} state=${state} input="${inputNorm}" phone=${from}`);


  // ── Global reset ─────────────────────────────────────────────────────────
  if (RESET_WORDS.has(inputNorm)) {
    await resetSession(from);
    const lead = await findLead(tenantId, from);
    if (!lead) return await startOnboarding(tenantId, from, waConfig, flowConfig);
    return await showMainMenu(tenantId, from, waConfig, flowConfig, lead.name);
  }


  // ── State machine ─────────────────────────────────────────────────────────
  switch (state) {
    case 'START': {
      const lead = await findLead(tenantId, from);
      if (!lead) return await startOnboarding(tenantId, from, waConfig, flowConfig);
      return await showMainMenu(tenantId, from, waConfig, flowConfig, lead.name);
    }
    case 'ONBOARDING_NAME':
      return await handleName(tenantId, from, userInput.trim(), sessionData, waConfig, flowConfig);
    case 'ONBOARDING_INTEREST':
      return await handleInterest(tenantId, from, userInput.trim(), sessionData, waConfig, flowConfig);
    case 'ONBOARDING_BUDGET':
      return await handleBudget(tenantId, from, userInput.trim(), sessionData, waConfig, flowConfig);
    case 'MAIN_MENU':
      return await handleMainMenu(tenantId, from, inputNorm, sessionData, waConfig, flowConfig);
    case 'BOOK_TYPE':
      return await handleBookType(tenantId, from, inputNorm, sessionData, waConfig, flowConfig);
    case 'BOOK_SLOT':
      return await handleBookSlot(tenantId, from, inputNorm, sessionData, waConfig, flowConfig);
    case 'BOOK_CONFIRM':
      return await handleBookConfirm(tenantId, from, inputNorm, sessionData, waConfig, flowConfig);
    case 'MY_APPTS':
      return await handleMyAppts(tenantId, from, inputNorm, sessionData, waConfig, flowConfig);
    case 'CANCEL_CONFIRM':
      return await handleCancelConfirm(tenantId, from, inputNorm, sessionData, waConfig, flowConfig);
    default:
      await resetSession(from);
      return await showMainMenu(tenantId, from, waConfig, flowConfig);
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// ONBOARDING
// ═════════════════════════════════════════════════════════════════════════════


async function startOnboarding(tenantId, from, waConfig, flowConfig) {
  const bizName = await getTenantName(tenantId, waConfig);
  await sendText(from, cfg(flowConfig, 'welcome_message', { bizName }), waConfig);
  await updateStep(from, 'ONBOARDING_NAME', {});
}


async function handleName(tenantId, from, rawInput, sessionData, waConfig, flowConfig) {
  if (!rawInput || rawInput.length < 2) {
    await sendText(from, `Please enter your full name (at least 2 characters). 😊`, waConfig);
    return;
  }
  const name = rawInput
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');


  await sendText(from, cfg(flowConfig, 'ask_interest_msg', { name }), waConfig);
  await updateStep(from, 'ONBOARDING_INTEREST', { name });
}


async function handleInterest(tenantId, from, rawInput, sessionData, waConfig, flowConfig) {
  if (!rawInput || rawInput.length < 2) {
    await sendText(from, `Please describe what you're looking for (at least 2 characters).`, waConfig);
    return;
  }
  await sendText(from, cfg(flowConfig, 'ask_budget_msg', {}), waConfig);
  await updateStep(from, 'ONBOARDING_BUDGET', { ...sessionData, interest: rawInput });
}


async function handleBudget(tenantId, from, rawInput, sessionData, waConfig, flowConfig) {
  const budget = (!rawInput || rawInput.toLowerCase() === 'skip') ? null : rawInput;
  const lead = await createLead(tenantId, from, sessionData.name, sessionData.interest, budget);


  await sendButtons(from,
    cfg(flowConfig, 'onboarding_done_msg', { name: sessionData.name }),
    [
      { id: 'menu_book_appt', title: '📅 Book Appointment' },
      { id: 'menu_talk_team', title: '💬 Talk to Team' },
    ],
    waConfig
  );
  await updateStep(from, 'MAIN_MENU', { name: sessionData.name, leadId: lead.id });
}


// ═════════════════════════════════════════════════════════════════════════════
// MAIN MENU
// ═════════════════════════════════════════════════════════════════════════════


async function showMainMenu(tenantId, from, waConfig, flowConfig, name = '') {
  const bizName = await getTenantName(tenantId, waConfig);
  const greeting = name
    ? `👋 Welcome back, *${name}*!`
    : `👋 Welcome to *${bizName}*!`;


  await sendList(from,
    cfg(flowConfig, 'menu_header_msg', { greeting }),
    'Choose an Option',
    [
      {
        title: '📅 Appointments',
        rows: [
          { id: 'menu_book_appt', title: 'Book Appointment', description: 'Schedule a visit or call' },
          { id: 'menu_my_appts', title: 'My Appointments', description: 'View or cancel your bookings' },
        ],
      },
      {
        title: '💬 Support',
        rows: [
          { id: 'menu_talk_team', title: 'Talk to Team', description: 'Get in touch with us' },
        ],
      },
    ],
    waConfig,
    `${bizName} · Reply STOP to opt out`
  );
  await updateStep(from, 'MAIN_MENU', { name });
}


async function handleMainMenu(tenantId, from, input, sessionData, waConfig, flowConfig) {
  switch (input) {
    case 'menu_book_appt':
      return await showBookType(from, sessionData, waConfig, flowConfig);
    case 'menu_my_appts':
      return await showMyAppointments(tenantId, from, sessionData, waConfig, flowConfig);
    case 'menu_talk_team':
      return await handleTalkToTeam(tenantId, from, sessionData, waConfig, flowConfig);
    case 'main_menu':
      return await showMainMenu(tenantId, from, waConfig, flowConfig, sessionData.name);
    default:
      console.warn(`[Flow] handleMainMenu: unrecognised input "${input}" from ${from}`);
      return await showMainMenu(tenantId, from, waConfig, flowConfig, sessionData.name);
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// BOOK APPOINTMENT
// ═════════════════════════════════════════════════════════════════════════════


async function showBookType(from, sessionData, waConfig, flowConfig) {
  const apptTypes = flowConfig.appointment_types || DEFAULTS.appointment_types;


  await sendList(from,
    `📅 *Book an Appointment*\n\nWhat type of meeting would you prefer?`,
    'Choose Type',
    [{ title: 'Meeting Type', rows: apptTypes }],
    waConfig
  );
  await updateStep(from, 'BOOK_TYPE', sessionData);
}


async function handleBookType(tenantId, from, input, sessionData, waConfig, flowConfig) {
  const apptTypes = flowConfig.appointment_types || DEFAULTS.appointment_types;
  const selected = apptTypes.find(t => t.id === input);


  if (!selected) {
    await sendText(from, `Please select a meeting type from the list above. 👆`, waConfig);
    return;
  }


  const SLOTS = buildSlots(flowConfig);
  await sendList(from,
    `📅 *${selected.title}*\n\nSelect a time slot that works for you:`,
    'Choose Slot',
    [{
      title: 'Available Slots',
      rows: SLOTS.map(s => ({
        id: s.id,
        title: s.label,
        description: `${fmtDate(s.date)} at ${s.time}`,
      })),
    }],
    waConfig
  );


  await updateStep(from, 'BOOK_SLOT', {
    ...sessionData,
    apptTypeId: input,
    apptTypeLabel: selected.title,
  });
}


async function handleBookSlot(tenantId, from, input, sessionData, waConfig, flowConfig) {
  const SLOTS = buildSlots(flowConfig);
  const slot = SLOTS.find(s => s.id === input);


  if (!slot) {
    await sendText(from, `Please select a slot from the list above. 👆`, waConfig);
    return;
  }


  await sendButtons(from,
    `📋 *Confirm Appointment*\n\n` +
    `📌 Type: *${sessionData.apptTypeLabel}*\n` +
    `📅 Date: *${fmtDate(slot.date)}*\n` +
    `⏰ Time: *${slot.time}*\n\n` +
    `Shall I confirm this booking?`,
    [
      { id: 'confirm_yes', title: '✅ Confirm' },
      { id: 'confirm_no', title: '❌ Cancel' },
    ],
    waConfig
  );


  await updateStep(from, 'BOOK_CONFIRM', {
    ...sessionData,
    slotDate: slot.date,
    slotTime: slot.time,
  });
}


async function handleBookConfirm(tenantId, from, input, sessionData, waConfig, flowConfig) {
  if (input === 'confirm_yes') {
    try {
      let lead = await findLead(tenantId, from);
      if (!lead) lead = await createLead(tenantId, from, sessionData.name || 'WhatsApp User');


      const apptId = await createAppointment(
        tenantId, lead.id,
        sessionData.slotDate, sessionData.slotTime,
        sessionData.apptTypeLabel,
        'Booked via WhatsApp bot'
      );


      await sendButtons(from,
        `🎉 *Appointment Confirmed!*\n\n` +
        `📌 Type: *${sessionData.apptTypeLabel}*\n` +
        `📅 Date: *${fmtDate(sessionData.slotDate)}*\n` +
        `⏰ Time: *${sessionData.slotTime}*\n` +
        `🔖 Booking ID: *#${apptId}*\n\n` +
        `We'll be in touch before your appointment. See you soon! 😊`,
        [
          { id: 'menu_my_appts', title: '📋 My Appointments' },
          { id: 'main_menu', title: '🏠 Main Menu' },
        ],
        waConfig
      );
    } catch (err) {
      console.error('[Flow] Booking error:', err.message);
      await sendText(from, `❌ Booking failed. Please try again.\n\nReply *hi* to go back.`, waConfig);
    }
  } else {
    await sendButtons(from,
      `No problem! Booking cancelled. 😊\n\nWhat else can I help you with?`,
      [
        { id: 'menu_book_appt', title: '🔄 Try Again' },
        { id: 'main_menu', title: '🏠 Main Menu' },
      ],
      waConfig
    );
  }
  await resetSession(from);
}


// ═════════════════════════════════════════════════════════════════════════════
// MY APPOINTMENTS
// ═════════════════════════════════════════════════════════════════════════════


async function showMyAppointments(tenantId, from, sessionData, waConfig, flowConfig) {
  const lead = await findLead(tenantId, from);
  if (!lead) {
    await sendText(from, `I couldn't find your profile. Please type *hi* to register first.`, waConfig);
    return;
  }


  const appts = await getLeadAppointments(tenantId, lead.id);


  if (!appts.length) {
    await sendButtons(from,
      `📋 *My Appointments*\n\nYou have no upcoming appointments, *${lead.name}*.\n\nWould you like to book one?`,
      [
        { id: 'menu_book_appt', title: '📅 Book Now' },
        { id: 'main_menu', title: '🏠 Main Menu' },
      ],
      waConfig
    );
    await updateStep(from, 'MAIN_MENU', sessionData);
    return;
  }


  const apptMap = {};
  const apptList = appts.map((a, i) => {
    const dateStr = new Date(a.date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    const icon =
      a.status === 'scheduled' ? '✅' :
        a.status === 'completed' ? '☑️' : '❌';
    apptMap[`cancel_${i + 1}`] = a.id;
    return `*${i + 1}.* ${a.type || 'Appointment'}\n   📅 ${dateStr} at ${a.time}\n   ${icon} ${a.status}`;
  }).join('\n\n');


  const scheduled = appts.filter(a => a.status === 'scheduled').slice(0, 2);
  const cancelBtns = scheduled.map(a => ({
    id: `cancel_${appts.indexOf(a) + 1}`,
    title: `❌ Cancel #${appts.indexOf(a) + 1}`,
  }));


  await sendButtons(from,
    `📋 *My Appointments*\n\n${apptList}` +
    (cancelBtns.length ? `\n\nTap below to cancel a booking:` : ''),
    [...cancelBtns, { id: 'main_menu', title: '🏠 Main Menu' }],
    waConfig
  );


  await updateStep(from, 'MY_APPTS', { ...sessionData, apptMap });
}


async function handleMyAppts(tenantId, from, input, sessionData, waConfig, flowConfig) {
  if (input === 'main_menu') {
    await resetSession(from);
    return await showMainMenu(tenantId, from, waConfig, flowConfig, sessionData.name);
  }
  if (input === 'menu_book_appt') {
    return await showBookType(from, sessionData, waConfig, flowConfig);
  }


  const apptId = (sessionData.apptMap || {})[input];
  if (!apptId) {
    await sendText(from, `Please tap one of the buttons above. 👆\n\nReply *hi* to go back.`, waConfig);
    return;
  }


  const [rows] = await pool.execute(
    'SELECT * FROM appointments WHERE id = ? AND tenant_id = ? LIMIT 1',
    [apptId, tenantId]
  );
  if (!rows.length) {
    await sendText(from, `Appointment not found. Reply *hi* to restart.`, waConfig);
    return;
  }


  const appt = rows[0];
  await sendButtons(from,
    `⚠️ *Cancel Appointment?*\n\n` +
    `📌 Type: *${appt.type || 'Appointment'}*\n` +
    `📅 Date: *${fmtDate(appt.date)}*\n` +
    `⏰ Time: *${appt.time}*\n\n` +
    `Are you sure you want to cancel?`,
    [
      { id: 'cancel_yes', title: '✅ Yes, Cancel' },
      { id: 'cancel_no', title: '🔙 Keep It' },
    ],
    waConfig
  );


  await updateStep(from, 'CANCEL_CONFIRM', {
    ...sessionData,
    cancelApptId: apptId,
    cancelApptType: appt.type,
    cancelApptDate: appt.date,
    cancelApptTime: appt.time,
  });
}


async function handleCancelConfirm(tenantId, from, input, sessionData, waConfig, flowConfig) {
  if (input === 'cancel_yes') {
    try {
      await pool.execute(
        'UPDATE appointments SET status = "cancelled" WHERE id = ? AND tenant_id = ?',
        [sessionData.cancelApptId, tenantId]
      );
      await sendButtons(from,
        `✅ *Appointment Cancelled*\n\n` +
        `📌 Type: *${sessionData.cancelApptType || 'Appointment'}*\n` +
        `📅 Date: *${fmtDate(sessionData.cancelApptDate)}*\n` +
        `⏰ Time: *${sessionData.cancelApptTime}*\n\n` +
        `Cancelled successfully. We hope to connect with you soon! 😊`,
        [
          { id: 'menu_book_appt', title: '📅 Book New' },
          { id: 'main_menu', title: '🏠 Main Menu' },
        ],
        waConfig
      );
    } catch (err) {
      console.error('[Flow] Cancel error:', err.message);
      await sendText(from, `❌ Could not cancel. Please try again.\n\nReply *hi* to go back.`, waConfig);
    }
  } else {
    await sendButtons(from,
      `👍 Your appointment is kept. See you then! 😊`,
      [
        { id: 'menu_my_appts', title: '📋 My Appointments' },
        { id: 'main_menu', title: '🏠 Main Menu' },
      ],
      waConfig
    );
  }
  await resetSession(from);
}


// ═════════════════════════════════════════════════════════════════════════════
// TALK TO TEAM
// ═════════════════════════════════════════════════════════════════════════════


async function handleTalkToTeam(tenantId, from, sessionData, waConfig, flowConfig) {
  const bizName = await getTenantName(tenantId, waConfig);


  const lead = await findLead(tenantId, from);
  if (lead && lead.status === 'new') {
    await pool.execute(
      'UPDATE leads SET status = "interested", updated_at = NOW() WHERE id = ?',
      [lead.id]
    );
  }


  await sendButtons(from,
    cfg(flowConfig, 'talk_team_msg', { bizName }),
    [{ id: 'main_menu', title: '🏠 Main Menu' }],
    waConfig
  );
  await updateStep(from, 'MAIN_MENU', sessionData);
}