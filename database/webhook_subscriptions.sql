CREATE TABLE IF NOT EXISTS `webhook_subscriptions` (
  `id`             bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id`      bigint unsigned NOT NULL,
  `name`           varchar(100)    NOT NULL,
  `url`            varchar(500)    NOT NULL,
  `secret`         varchar(64)     NOT NULL COMMENT 'HMAC-SHA256 signing secret — shown once at creation',
  `events`         varchar(255)    NOT NULL DEFAULT 'message.received' COMMENT 'Comma-separated event types',
  `is_active`      tinyint(1)      NOT NULL DEFAULT 1,
  `failure_count`  int             NOT NULL DEFAULT 0,
  `last_triggered` timestamp       NULL DEFAULT NULL,
  `created_at`     timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_webhooksub_tenant` (`tenant_id`, `is_active`),
  CONSTRAINT `fk_webhooksub_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
