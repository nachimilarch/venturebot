-- CRM Integration: API Keys table
-- Run this migration on your database

CREATE TABLE IF NOT EXISTS `api_keys` (
  `id`         bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id`  bigint unsigned NOT NULL,
  `name`       varchar(100)    NOT NULL COMMENT 'Friendly name e.g. "My CRM Key"',
  `key_hash`   varchar(64)     NOT NULL COMMENT 'SHA-256 hash of the raw key',
  `key_prefix` varchar(12)     NOT NULL COMMENT 'First 12 chars shown in UI for identification',
  `is_active`  tinyint(1)      NOT NULL DEFAULT 1,
  `last_used`  timestamp       NULL DEFAULT NULL,
  `created_at` timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_key_hash` (`key_hash`),
  KEY `fk_apikeys_tenant` (`tenant_id`),
  CONSTRAINT `fk_apikeys_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
