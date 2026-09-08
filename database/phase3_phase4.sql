-- Phase 3: inbox read-tracking
ALTER TABLE message_logs
  ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0 AFTER direction,
  ADD INDEX idx_tenant_read (tenant_id, is_read);

-- Phase 4: campaign analytics + recipients
ALTER TABLE campaigns
  ADD COLUMN messages_delivered INT NOT NULL DEFAULT 0 AFTER messages_sent,
  ADD COLUMN messages_read      INT NOT NULL DEFAULT 0 AFTER messages_delivered,
  ADD COLUMN messages_failed    INT NOT NULL DEFAULT 0 AFTER messages_read,
  ADD COLUMN recipients         JSON NULL AFTER target_audience;
