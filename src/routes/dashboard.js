import { Router } from "express";
import pool from "../config/database.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/stats", requireAuth, async (req, res) => {
  const tenantId = req.user.tenantId;

  try {
    const [[tenantRow]] = await pool.query(
      `SELECT credits, total_messages_sent
       FROM tenants
       WHERE id = ?`,
      [tenantId]
    );

    const [[newLeadsRow]] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM leads
       WHERE tenant_id = ?
         AND created_at >= (NOW() - INTERVAL 7 DAY)`,
      [tenantId]
    );

    const [[upcomingRow]] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM appointments
       WHERE tenant_id = ?
         AND status = 'scheduled'
         AND date >= CURDATE()`,
      [tenantId]
    );

    const [[activeCampaignsRow]] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM campaigns
       WHERE tenant_id = ?
         AND status = 'active'`,
      [tenantId]
    );

    const [[leadTotalsRow]] = await pool.query(
      `SELECT
         SUM(CASE WHEN status IN ('closed','converted') THEN 1 ELSE 0 END) AS convertedCount,
         COUNT(*) AS totalCount
       FROM leads
       WHERE tenant_id = ?`,
      [tenantId]
    );

    const total = Number(leadTotalsRow?.totalCount || 0);
    const converted = Number(leadTotalsRow?.convertedCount || 0);
    const conversionRate = total > 0 ? Number(((converted / total) * 100).toFixed(1)) : 0;

    return res.json({
      credits: Number(tenantRow?.credits || 0),
      messagesSent: Number(tenantRow?.total_messages_sent || 0),
      newLeads: Number(newLeadsRow?.count || 0),
      upcomingAppointments: Number(upcomingRow?.count || 0),
      activeCampaigns: Number(activeCampaignsRow?.count || 0),
      conversionRate,
    });
  } catch (err) {
    console.error("GET /dashboard/stats error:", err);
    return res.status(500).json({ message: "Failed to load dashboard stats" });
  }
});

router.get("/charts", requireAuth, async (req, res) => {
  const tenantId = req.user.tenantId;

  try {
    // Leads trend last 7 days
    const [trendRows] = await pool.query(
      `SELECT
         DATE(created_at) AS day,
         COUNT(*) AS leadsCreated
       FROM leads
       WHERE tenant_id = ?
         AND created_at >= (CURDATE() - INTERVAL 6 DAY)
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      [tenantId]
    );

    const dayMap = {};
    for (const r of trendRows) {
      const key = new Date(r.day).toISOString().slice(0, 10);
      dayMap[key] = Number(r.leadsCreated || 0);
    }

    const leadsTrend = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      return { name: label, value: dayMap[key] ?? 0, value2: 0 };
    });

    // Leads by status
    const [statusRows] = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM leads
       WHERE tenant_id = ?
       GROUP BY status`,
      [tenantId]
    );

    const leadsByStatus = statusRows.map((r) => ({
      name: String(r.status),
      value: Number(r.count || 0),
    }));

    // Monthly performance: messagesSent from campaigns + leads created
    const [leadsMonthlyRows] = await pool.query(
      `SELECT
         DATE_FORMAT(created_at, '%Y-%m') AS monthKey,
         DATE_FORMAT(created_at, '%b') AS monthLabel,
         COUNT(*) AS leadsCreated
       FROM leads
       WHERE tenant_id = ?
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY monthKey, monthLabel
       ORDER BY monthKey ASC`,
      [tenantId]
    );

    const [msgsMonthlyRows] = await pool.query(
      `SELECT
         DATE_FORMAT(created_at, '%Y-%m') AS monthKey,
         SUM(messages_sent) AS messagesSent
       FROM campaigns
       WHERE tenant_id = ?
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY monthKey
       ORDER BY monthKey ASC`,
      [tenantId]
    );

    const msgMap = {};
    for (const r of msgsMonthlyRows) {
      msgMap[String(r.monthKey)] = Number(r.messagesSent || 0);
    }

    const monthlyPerformance = leadsMonthlyRows.map((r) => ({
      name: String(r.monthLabel),
      value: msgMap[String(r.monthKey)] ?? 0,
      value2: Number(r.leadsCreated || 0),
    }));

    return res.json({ leadsTrend, leadsByStatus, monthlyPerformance });
  } catch (err) {
    console.error("GET /dashboard/charts error:", err);
    return res.status(500).json({ message: "Failed to load dashboard charts" });
  }
});

export default router;
