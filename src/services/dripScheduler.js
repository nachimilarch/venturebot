// services/dripScheduler.js — process due drip enrollment steps
import pool from '../config/database.js';
import whatsappTemplateService from './whatsappTemplateService.js';

const CHECK_INTERVAL = 60_000;

async function getWaConfig(tenantId) {
  const [[row]] = await pool.execute(
    'SELECT * FROM whatsapp_config WHERE tenant_id = ? AND is_active = 1 LIMIT 1',
    [tenantId]
  );
  return row || null;
}

async function processDueEnrollments() {
  const [due] = await pool.execute(
    `SELECT e.id, e.tenant_id, e.sequence_id, e.contact_phone, e.current_step,
            s.tenant_id AS seq_tenant
     FROM drip_enrollments e
     JOIN drip_sequences s ON s.id = e.sequence_id AND s.is_active = 1
     WHERE e.status = 'active' AND e.next_send_at <= NOW()
     LIMIT 100`
  );

  for (const enrollment of due) {
    try {
      const [steps] = await pool.execute(
        'SELECT * FROM drip_steps WHERE sequence_id = ? ORDER BY position ASC',
        [enrollment.sequence_id]
      );

      const step = steps[enrollment.current_step];
      if (!step) {
        // All steps done — mark completed
        await pool.execute(
          "UPDATE drip_enrollments SET status = 'completed', updated_at = NOW() WHERE id = ?",
          [enrollment.id]
        );
        continue;
      }

      const waConfig = await getWaConfig(enrollment.tenant_id);
      if (!waConfig) {
        await pool.execute(
          "UPDATE drip_enrollments SET status = 'paused', updated_at = NOW() WHERE id = ?",
          [enrollment.id]
        );
        continue;
      }

      if (!enrollment.contact_phone) continue;

      const result = await whatsappTemplateService.sendTemplateMessage(
        enrollment.contact_phone, step.template_name, step.language, [], waConfig
      );

      if (result.success) {
        await pool.execute(
          `INSERT INTO message_logs
           (tenant_id, contact_phone, message, status, direction, sent_at, message_id)
           VALUES (?, ?, ?, 'sent', 'outbound', NOW(), ?)`,
          [enrollment.tenant_id, enrollment.contact_phone,
           `[Drip: ${step.template_name}]`, result.messageId || null]
        );

        // Deduct 1 credit
        await pool.execute(
          'UPDATE tenants SET credits_balance = credits_balance - 1, total_messages_sent = total_messages_sent + 1 WHERE id = ?',
          [enrollment.tenant_id]
        );

        const nextStep = steps[enrollment.current_step + 1];
        if (nextStep) {
          await pool.execute(
            `UPDATE drip_enrollments
             SET current_step = ?, next_send_at = DATE_ADD(NOW(), INTERVAL ? HOUR), updated_at = NOW()
             WHERE id = ?`,
            [enrollment.current_step + 1, nextStep.delay_hours, enrollment.id]
          );
        } else {
          await pool.execute(
            "UPDATE drip_enrollments SET status = 'completed', updated_at = NOW() WHERE id = ?",
            [enrollment.id]
          );
        }
      } else {
        // Retry next interval (don't advance step)
        console.warn(`[drip] enrollment ${enrollment.id} step ${enrollment.current_step} failed: ${result.error}`);
      }
    } catch (err) {
      console.error(`[drip] enrollment ${enrollment.id} error:`, err.message);
    }
  }
}

export function startDripScheduler() {
  setInterval(() => {
    processDueEnrollments().catch(err =>
      console.error('[dripScheduler]', err.message)
    );
  }, CHECK_INTERVAL);
  console.log('[scheduler] drip scheduler started');
}
