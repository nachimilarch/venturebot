-- Migration: Add AI token billing (separate from message credits)
-- Run on EC2: mysql -u root -p whatsappbulk < /home/ubuntu/backend/migrations/add_ai_tokens.sql

-- 1. Add ai_tokens_balance to tenants table (idempotent via procedure)
DROP PROCEDURE IF EXISTS _add_ai_tokens;
CREATE PROCEDURE _add_ai_tokens()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'tenants'
      AND COLUMN_NAME  = 'ai_tokens_balance'
  ) THEN
    ALTER TABLE tenants
      ADD COLUMN ai_tokens_balance INT NOT NULL DEFAULT 50000
      COMMENT 'AI token allowance — separate from WhatsApp message credits';
  END IF;
END;
CALL _add_ai_tokens();
DROP PROCEDURE IF EXISTS _add_ai_tokens;

-- Give existing tenants a 50 000 token starting balance
UPDATE tenants SET ai_tokens_balance = 50000 WHERE ai_tokens_balance = 0;

-- 2. Create per-call AI usage log
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id     INT         NOT NULL,
  feature       VARCHAR(50) NOT NULL,
  model         VARCHAR(50) NOT NULL DEFAULT 'llama3.2:3b',
  input_tokens  INT         NOT NULL DEFAULT 0,
  output_tokens INT         NOT NULL DEFAULT 0,
  total_tokens  INT         NOT NULL DEFAULT 0,
  cached        TINYINT(1)  NOT NULL DEFAULT 0,
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_date (tenant_id, created_at),
  INDEX idx_feature     (feature)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
