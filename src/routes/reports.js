// src/routes/reports.js

import { authMiddleware } from '../middleware/auth.js';
import express from 'express';
import pool    from '../config/database.js';


const router = express.Router();
router.use(authMiddleware);   // ← was `authenticate`, now `authMiddleware`

// ─── Helper: date range WHERE clause ─────────────────────────────────────────
function dateFilter(column, dateRange) {
  const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[dateRange] ?? 30;
  return `AND ${column} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`;
}


// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/summary
// ═════════════════════════════════════════════════════════════════════════════
router.get('/summary', async (req, res) => {
  const tenantId = req.user.tenantId;
  const range    = req.query.range || '30d';
  const df       = dateFilter('ml.created_at', range);

  try {
    const [[msgStats]] = await pool.execute(
      `SELECT
         COUNT(*)                                              AS total,
         SUM(direction = 'outbound')                          AS sent,
         SUM(direction = 'inbound')                           AS received,
         SUM(direction = 'outbound' AND status = 'delivered') AS delivered,
         SUM(direction = 'outbound' AND status = 'read')      AS read_count,
         SUM(direction = 'outbound' AND status = 'failed')    AS failed
       FROM message_logs ml
       WHERE ml.tenant_id = ? ${df}`,
      [tenantId]
    );

    const [[leadStats]] = await pool.execute(
      `SELECT
         COUNT(*)                                AS total,
         SUM(status IN ('appointment','closed')) AS converted,
         SUM(status = 'new')                     AS new_leads,
         SUM(whatsapp_opt_in = 1)                AS opted_in
       FROM leads
       WHERE tenant_id = ?`,
      [tenantId]
    );

    const [[apptStats]] = await pool.execute(
      `SELECT
         COUNT(*)                  AS total,
         SUM(status = 'completed') AS completed,
         SUM(status = 'scheduled') AS upcoming,
         SUM(status = 'cancelled') AS cancelled
       FROM appointments
       WHERE tenant_id = ?`,
      [tenantId]
    );

    const [[{ unique_contacts }]] = await pool.execute(
      `SELECT COUNT(DISTINCT contact_phone) AS unique_contacts
       FROM message_logs ml
       WHERE tenant_id = ? AND direction = 'outbound' ${df}`,
      [tenantId]
    );

    const sent       = Number(msgStats.sent)       || 0;
    const delivered  = Number(msgStats.delivered)  || 0;
    const readCount  = Number(msgStats.read_count) || 0;
    const converted  = Number(leadStats.converted) || 0;
    const totalLeads = Number(leadStats.total)      || 1;

    res.json({
      success: true,
      summary: {
        messagesSent:     sent,
        messagesReceived: Number(msgStats.received)  || 0,
        messagesFailed:   Number(msgStats.failed)    || 0,
        deliveredRate:    sent > 0 ? +((delivered / sent) * 100).toFixed(1) : 0,
        readRate:         sent > 0 ? +((readCount  / sent) * 100).toFixed(1) : 0,
        uniqueContacts:   Number(unique_contacts)    || 0,
        totalLeads:       Number(leadStats.total)    || 0,
        newLeads:         Number(leadStats.new_leads) || 0,
        optedIn:          Number(leadStats.opted_in)  || 0,
        conversionRate:   +((converted / totalLeads) * 100).toFixed(1),
        appointments:     Number(apptStats.total)     || 0,
        apptCompleted:    Number(apptStats.completed) || 0,
        apptUpcoming:     Number(apptStats.upcoming)  || 0,
        apptCancelled:    Number(apptStats.cancelled) || 0,
      },
    });
  } catch (err) {
    console.error('[Reports:summary]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/messages
// ═════════════════════════════════════════════════════════════════════════════
router.get('/messages', async (req, res) => {
  const tenantId = req.user.tenantId;
  const range    = req.query.range || '30d';
  const df       = dateFilter('created_at', range);

  try {
    const [rows] = await pool.execute(
      `SELECT
         DATE(created_at)                                     AS day,
         SUM(direction = 'outbound')                          AS sent,
         SUM(direction = 'inbound')                           AS received,
         SUM(direction = 'outbound' AND status = 'delivered') AS delivered,
         SUM(direction = 'outbound' AND status = 'read')      AS read_count
       FROM message_logs
       WHERE tenant_id = ? ${df}
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      [tenantId]
    );

    const data = rows.map(r => ({
      name:      new Date(r.day).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      sent:      Number(r.sent)       || 0,
      received:  Number(r.received)   || 0,
      delivered: Number(r.delivered)  || 0,
      read:      Number(r.read_count) || 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('[Reports:messages]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/leads-funnel
// ═════════════════════════════════════════════════════════════════════════════
router.get('/leads-funnel', async (req, res) => {
  const tenantId = req.user.tenantId;

  const labelMap = {
    new:         'New',
    contacted:   'Contacted',
    qualified:   'Qualified',
    interested:  'Interested',
    appointment: 'Appointment',
    closed:      'Closed',
    lost:        'Lost',
    opt_out:     'Opted Out',
  };

  try {
    const [rows] = await pool.execute(
      `SELECT status, COUNT(*) AS count
       FROM leads
       WHERE tenant_id = ?
       GROUP BY status
       ORDER BY FIELD(status,'new','contacted','qualified','interested','appointment','closed','lost','opt_out')`,
      [tenantId]
    );

    const data = rows.map(r => ({
      stage: labelMap[r.status] ?? r.status,
      count: Number(r.count),
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('[Reports:leads-funnel]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/campaigns
// ═════════════════════════════════════════════════════════════════════════════
router.get('/campaigns', async (req, res) => {
  const tenantId = req.user.tenantId;
  const range    = req.query.range || '30d';
  const df       = dateFilter('ml.created_at', range);

  try {
    const [rows] = await pool.execute(
      `SELECT
         c.id,
         c.name,
         c.status,
         c.messages_sent,
         c.opens,
         COUNT(ml.id)                  AS log_total,
         SUM(ml.status = 'delivered')  AS delivered,
         SUM(ml.status = 'read')       AS read_count,
         SUM(ml.status = 'failed')     AS failed,
         SUM(ml.direction = 'inbound') AS replies
       FROM campaigns c
       LEFT JOIN message_logs ml
         ON ml.campaign_id = c.id
         AND ml.tenant_id  = c.tenant_id
         ${df}
       WHERE c.tenant_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT 10`,
      [tenantId]
    );

    const data = rows.map(r => ({
      id:        r.id,
      name:      r.name.length > 20 ? r.name.substring(0, 18) + '…' : r.name,
      fullName:  r.name,
      status:    r.status,
      sent:      Number(r.messages_sent) || Number(r.log_total) || 0,
      opens:     Number(r.opens)         || 0,
      delivered: Number(r.delivered)     || 0,
      read:      Number(r.read_count)    || 0,
      failed:    Number(r.failed)        || 0,
      replies:   Number(r.replies)       || 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('[Reports:campaigns]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/lead-sources
// ═════════════════════════════════════════════════════════════════════════════
router.get('/lead-sources', async (req, res) => {
  const tenantId = req.user.tenantId;

  const sourceLabels = {
    whatsapp_bot: 'WhatsApp Bot',
    manual:       'Manual Entry',
    website:      'Website',
    referral:     'Referral',
    campaign:     'Campaign',
    Unknown:      'Unknown',
  };

  try {
    const [rows] = await pool.execute(
      `SELECT
         COALESCE(NULLIF(source, ''), 'Unknown') AS name,
         COUNT(*) AS value
       FROM leads
       WHERE tenant_id = ?
       GROUP BY name
       ORDER BY value DESC`,
      [tenantId]
    );

    const data = rows.map(r => ({
      name:  sourceLabels[r.name] ?? r.name,
      value: Number(r.value),
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('[Reports:lead-sources]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/appointments
// ═════════════════════════════════════════════════════════════════════════════
router.get('/appointments', async (req, res) => {
  const tenantId = req.user.tenantId;
  const range    = req.query.range || '30d';
  const df       = dateFilter('created_at', range);

  try {
    const [rows] = await pool.execute(
    `SELECT
      DATE_FORMAT(date, '%b %Y')    AS month,
      DATE_FORMAT(date, '%Y-%m')    AS sort_key,
      SUM(status = 'scheduled')     AS scheduled,
      SUM(status = 'completed')     AS completed,
      SUM(status = 'cancelled')     AS cancelled
    FROM appointments
    WHERE tenant_id = ? ${df}
    GROUP BY DATE_FORMAT(date, '%Y-%m'), DATE_FORMAT(date, '%b %Y')
    ORDER BY sort_key ASC`,
    [tenantId]
  );

    const data = rows.map(r => ({
      name:      r.month,
      scheduled: Number(r.scheduled) || 0,
      completed: Number(r.completed) || 0,
      cancelled: Number(r.cancelled) || 0,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('[Reports:appointments]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/reports/dashboard
// All data needed for the Dashboard page in one shot
// ═════════════════════════════════════════════════════════════════════════════
router.get('/dashboard', async (req, res) => {
  const tenantId = req.user.tenantId;

  try {
    // ── Tenant credits ──
    const [[tenant]] = await pool.execute(
      `SELECT name, credits_balance, total_messages_sent FROM tenants WHERE id = ?`,
      [tenantId]
    );

    // ── Messages sent this month ──
    const [[{ msgs_this_month }]] = await pool.execute(
      `SELECT COUNT(*) AS msgs_this_month
       FROM message_logs
       WHERE tenant_id = ? AND direction = 'outbound'
         AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())`,
      [tenantId]
    );

    // ── New leads this week ──
    const [[{ new_leads_week }]] = await pool.execute(
      `SELECT COUNT(*) AS new_leads_week
       FROM leads
       WHERE tenant_id = ? AND status = 'new'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [tenantId]
    );

    // ── Upcoming appointments ──
    const [[{ upcoming_appts }]] = await pool.execute(
      `SELECT COUNT(*) AS upcoming_appts
       FROM appointments
       WHERE tenant_id = ? AND status = 'scheduled' AND date >= CURDATE()`,
      [tenantId]
    );

    // ── Conversion rate (appointment + closed / total leads) ──
    const [[convStats]] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(status IN ('appointment', 'closed')) AS converted
       FROM leads WHERE tenant_id = ?`,
      [tenantId]
    );
    const conversionRate = convStats.total > 0
      ? +((convStats.converted / convStats.total) * 100).toFixed(1)
      : 0;

    // ── Weekly chart: last 7 days daily sent/received ──
    const [weeklyRows] = await pool.execute(
      `SELECT
         DATE(created_at)             AS day,
         SUM(direction = 'outbound')  AS sent,
         SUM(direction = 'inbound')   AS received
       FROM message_logs
       WHERE tenant_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      [tenantId]
    );
    const weeklyChartData = weeklyRows.map(r => ({
      name:   new Date(r.day).toLocaleDateString('en-IN', { weekday: 'short' }),
      value:  Number(r.sent)     || 0,
      value2: Number(r.received) || 0,
    }));

    // ── Monthly chart: last 6 months ──
    const [monthlyRows] = await pool.execute(
      `SELECT
        DATE_FORMAT(created_at, '%b')                   AS month,
        DATE_FORMAT(created_at, '%Y-%m')                AS sort_key,
        SUM(direction = 'outbound')                     AS sent,
        SUM(direction = 'inbound')                      AS received
      FROM message_logs
      WHERE tenant_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
      ORDER BY sort_key ASC`,
      [tenantId]
    );
    const monthlyChartData = monthlyRows.map(r => ({
      name:   r.month,
      value:  Number(r.sent)     || 0,
      value2: Number(r.received) || 0,
    }));

    // ── Lead sources ──
    const [sourceRows] = await pool.execute(
      `SELECT
        COALESCE(NULLIF(TRIM(source), ''), 'Unknown') AS name,
        COUNT(*)                                       AS value
      FROM leads
      WHERE tenant_id = ?
      GROUP BY COALESCE(NULLIF(TRIM(source), ''), 'Unknown')
      ORDER BY value DESC`,
      [tenantId]
    );
    const sourceLabels = {
      whatsapp_bot: 'WhatsApp Bot', manual: 'Manual',
      website: 'Website', referral: 'Referral',
      campaign: 'Campaign', Unknown: 'Unknown',
    };
    const leadSourceData = sourceRows.map(r => ({
      name:  sourceLabels[r.name] ?? r.name,
      value: Number(r.value),
    }));

    // ── Recent new leads (last 5) ──
    const [recentLeads] = await pool.execute(
      `SELECT id, name, phone, property, status, source, created_at
       FROM leads
       WHERE tenant_id = ? AND status = 'new'
       ORDER BY created_at DESC LIMIT 5`,
      [tenantId]
    );

    // ── Upcoming appointments with lead name (next 5) ──
    const [upcomingAppointments] = await pool.execute(
      `SELECT a.id, a.date, a.time, a.type, a.status,
              l.name AS lead_name, l.phone AS lead_phone
       FROM appointments a
       LEFT JOIN leads l ON l.id = a.lead_id
       WHERE a.tenant_id = ? AND a.status = 'scheduled' AND a.date >= CURDATE()
       ORDER BY a.date ASC, a.time ASC LIMIT 5`,
      [tenantId]
    );

    // ── Active campaigns (top 3) with log-based counts ──
    const [activeCampaigns] = await pool.execute(
      `SELECT
         c.id, c.name, c.status, c.messages_sent, c.opens,
         COUNT(ml.id)                  AS log_sent,
         SUM(ml.status = 'read')       AS read_count,
         SUM(ml.direction = 'inbound') AS replies
       FROM campaigns c
       LEFT JOIN message_logs ml ON ml.campaign_id = c.id AND ml.tenant_id = c.tenant_id
       WHERE c.tenant_id = ? AND c.status = 'active'
       GROUP BY c.id
       ORDER BY c.created_at DESC LIMIT 3`,
      [tenantId]
    );

    res.json({
      success: true,
      stats: {
        credits:              Number(tenant.credits_balance)  || 0,
        messagesSent:         Number(msgs_this_month)         || 0,
        newLeads:             Number(new_leads_week)          || 0,
        upcomingAppointments: Number(upcoming_appts)          || 0,
        conversionRate,
      },
      weeklyChartData,
      monthlyChartData,
      leadSourceData,
      recentLeads:         recentLeads.map(l => ({
        id:       l.id,
        name:     l.name,
        phone:    l.phone,
        property: l.property ?? '',
        status:   l.status,
        source:   l.source,
      })),
      upcomingAppointments: upcomingAppointments.map(a => ({
        id:       a.id,
        date:     a.date,
        time:     a.time,
        type:     a.type,
        leadName: a.lead_name ?? 'Unknown',
        phone:    a.lead_phone,
      })),
      activeCampaigns: activeCampaigns.map(c => {
        const sent = Number(c.messages_sent) || Number(c.log_sent) || 0;
        const read = Number(c.read_count) || 0;
        return {
          id:           c.id,
          name:         c.name,
          status:       c.status,
          messagesSent: sent,
          opens:        Number(c.opens) || read,
          replies:      Number(c.replies) || 0,
        };
      }),
    });

  } catch (err) {
    console.error('[Reports:dashboard]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


export default router;