// src/services/whatsappConfigService.js
import pool from '../config/database.js';
import axios from 'axios';

// In-memory cache — avoids DB hit on every message
const credCache = new Map(); // tenantId → { config, fetchedAt }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get WhatsApp config for a tenant from DB (with cache)
 */
export async function getWhatsAppConfig(tenantId) {
  const cached = credCache.get(tenantId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.config;
  }

  const [rows] = await pool.execute(
    'SELECT * FROM whatsapp_config WHERE tenant_id = ? AND is_active = 1',
    [tenantId]
  );

  if (!rows.length) {
    credCache.delete(tenantId); // don't cache null
    return null;
  }

  const config = rows[0];
  credCache.set(tenantId, { config, fetchedAt: Date.now() });
  return config;
}

/**
 * Clear cached config for a tenant (call after save/update/delete)
 */
export function clearConfigCache(tenantId) {
  credCache.delete(tenantId);
}

/**
 * Find tenant by incoming phone_number_id (used in webhook routing)
 */
export async function getTenantByPhoneNumberId(phoneNumberId) {
  const [rows] = await pool.execute(
    `SELECT 
      wc.id,
      wc.tenant_id,
      wc.phone_number_id,
      wc.business_account_id,
      wc.access_token,
      wc.app_id,
      wc.app_secret,
      wc.verify_token,
      wc.webhook_secret,
      wc.display_phone_number,
      wc.verified_name,
      wc.quality_rating,
      wc.account_mode,
      wc.api_version,
      wc.is_active,
      wc.is_verified,
      t.name AS tenant_name
     FROM whatsapp_config wc
     JOIN tenants t ON wc.tenant_id = t.id
     WHERE wc.phone_number_id = ? AND wc.is_active = 1
     LIMIT 1`,
    [phoneNumberId]
  );
  return rows[0] || null;
}

/**
 * Validate credentials against Meta API
 * Returns { valid, displayPhone, verifiedName, accountMode, error }
 */
export async function validateMetaCredentials(phoneNumberId, accessToken, apiVersion = 'v21.0') {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`,
      {
        params: { fields: 'display_phone_number,verified_name,account_mode,quality_rating' },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return {
      valid: true,
      displayPhone: response.data.display_phone_number,
      verifiedName: response.data.verified_name,
      accountMode: response.data.account_mode,
      qualityRating: response.data.quality_rating,
    };
  } catch (error) {
    return {
      valid: false,
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

export default {
  getWhatsAppConfig,
  clearConfigCache,
  getTenantByPhoneNumberId,
  validateMetaCredentials,
};
