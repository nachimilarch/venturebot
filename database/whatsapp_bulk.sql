-- MySQL dump 10.13  Distrib 8.0.42, for macos15 (arm64)
--
-- Host: localhost    Database: whatsapp_bulk
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `appointments`
--

DROP TABLE IF EXISTS `appointments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `appointments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `lead_id` bigint unsigned DEFAULT NULL,
  `date` date DEFAULT NULL,
  `time` varchar(20) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `property` varchar(255) DEFAULT NULL,
  `status` enum('scheduled','completed','cancelled') DEFAULT 'scheduled',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appointments`
--

LOCK TABLES `appointments` WRITE;
/*!40000 ALTER TABLE `appointments` DISABLE KEYS */;
/*!40000 ALTER TABLE `appointments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `campaigns`
--

DROP TABLE IF EXISTS `campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campaigns` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(50) DEFAULT 'whatsapp',
  `template_name` varchar(255) DEFAULT NULL,
  `template_language` varchar(10) DEFAULT NULL,
  `target_audience` varchar(255) DEFAULT NULL,
  `message` text,
  `scheduled_at` datetime DEFAULT NULL,
  `status` enum('pending','running','completed','failed','paused','draft','active') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `messages_sent` int DEFAULT '0',
  `opens` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_campaigns_tenant` (`tenant_id`),
  CONSTRAINT `fk_campaigns_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaigns`
--

LOCK TABLES `campaigns` WRITE;
/*!40000 ALTER TABLE `campaigns` DISABLE KEYS */;
INSERT INTO `campaigns` VALUES (1,1,'ABCDEFGH','promotional',NULL,NULL,'all','HI, WELCOME',NULL,'draft','2026-02-12 18:37:52','2026-02-12 18:37:52',0,0),(2,1,'my campaign','announcement',NULL,NULL,'all','new announcememnt',NULL,'draft','2026-02-13 18:06:01','2026-02-13 18:06:01',0,0),(3,1,'Property Tour Reminder','promotional',NULL,NULL,'all','Hi! Your property viewing is scheduled. Our agent will meet you at the location. Reply STOP to unsubscribe.',NULL,'draft','2026-02-14 14:29:01','2026-02-14 14:29:01',0,0),(4,1,'pharmatrix_app_promo_appointments_labs','promotional','pharmatrix_app_promo_appointments_labs','en','all','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.',NULL,'active','2026-02-22 14:56:37','2026-02-23 06:33:07',0,0);
/*!40000 ALTER TABLE `campaigns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contacts`
--

DROP TABLE IF EXISTS `contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contacts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `phone` varchar(30) NOT NULL,
  `custom_variables` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contacts`
--

LOCK TABLES `contacts` WRITE;
/*!40000 ALTER TABLE `contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversation_states`
--

DROP TABLE IF EXISTS `conversation_states`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversation_states` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(30) NOT NULL,
  `state` varchar(50) NOT NULL DEFAULT 'START',
  `data` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_phone` (`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversation_states`
--

LOCK TABLES `conversation_states` WRITE;
/*!40000 ALTER TABLE `conversation_states` DISABLE KEYS */;
/*!40000 ALTER TABLE `conversation_states` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leads`
--

DROP TABLE IF EXISTS `leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leads` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `source` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `whatsapp_opt_in` tinyint(1) NOT NULL DEFAULT '0',
  `whatsapp_opt_in_source` varchar(100) DEFAULT NULL,
  `whatsapp_consent_text` text,
  `whatsapp_opt_in_at` datetime DEFAULT NULL,
  `whatsapp_last_message_at` datetime DEFAULT NULL,
  `whatsapp_last_template` varchar(150) DEFAULT NULL,
  `property` varchar(255) DEFAULT NULL,
  `budget` varchar(100) DEFAULT NULL,
  `notes` text,
  `assigned_to` varchar(255) DEFAULT NULL,
  `status` enum('new','interested','appointment','closed','lost','contacted','qualified','opt_out') DEFAULT 'new',
  `score` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leads`
--

LOCK TABLES `leads` WRITE;
/*!40000 ALTER TABLE `leads` DISABLE KEYS */;
INSERT INTO `leads` VALUES (1,1,'Nachiketh Desai','Referral','nachichintu@gmail.com','918686903927',0,NULL,NULL,NULL,NULL,NULL,'property','50 Lakhs',NULL,NULL,'interested',0,'2026-02-14 17:29:20');
/*!40000 ALTER TABLE `leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_logs`
--

DROP TABLE IF EXISTS `message_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `campaign_id` bigint unsigned DEFAULT NULL,
  `contact_phone` varchar(30) NOT NULL,
  `message` text NOT NULL,
  `message_id` varchar(255) DEFAULT NULL,
  `status` enum('sent','delivered','read','failed','received') DEFAULT 'sent',
  `direction` enum('inbound','outbound') DEFAULT 'outbound',
  `sent_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `received_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_message_id` (`message_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_logs`
--

LOCK TABLES `message_logs` WRITE;
/*!40000 ALTER TABLE `message_logs` DISABLE KEYS */;
INSERT INTO `message_logs` VALUES (1,1,NULL,'918686903927','Hi! Your property viewing is scheduled. Our agent will meet you at the location. Reply STOP to unsubscribe.',NULL,'sent','outbound','2026-02-14 23:09:08',NULL,NULL,NULL,'2026-02-14 17:39:08'),(2,1,NULL,'918686903927','Hi! Your property viewing is scheduled. Our agent will meet you at the location. Reply STOP to unsubscribe.',NULL,'sent','outbound','2026-02-14 23:14:36',NULL,NULL,NULL,'2026-02-14 17:44:36'),(3,1,NULL,'918686903927','new announcememnt',NULL,'sent','outbound','2026-02-14 23:14:48',NULL,NULL,NULL,'2026-02-14 17:44:48'),(4,1,NULL,'918686903927','new announcememnt',NULL,'sent','outbound','2026-02-14 23:28:45',NULL,NULL,NULL,'2026-02-14 17:58:45'),(5,1,NULL,'918686903927','Hi! Your property viewing is scheduled. Our agent will meet you at the location. Reply STOP to unsubscribe.',NULL,'sent','outbound','2026-02-14 23:28:54',NULL,NULL,NULL,'2026-02-14 17:58:54'),(6,1,NULL,'918686903927','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSMDM1QjczNDE3QjkzQUMyMEExAA==','sent','outbound','2026-02-23 11:51:37',NULL,NULL,NULL,'2026-02-23 06:21:37'),(7,1,NULL,'918686903927','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSMjNFODQ0NkEwRDUwQjhCMzI2AA==','sent','outbound','2026-02-23 11:55:56',NULL,NULL,NULL,'2026-02-23 06:25:56'),(8,1,NULL,'918686903927','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSNUFGQUIyMUI0MzFGQkRBRUYwAA==','sent','outbound','2026-02-23 12:02:39',NULL,NULL,NULL,'2026-02-23 06:32:39'),(9,1,NULL,'918686903927','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSREIwODQwOUFBNUVDN0RGODNFAA==','sent','outbound','2026-02-23 12:08:20',NULL,NULL,NULL,'2026-02-23 06:38:20'),(10,1,NULL,'918686903927','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSRTY0MkQzQjMxREYyODA5QkFFAA==','sent','outbound','2026-02-23 12:09:01',NULL,NULL,NULL,'2026-02-23 06:39:01'),(11,1,NULL,'918686903927','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSMDRBQUI5RDgyMDVCMjgwQUMyAA==','sent','outbound','2026-02-23 17:44:31',NULL,NULL,NULL,'2026-02-23 12:14:31');
/*!40000 ALTER TABLE `message_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff`
--

DROP TABLE IF EXISTS `staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `staff_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff`
--

LOCK TABLES `staff` WRITE;
/*!40000 ALTER TABLE `staff` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenants` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `industry` varchar(255) DEFAULT NULL,
  `credits_balance` int DEFAULT '0',
  `total_messages_sent` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `subscription_plan` varchar(50) DEFAULT NULL,
  `subscription_status` varchar(20) DEFAULT NULL,
  `subscription_start` datetime DEFAULT NULL,
  `subscription_end` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
INSERT INTO `tenants` VALUES (1,'VWMC','REAL ESTATE',0,0,'2026-02-12 10:59:53',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `tenants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned NOT NULL,
  `type` enum('credit','debit') NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `transaction_ref` varchar(255) DEFAULT NULL,
  `payment_id` varchar(255) DEFAULT NULL,
  `credits` int DEFAULT '0',
  `amount` decimal(10,2) DEFAULT '0.00',
  `status` enum('pending','completed','failed') DEFAULT 'completed',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'admin',
  `status` enum('active','inactive') DEFAULT 'active',
  `phone` varchar(30) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_tenant` (`tenant_id`),
  CONSTRAINT `fk_users_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,'VWMC','vwmc@gmail.com','$2b$10$W78CvLUW.BwMkSvASLOAseRPiholHjOlIEgi8WAs8z1Lgw4ZRIJoW','admin','active',NULL,'2026-02-23 06:25:09','2026-02-11 18:26:39'),(2,NULL,'Milarch Tech','nachiketh.desai@milarch.in','$2b$10$DvS7yXjN7dAGiw/E0pgtUu6w.GIxqrM.ngaT4ms9hziP8Oo.Yk9CG','admin','active',NULL,'2026-02-23 06:25:09','2026-02-15 05:10:51');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-23 23:38:32
