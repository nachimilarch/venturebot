-- Phase 5 + 6: tenant_settings (KV store per tenant)
CREATE TABLE IF NOT EXISTS tenant_settings (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id   BIGINT UNSIGNED NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  value       JSON NOT NULL,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tenant_key (tenant_id, setting_key)
);

-- Phase 5: credit alert log (one entry per alert sent, prevents spam)
CREATE TABLE IF NOT EXISTS credit_alerts (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id  BIGINT UNSIGNED NOT NULL,
  balance    INT NOT NULL,
  alerted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tenant_alert (tenant_id, alerted_at)
);

-- Phase 7: drip sequences
CREATE TABLE IF NOT EXISTS drip_sequences (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id     BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(255) NOT NULL,
  description   TEXT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tenant (tenant_id)
);

-- Phase 7: drip steps (each step = one template message, sent after delay_hours from previous)
CREATE TABLE IF NOT EXISTS drip_steps (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sequence_id   BIGINT UNSIGNED NOT NULL,
  tenant_id     BIGINT UNSIGNED NOT NULL,
  position      INT NOT NULL DEFAULT 0,
  template_name VARCHAR(255) NOT NULL,
  language      VARCHAR(10) NOT NULL DEFAULT 'en',
  delay_hours   INT NOT NULL DEFAULT 24,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sequence (sequence_id),
  FOREIGN KEY (sequence_id) REFERENCES drip_sequences(id) ON DELETE CASCADE
);

-- Phase 7: drip enrollments (one row per contact per sequence)
CREATE TABLE IF NOT EXISTS drip_enrollments (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  sequence_id  BIGINT UNSIGNED NOT NULL,
  contact_phone VARCHAR(30) NOT NULL,
  current_step INT NOT NULL DEFAULT 0,
  next_send_at DATETIME NOT NULL,
  status       ENUM('active','completed','paused','cancelled') DEFAULT 'active',
  enrolled_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enrollment (tenant_id, sequence_id, contact_phone),
  KEY idx_next_send (next_send_at, status),
  FOREIGN KEY (sequence_id) REFERENCES drip_sequences(id) ON DELETE CASCADE
);
