-- EZEKIZO CryptoMine — Database Schema
-- Run this on your MySQL database (PlanetScale, Railway, etc.)

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `blockchain_stats` (
  `id` int NOT NULL DEFAULT 1,
  `total_supply` decimal(20,8) DEFAULT '0.00000000',
  `difficulty` int DEFAULT 4,
  `block_reward` decimal(20,8) DEFAULT '50.00000000',
  `total_blocks` int DEFAULT 0,
  `total_transactions` int DEFAULT 0,
  `last_block_time` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `blockchain_stats` (`id`, `total_supply`, `difficulty`, `block_reward`, `total_blocks`, `total_transactions`)
VALUES (1, 0, 4, 50, 0, 0);

CREATE TABLE IF NOT EXISTS `blocks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `block_index` int NOT NULL,
  `hash` varchar(64) NOT NULL,
  `previous_hash` varchar(64) NOT NULL,
  `merkle_root` varchar(64) DEFAULT '0',
  `nonce` bigint UNSIGNED DEFAULT 0,
  `difficulty` int DEFAULT 4,
  `miner_address` varchar(64) DEFAULT 'GENESIS',
  `reward` decimal(20,8) DEFAULT '0.00000000',
  `tx_count` int DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `block_index` (`block_index`),
  KEY `idx_hash` (`hash`),
  KEY `idx_block_index` (`block_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Genesis block
INSERT IGNORE INTO `blocks` (`block_index`, `hash`, `previous_hash`, `merkle_root`, `nonce`, `difficulty`, `miner_address`, `reward`, `tx_count`)
VALUES (0, '0000000000000000000000000000000000000000000000000000000000000000',
           '0000000000000000000000000000000000000000000000000000000000000000',
           '0000000000000000000000000000000000000000000000000000000000000000',
        0, 4, 'GENESIS', 0, 0);

CREATE TABLE IF NOT EXISTS `wallets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `address` varchar(64) NOT NULL,
  `public_key` text NOT NULL,
  `label` varchar(100) DEFAULT 'My Wallet',
  `balance` decimal(20,8) DEFAULT '0.00000000',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `address` (`address`),
  KEY `idx_address` (`address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `txid` varchar(64) NOT NULL,
  `from_address` varchar(64) DEFAULT 'COINBASE',
  `to_address` varchar(64) NOT NULL,
  `amount` decimal(20,8) NOT NULL,
  `fee` decimal(20,8) DEFAULT '0.00000000',
  `block_id` int DEFAULT NULL,
  `status` enum('pending','confirmed','failed') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `txid` (`txid`),
  KEY `idx_txid` (`txid`),
  KEY `idx_from` (`from_address`),
  KEY `idx_to` (`to_address`),
  KEY `idx_status` (`status`),
  KEY `block_id` (`block_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mempool` (
  `id` int NOT NULL AUTO_INCREMENT,
  `txid` varchar(64) NOT NULL,
  `from_address` varchar(64) NOT NULL,
  `to_address` varchar(64) NOT NULL,
  `amount` decimal(20,8) NOT NULL,
  `fee` decimal(20,8) DEFAULT '0.00100000',
  `data` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `txid` (`txid`),
  KEY `idx_fee` (`fee`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mining_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `miner_address` varchar(64) NOT NULL,
  `block_id` int DEFAULT NULL,
  `hashes_computed` bigint DEFAULT 0,
  `duration_ms` int DEFAULT 0,
  `hashrate` decimal(20,2) DEFAULT '0.00',
  `success` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `block_id` (`block_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
