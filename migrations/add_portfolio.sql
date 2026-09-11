-- Migration: AI portfolio (images/PDFs tenants can send to leads)
-- Run on EC2: mysql -u root -p whatsapp_bulk < /home/ubuntu/backend/migrations/add_portfolio.sql

CREATE TABLE IF NOT EXISTS tenant_portfolio (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id           INT           NOT NULL,
  file_name           VARCHAR(255)  NOT NULL,
  file_type           ENUM('image','document') NOT NULL DEFAULT 'document',
  mime_type           VARCHAR(100)  NOT NULL,
  whatsapp_media_id   VARCHAR(255)  NOT NULL,
  description         VARCHAR(500)  NOT NULL DEFAULT '',
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
