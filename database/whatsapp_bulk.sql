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
  `notes` text,
  `booked_via` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `appointments`
--

LOCK TABLES `appointments` WRITE;
/*!40000 ALTER TABLE `appointments` DISABLE KEYS */;
INSERT INTO `appointments` VALUES (1,1,4,'2026-03-01','11:00 AM','General Consultation',NULL,'cancelled','2026-02-28 18:11:39','Booked via WhatsApp','whatsapp_bot'),(2,1,4,'2026-03-01','09:00 AM','General Consultation',NULL,'completed','2026-02-28 18:15:54','Booked via WhatsApp','whatsapp_bot'),(3,1,4,'2026-03-01','11:00 AM','General Consultation',NULL,'cancelled','2026-02-28 18:19:03','Booked via WhatsApp','whatsapp_bot'),(4,1,3,'2026-03-01','11:00 AM','General Consultation',NULL,'scheduled','2026-02-28 18:23:24','Booked via WhatsApp','whatsapp_bot'),(5,1,7,'2026-03-01','09:00 AM','General Consultation',NULL,'cancelled','2026-03-01 08:56:30','Booked via WhatsApp','whatsapp_bot');
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campaigns`
--

LOCK TABLES `campaigns` WRITE;
/*!40000 ALTER TABLE `campaigns` DISABLE KEYS */;
INSERT INTO `campaigns` VALUES (4,1,'pharmatrix_app_promo_appointments_labs','promotional','pharmatrix_app_promo_appointments_labs','en','all','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.',NULL,'active','2026-02-22 14:56:37','2026-02-23 06:33:07',0,0),(5,1,'pharmatrix_welcome_menu','promotional','pharmatrix_welcome_menu','en','all','Welcome to Pharmatrix ?\n\nYour Complete Healthcare Management Solution\n\nPharmatrix connects you with trusted doctors, labs, and medical services—all in one place. Book appointments, manage your health records, and get lab tests done at home with just a few taps.\n\nWhat would you like to do today?',NULL,'active','2026-02-24 17:17:22','2026-03-21 20:11:16',5,0),(6,1,'milarch_healthtech_pitch','promotional','milarch_healthtech_pitch','en','all','Hello,\n\nMilarch Tech develops custom healthcare and pharma management systems including:\n\n• Sales Force Automation (SFA)  \n• Doctor Visit Reporting Apps  \n• Target & Achievement Dashboards  \n• Attendance & GPS Tracking  \n• E-detailing & Training Platforms  \n\nIf you\'re looking to digitize your pharma operations, let\'s connect.',NULL,'active','2026-02-25 17:27:07','2026-03-21 20:10:59',0,0),(7,1,'pharmatrix_advertisement','promotional','pharmatrix_advertisement','en','all','Hello! Manage your patients and their medical records easily in this one single app. Try this out for our OP! ',NULL,'active','2026-03-15 16:56:07','2026-03-24 12:26:48',0,0);
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversation_states`
--

LOCK TABLES `conversation_states` WRITE;
/*!40000 ALTER TABLE `conversation_states` DISABLE KEYS */;
INSERT INTO `conversation_states` VALUES (1,'918686903927','LAB_SELECT_TEST','{}','2026-02-25 16:57:59','2026-03-15 16:16:44'),(6,'919849493543','MAIN_MENU','{}','2026-02-27 09:32:24','2026-02-27 09:32:24'),(7,'919347909645','MAIN_MENU','{}','2026-02-28 18:17:50','2026-02-28 18:23:34'),(8,'916300802521','MAIN_MENU','{}','2026-02-28 18:46:48','2026-02-28 18:46:49');
/*!40000 ALTER TABLE `conversation_states` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lab_bookings`
--

DROP TABLE IF EXISTS `lab_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lab_bookings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint unsigned DEFAULT NULL,
  `lead_id` bigint unsigned DEFAULT NULL,
  `test_name` varchar(255) NOT NULL,
  `price` decimal(10,2) DEFAULT '0.00',
  `status` enum('confirmed','collected','completed','cancelled') DEFAULT 'confirmed',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lab_bookings`
--

LOCK TABLES `lab_bookings` WRITE;
/*!40000 ALTER TABLE `lab_bookings` DISABLE KEYS */;
/*!40000 ALTER TABLE `lab_bookings` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leads`
--

LOCK TABLES `leads` WRITE;
/*!40000 ALTER TABLE `leads` DISABLE KEYS */;
INSERT INTO `leads` VALUES (7,1,'WhatsApp User','whatsapp_bot',NULL,'918686903927',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'appointment',0,'2026-03-01 08:56:30');
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
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_logs`
--

LOCK TABLES `message_logs` WRITE;
/*!40000 ALTER TABLE `message_logs` DISABLE KEYS */;
INSERT INTO `message_logs` VALUES (1,1,NULL,'918686903927','Hi! Your property viewing is scheduled. Our agent will meet you at the location. Reply STOP to unsubscribe.',NULL,'sent','outbound','2026-02-14 23:09:08',NULL,NULL,NULL,'2026-02-14 17:39:08'),(2,1,NULL,'918686903927','Hi! Your property viewing is scheduled. Our agent will meet you at the location. Reply STOP to unsubscribe.',NULL,'sent','outbound','2026-02-14 23:14:36',NULL,NULL,NULL,'2026-02-14 17:44:36'),(3,1,NULL,'918686903927','new announcememnt',NULL,'sent','outbound','2026-02-14 23:14:48',NULL,NULL,NULL,'2026-02-14 17:44:48'),(4,1,NULL,'918686903927','new announcememnt',NULL,'sent','outbound','2026-02-14 23:28:45',NULL,NULL,NULL,'2026-02-14 17:58:45'),(5,1,NULL,'918686903927','Hi! Your property viewing is scheduled. Our agent will meet you at the location. Reply STOP to unsubscribe.',NULL,'sent','outbound','2026-02-14 23:28:54',NULL,NULL,NULL,'2026-02-14 17:58:54'),(6,1,NULL,'918686903927','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSMDM1QjczNDE3QjkzQUMyMEExAA==','sent','outbound','2026-02-23 11:51:37',NULL,NULL,NULL,'2026-02-23 06:21:37'),(7,1,NULL,'918686903927','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSMjNFODQ0NkEwRDUwQjhCMzI2AA==','sent','outbound','2026-02-23 11:55:56',NULL,NULL,NULL,'2026-02-23 06:25:56'),(8,1,NULL,'918686903927','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSNUFGQUIyMUI0MzFGQkRBRUYwAA==','sent','outbound','2026-02-23 12:02:39',NULL,NULL,NULL,'2026-02-23 06:32:39'),(9,1,NULL,'918686903927','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSREIwODQwOUFBNUVDN0RGODNFAA==','sent','outbound','2026-02-23 12:08:20',NULL,NULL,NULL,'2026-02-23 06:38:20'),(10,1,NULL,'918686903927','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSRTY0MkQzQjMxREYyODA5QkFFAA==','sent','outbound','2026-02-23 12:09:01',NULL,NULL,NULL,'2026-02-23 06:39:01'),(11,1,NULL,'918686903927','Hi, \nTake control of your health with the Pharmatrix app.\n\n✅ Book appointments with trusted doctors near you  \n✅ Manage all your prescriptions in one secure place  \n✅ Book lab tests at top diagnostic centres\n\nTap below to get started and manage everything in one app.','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSMDRBQUI5RDgyMDVCMjgwQUMyAA==','sent','outbound','2026-02-23 17:44:31',NULL,NULL,NULL,'2026-02-23 12:14:31'),(12,1,NULL,'918686903927','Welcome to Pharmatrix ?\n\nYour Complete Healthcare Management Solution\n\nPharmatrix connects you with trusted doctors, labs, and medical services—all in one place. Book appointments, manage your health records, and get lab tests done at home with just a few taps.\n\nWhat would you like to do today?','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSQkQ5MTlGRTBENjlFQzg5N0IzAA==','sent','outbound','2026-02-24 22:47:45',NULL,NULL,NULL,'2026-02-24 17:17:45'),(13,1,NULL,'919397817541','Welcome to Pharmatrix ?\n\nYour Complete Healthcare Management Solution\n\nPharmatrix connects you with trusted doctors, labs, and medical services—all in one place. Book appointments, manage your health records, and get lab tests done at home with just a few taps.\n\nWhat would you like to do today?','wamid.HBgMOTE5Mzk3ODE3NTQxFQIAERgSRjZDNDczRkVDRjkxQTE3RTFEAA==','sent','outbound','2026-02-24 22:59:40',NULL,NULL,NULL,'2026-02-24 17:29:40'),(14,1,NULL,'919849493543','Welcome to Pharmatrix ?\n\nYour Complete Healthcare Management Solution\n\nPharmatrix connects you with trusted doctors, labs, and medical services—all in one place. Book appointments, manage your health records, and get lab tests done at home with just a few taps.\n\nWhat would you like to do today?','wamid.HBgMOTE5ODQ5NDkzNTQzFQIAERgSQTc1QzdCNTY0NEYxN0IyOURGAA==','sent','outbound','2026-02-24 22:59:42',NULL,NULL,NULL,'2026-02-24 17:29:42'),(15,1,NULL,'918686903927','Welcome to Pharmatrix ?\n\nYour Complete Healthcare Management Solution\n\nPharmatrix connects you with trusted doctors, labs, and medical services—all in one place. Book appointments, manage your health records, and get lab tests done at home with just a few taps.\n\nWhat would you like to do today?','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSOTQ1RkUyRjYwNDI0RTFFRTY4AA==','sent','outbound','2026-02-24 22:59:44',NULL,NULL,NULL,'2026-02-24 17:29:44'),(16,1,NULL,'919347909645','Welcome to Pharmatrix ?\n\nYour Complete Healthcare Management Solution\n\nPharmatrix connects you with trusted doctors, labs, and medical services—all in one place. Book appointments, manage your health records, and get lab tests done at home with just a few taps.\n\nWhat would you like to do today?','wamid.HBgMOTE5MzQ3OTA5NjQ1FQIAERgSOTQ1QkZGRjBCNUREOTk4MEJDAA==','sent','outbound','2026-02-24 23:01:57',NULL,NULL,NULL,'2026-02-24 17:31:57'),(17,1,NULL,'919347909645','[Template: pharmatrix_welcome_menu]','wamid.HBgMOTE5MzQ3OTA5NjQ1FQIAERgSMEFFMDk1RUIzMzQzMkJCREVEAA==','sent','outbound','2026-02-24 23:24:48',NULL,NULL,NULL,'2026-02-24 17:54:48'),(18,1,NULL,'919347909645','[Template: pharmatrix_welcome_menu]','wamid.HBgMOTE5MzQ3OTA5NjQ1FQIAERgSNDdGNzBCRjIyQjM4Q0Q5MkI5AA==','sent','outbound','2026-02-25 21:30:56',NULL,NULL,NULL,'2026-02-25 16:00:56'),(19,NULL,NULL,'918686903927','Hi','wamid.HBgMOTE4Njg2OTAzOTI3FQIAEhgUM0EyQTI5MjYyMEM3QUNGNkIyOEEA','received','inbound',NULL,NULL,NULL,'2026-02-25 22:27:56','2026-02-25 16:57:59'),(20,NULL,NULL,'918686903927','Book Doctor Appointment','wamid.HBgMOTE4Njg2OTAzOTI3FQIAEhgUM0EwQ0FBRjBBOTQ5NTJCNkIyRjMA','received','inbound',NULL,NULL,NULL,'2026-02-25 22:28:05','2026-02-25 16:58:07'),(21,NULL,NULL,'918686903927','Hi','wamid.HBgMOTE4Njg2OTAzOTI3FQIAEhgUM0FEOEUyMUU3QUI4RkNFMkI0MEIA','received','inbound',NULL,NULL,NULL,'2026-02-25 22:28:20','2026-02-25 16:58:22'),(22,NULL,NULL,'918686903927','Book Doctor Appointment','wamid.HBgMOTE4Njg2OTAzOTI3FQIAEhgUM0E0RUExMjc4RUQzRDYxMDAxRTIA','received','inbound',NULL,NULL,NULL,'2026-02-25 22:28:36','2026-02-25 16:58:39'),(23,1,NULL,'919397817541','[Template: milarch_healthtech_pitch]','wamid.HBgMOTE5Mzk3ODE3NTQxFQIAERgSREY2RERDNEYyRjg5MjE2ODJDAA==','delivered','outbound','2026-02-27 14:48:26','2026-02-27 14:48:29',NULL,NULL,'2026-02-27 09:18:26'),(24,1,NULL,'919849493543','[Template: milarch_healthtech_pitch]','wamid.HBgMOTE5ODQ5NDkzNTQzFQIAERgSQjdFQjEyNTExNzIxMjVBQjZDAA==','read','outbound','2026-02-27 14:48:29','2026-02-27 15:01:55',NULL,NULL,'2026-02-27 09:18:29'),(25,1,NULL,'918686903927','[Template: milarch_healthtech_pitch]','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSNzk5QUJDQzA2QzQ1OUM5RjY1AA==','read','outbound','2026-02-27 14:48:31','2026-02-27 14:48:53',NULL,NULL,'2026-02-27 09:18:31'),(26,1,NULL,'919397817541','[Template: pharmatrix_welcome_menu]','wamid.HBgMOTE5Mzk3ODE3NTQxFQIAERgSQkQ0RUMxMEREQkRBNzAyMjQ3AA==','delivered','outbound','2026-02-27 14:55:14','2026-02-27 14:55:16',NULL,NULL,'2026-02-27 09:25:14'),(27,1,NULL,'919849493543','[Template: pharmatrix_welcome_menu]','wamid.HBgMOTE5ODQ5NDkzNTQzFQIAERgSNUU3M0I0NzMxMjkzRThBM0REAA==','read','outbound','2026-02-27 14:55:16','2026-02-27 15:01:55',NULL,NULL,'2026-02-27 09:25:16'),(28,1,NULL,'918686903927','[Template: pharmatrix_welcome_menu]','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSMzNFQkJCODg5NjI3RTcwNDEzAA==','read','outbound','2026-02-27 14:55:18','2026-02-27 14:56:41',NULL,NULL,'2026-02-27 09:25:18'),(29,NULL,NULL,'918686903927','Contact Support','wamid.HBgMOTE4Njg2OTAzOTI3FQIAEhgUM0E5MjJCQjJBRTczQkJDRTE1NUIA','received','inbound',NULL,NULL,NULL,'2026-02-27 14:56:46','2026-02-27 09:26:48'),(30,NULL,NULL,'919849493543','My Appointments','wamid.HBgMOTE5ODQ5NDkzNTQzFQIAEhgUM0FBQkJBMjZCNDE0MkE5OEY3OUUA','received','inbound',NULL,NULL,NULL,'2026-02-27 15:02:20','2026-02-27 09:32:24'),(31,1,NULL,'918686903927','Hi',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:39:10','2026-02-28 18:09:10'),(32,1,NULL,'918686903927','Hi',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:40:48','2026-02-28 18:10:48'),(33,1,NULL,'918686903927','menu_book_appt',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:41:06','2026-02-28 18:11:06'),(34,1,NULL,'918686903927','appt_general',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:41:19','2026-02-28 18:11:19'),(35,1,NULL,'918686903927','slot_2',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:41:29','2026-02-28 18:11:29'),(36,1,NULL,'918686903927','appt_yes',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:41:39','2026-02-28 18:11:39'),(37,1,NULL,'918686903927','menu_my_appts',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:42:09','2026-02-28 18:12:09'),(38,1,NULL,'918686903927','menu_records',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:42:19','2026-02-28 18:12:19'),(39,1,NULL,'918686903927','main_menu',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:42:27','2026-02-28 18:12:27'),(40,1,NULL,'918686903927','menu_lab_test',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:42:35','2026-02-28 18:12:35'),(41,1,5,'919347909645','[Template: pharmatrix_welcome_menu]','wamid.HBgMOTE5MzQ3OTA5NjQ1FQIAERgSMDkzNzk0QTdFRDNBOUE2QjJCAA==','sent','outbound','2026-02-28 23:44:35',NULL,NULL,NULL,'2026-02-28 18:14:35'),(42,1,5,'918686903927','[Template: pharmatrix_welcome_menu]','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSRUJBMTc3OEZFQkVFQzJFMTQ2AA==','sent','outbound','2026-02-28 23:44:37',NULL,NULL,NULL,'2026-02-28 18:14:37'),(43,1,5,'918686903927','[Template: pharmatrix_welcome_menu]','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSNkMzMzg4NTE1MzMyOUIxNEYxAA==','sent','outbound','2026-02-28 23:44:39',NULL,NULL,NULL,'2026-02-28 18:14:39'),(44,1,NULL,'918686903927','Hi',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:45:17','2026-02-28 18:15:17'),(45,1,NULL,'918686903927','menu_book_appt',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:45:34','2026-02-28 18:15:34'),(46,1,NULL,'918686903927','appt_general',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:45:45','2026-02-28 18:15:45'),(47,1,NULL,'918686903927','slot_1',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:45:50','2026-02-28 18:15:50'),(48,1,NULL,'918686903927','appt_yes',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:45:54','2026-02-28 18:15:54'),(49,1,NULL,'919347909645','Hi',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:47:50','2026-02-28 18:17:50'),(50,1,NULL,'919347909645','menu_book_appt',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:48:02','2026-02-28 18:18:02'),(51,1,NULL,'919347909645','appt_general',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:48:16','2026-02-28 18:18:16'),(52,1,NULL,'919347909645','slot_1',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:48:30','2026-02-28 18:18:30'),(53,1,NULL,'918686903927','Hi',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:48:33','2026-02-28 18:18:33'),(54,1,NULL,'918686903927','menu_book_appt',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:48:41','2026-02-28 18:18:41'),(55,1,NULL,'919347909645','appt_no',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:48:42','2026-02-28 18:18:42'),(56,1,NULL,'918686903927','appt_general',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:48:54','2026-02-28 18:18:54'),(57,1,NULL,'919347909645','main_menu',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:48:58','2026-02-28 18:18:58'),(58,1,NULL,'918686903927','slot_2',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:48:59','2026-02-28 18:18:59'),(59,1,NULL,'918686903927','appt_yes',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:49:03','2026-02-28 18:19:03'),(60,1,NULL,'918686903927','menu_my_appts',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:49:25','2026-02-28 18:19:25'),(61,1,NULL,'918686903927','menu_my_appts',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:49:31','2026-02-28 18:19:31'),(62,1,NULL,'918686903927','main_menu',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:49:41','2026-02-28 18:19:41'),(63,1,NULL,'918686903927','menu_records',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:50:17','2026-02-28 18:20:17'),(64,1,NULL,'918686903927','main_menu',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:50:49','2026-02-28 18:20:49'),(65,1,NULL,'918686903927','menu_my_appts',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:51:56','2026-02-28 18:21:56'),(66,1,NULL,'919347909645','menu_my_appts',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:52:53','2026-02-28 18:22:53'),(67,1,NULL,'919347909645','menu_book_appt',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:52:59','2026-02-28 18:22:59'),(68,1,NULL,'919347909645','appt_general',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:53:07','2026-02-28 18:23:07'),(69,1,NULL,'919347909645','slot_2',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:53:18','2026-02-28 18:23:18'),(70,1,NULL,'919347909645','appt_yes',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:53:24','2026-02-28 18:23:24'),(71,1,NULL,'919347909645','menu_my_appts',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:53:33','2026-02-28 18:23:33'),(72,1,NULL,'918686903927','main_menu',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:55:55','2026-02-28 18:25:55'),(73,1,NULL,'918686903927','menu_my_appts',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:56:01','2026-02-28 18:26:01'),(74,1,NULL,'918686903927','cancel_1',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:56:08','2026-02-28 18:26:08'),(75,1,NULL,'918686903927','confirm_cancel_yes',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:56:13','2026-02-28 18:26:13'),(76,1,NULL,'918686903927','main_menu',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:56:18','2026-02-28 18:26:18'),(77,1,NULL,'918686903927','menu_my_appts',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:56:24','2026-02-28 18:26:24'),(78,1,NULL,'918686903927','cancel_2',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:56:32','2026-02-28 18:26:32'),(79,1,NULL,'918686903927','confirm_cancel_yes',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:56:36','2026-02-28 18:26:36'),(80,1,NULL,'918686903927','main_menu',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:56:40','2026-02-28 18:26:40'),(81,1,NULL,'918686903927','menu_my_appts',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:56:45','2026-02-28 18:26:45'),(82,1,NULL,'918686903927','main_menu',NULL,'received','inbound',NULL,NULL,NULL,'2026-02-28 23:56:50','2026-02-28 18:26:50'),(83,1,NULL,'918686903927','menu_book_appt',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 00:06:14','2026-02-28 18:36:14'),(84,1,NULL,'916300802521','[Template: pharmatrix_welcome_menu]','wamid.HBgMOTE2MzAwODAyNTIxFQIAERgSMjIyRjlCRDVERjRGOUM5MUY0AA==','sent','outbound','2026-03-01 00:16:33',NULL,NULL,NULL,'2026-02-28 18:46:33'),(85,1,NULL,'916300802521','Hi',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 00:16:48','2026-02-28 18:46:48'),(86,1,NULL,'918686903927','Hi',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 00:23:20','2026-02-28 18:53:20'),(87,1,NULL,'918686903927','menu_book_appt',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 00:24:28','2026-02-28 18:54:28'),(88,1,NULL,'918686903927','Hi',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 01:39:11','2026-02-28 20:09:11'),(89,1,NULL,'918686903927','menu_book_appt',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 14:21:08','2026-03-01 08:51:08'),(90,1,NULL,'918686903927','appt_general',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 14:24:51','2026-03-01 08:54:51'),(91,1,NULL,'918686903927','slot_1',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 14:25:42','2026-03-01 08:55:42'),(92,1,NULL,'918686903927','appt_yes',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 14:26:30','2026-03-01 08:56:30'),(93,1,NULL,'918686903927','I want consultation today',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 14:27:01','2026-03-01 08:57:01'),(94,1,NULL,'918686903927','menu_my_appts',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 14:27:36','2026-03-01 08:57:36'),(95,1,NULL,'918686903927','main_menu',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 14:27:46','2026-03-01 08:57:46'),(96,1,NULL,'918686903927','menu_my_appts',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 14:27:54','2026-03-01 08:57:54'),(97,1,NULL,'918686903927','cancel_1',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 14:27:58','2026-03-01 08:57:58'),(98,1,NULL,'918686903927','confirm_cancel_yes',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-01 14:28:04','2026-03-01 08:58:04'),(99,1,NULL,'918686903927','Hi',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-15 14:39:24','2026-03-15 09:09:24'),(100,1,5,'918686903927','[Template: pharmatrix_welcome_menu]','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSMTdFNTc1NDQ4MkU0QzM3NjZEAA==','sent','outbound','2026-03-15 21:46:05',NULL,NULL,NULL,'2026-03-15 16:16:05'),(101,1,NULL,'918686903927','menu_lab_test',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-15 21:46:44','2026-03-15 16:16:44'),(102,1,NULL,'918686903927','menu_book_appt',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-15 21:47:00','2026-03-15 16:17:00'),(103,1,NULL,'918686903927','[Template: pharmatrix_welcome_menu]','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSRkUwRkQxQ0VGQzFCQjAwM0IzAA==','sent','outbound','2026-03-15 22:10:19',NULL,NULL,NULL,'2026-03-15 16:40:19'),(104,1,NULL,'918686903927','menu_book_appt',NULL,'received','inbound',NULL,NULL,NULL,'2026-03-15 22:10:49','2026-03-15 16:40:49'),(105,1,NULL,'918686903927','[Template: pharmatrix_welcome_menu]','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSMDQ0ODIyRDAzODQ3N0M2OTVGAA==','sent','outbound','2026-03-15 22:12:39',NULL,NULL,NULL,'2026-03-15 16:42:39'),(106,1,5,'918686903927','[Template: pharmatrix_welcome_menu]','wamid.HBgMOTE4Njg2OTAzOTI3FQIAERgSQzQyMjQwNDA2NEUyRjYzOUQ2AA==','sent','outbound','2026-03-22 01:41:15',NULL,NULL,NULL,'2026-03-21 20:11:15');
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
  `whatsapp_phone_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
INSERT INTO `tenants` VALUES (1,'VWMC','REAL ESTATE',489,5,'2026-02-12 10:59:53',NULL,NULL,NULL,NULL,'971897292671577'),(2,'VS Diet Concept','NUTRITIONIST',0,0,'2026-02-24 17:35:48',NULL,NULL,NULL,NULL,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (1,1,'credit','Test purchase — 500 credits (bypass mode)',NULL,NULL,500,499.00,'completed','2026-02-27 07:37:32','2026-02-27 07:37:32'),(2,1,'debit','Message sent to 919397817541 via template: pharmatrix_welcome_menu',NULL,NULL,-1,0.00,'completed','2026-02-27 09:25:14','2026-02-27 09:25:14'),(3,1,'debit','Message sent to 919849493543 via template: pharmatrix_welcome_menu',NULL,NULL,-1,0.00,'completed','2026-02-27 09:25:16','2026-02-27 09:25:16'),(4,1,'debit','Message sent to 918686903927 via template: pharmatrix_welcome_menu',NULL,NULL,-1,0.00,'completed','2026-02-27 09:25:18','2026-02-27 09:25:18'),(5,1,'debit','Message sent to 916300802521 via template: pharmatrix_welcome_menu',NULL,NULL,-1,0.00,'completed','2026-02-28 18:46:33','2026-02-28 18:46:33'),(6,1,'debit','Message sent to 918686903927 via template: pharmatrix_welcome_menu',NULL,NULL,-1,0.00,'completed','2026-03-15 16:40:19','2026-03-15 16:40:19'),(7,1,'debit','Message sent to 918686903927 via template: pharmatrix_welcome_menu',NULL,NULL,-1,0.00,'completed','2026-03-15 16:42:39','2026-03-15 16:42:39');
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,'VWMC','vwmc@gmail.com','$2b$10$W78CvLUW.BwMkSvASLOAseRPiholHjOlIEgi8WAs8z1Lgw4ZRIJoW','admin','active',NULL,'2026-02-23 06:25:09','2026-02-11 18:26:39'),(2,NULL,'Milarch Tech','nachiketh.desai@milarch.in','$2b$10$DvS7yXjN7dAGiw/E0pgtUu6w.GIxqrM.ngaT4ms9hziP8Oo.Yk9CG','admin','active',NULL,'2026-02-23 06:25:09','2026-02-15 05:10:51'),(3,NULL,'VS Diet Concept','nutrition@vsdiet.in','$2b$10$pV12ZycBq6QZq8Qdnd/ID.JoECNuQnnRc91xAbPEZfsb/uVNpoB/K','admin','active',NULL,'2026-02-24 17:33:19','2026-02-24 17:33:19');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_config`
--

DROP TABLE IF EXISTS `whatsapp_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `phone_number_id` varchar(100) NOT NULL,
  `business_account_id` varchar(100) NOT NULL,
  `access_token` text NOT NULL,
  `app_id` varchar(100) DEFAULT NULL,
  `app_secret` varchar(255) DEFAULT NULL,
  `verify_token` varchar(255) NOT NULL,
  `webhook_secret` varchar(255) DEFAULT NULL,
  `display_phone_number` varchar(20) DEFAULT NULL,
  `verified_name` varchar(100) DEFAULT NULL,
  `quality_rating` varchar(20) DEFAULT 'GREEN',
  `account_mode` varchar(20) DEFAULT 'LIVE',
  `api_version` varchar(10) DEFAULT 'v21.0',
  `is_active` tinyint(1) DEFAULT '1',
  `is_verified` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_id` (`tenant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_config`
--

LOCK TABLES `whatsapp_config` WRITE;
/*!40000 ALTER TABLE `whatsapp_config` DISABLE KEYS */;
INSERT INTO `whatsapp_config` VALUES (1,1,'971897292671577','2104603140286871','EAAWr2uBOLE4BQoA1tggpGzZBinX68cxaGZAqUEZCsqlhW4iZBcr2StXZBtGciQlS4NZCmotWzeWZCqYphfiffZBapMxHyuEwhXx08HK6eqph1MQx6GmqlOvv6ZB8d5Ckzb4wj5ifx9CTn94SXOFo4AyYcfodRSZCfdxK1aiatzfZAq6zlXH34Whb7hEwyFAIlXN9QZDZD',NULL,'0759c9a7353a39c0154e0e156c64b7e3','pharmatrix_webhook_verify_token_2026','pharmatrix_webhook_verify_token_2026','+91 70838 20068','Milarch Tech','GREEN','LIVE','v21.0',1,1,'2026-03-15 16:32:34','2026-03-15 16:33:35');
/*!40000 ALTER TABLE `whatsapp_config` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-16 13:14:29
