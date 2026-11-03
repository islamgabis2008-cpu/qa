-- ========================================================
-- DZ ORDER - MySQL Database Schema
-- Database: server_814
-- Host: 127.0.0.1 (Port 3306)
-- Compatible with phpMyAdmin and MySQL 5.7+ / 8.0+ / MariaDB
-- ========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- 1. USERS
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('CUSTOMER', 'RESTAURANT_OWNER', 'COURIER', 'ADMIN') NOT NULL,
  `full_name` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `language` VARCHAR(10) NOT NULL DEFAULT 'ar',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. CUSTOMER PROFILES
CREATE TABLE IF NOT EXISTS `customer_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `default_address_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. RESTAURANT OWNER PROFILES
CREATE TABLE IF NOT EXISTS `restaurant_owner_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `business_reg_number` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. COURIER PROFILES
CREATE TABLE IF NOT EXISTS `courier_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `vehicle_type` ENUM('MOTO', 'CAR', 'BICYCLE', 'VAN') NOT NULL DEFAULT 'MOTO',
  `vehicle_plate` VARCHAR(50) NULL,
  `license_number` VARCHAR(50) NULL,
  `is_online` TINYINT(1) NOT NULL DEFAULT 0,
  `is_approved` TINYINT(1) NOT NULL DEFAULT 0,
  `approval_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `admin_notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. RESTAURANT CATEGORIES
CREATE TABLE IF NOT EXISTS `restaurant_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name_ar` VARCHAR(100) NOT NULL,
  `name_fr` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `icon` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. RESTAURANT APPLICATIONS
CREATE TABLE IF NOT EXISTS `restaurant_applications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `owner_id` INT NOT NULL,
  `restaurant_name` VARCHAR(191) NOT NULL,
  `description_ar` TEXT NULL,
  `description_fr` TEXT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `address` TEXT NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `category_id` INT NOT NULL,
  `logo_url` TEXT NULL,
  `cover_url` TEXT NULL,
  `opening_hours` VARCHAR(100) NOT NULL DEFAULT '09:00 - 23:00',
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `rejection_reason` TEXT NULL,
  `admin_notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `restaurant_categories`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. RESTAURANTS
CREATE TABLE IF NOT EXISTS `restaurants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `owner_id` INT NOT NULL UNIQUE,
  `application_id` INT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description_ar` TEXT NULL,
  `description_fr` TEXT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `address` TEXT NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `category_id` INT NOT NULL,
  `logo_url` TEXT NULL,
  `cover_url` TEXT NULL,
  `opening_hours` VARCHAR(100) NOT NULL DEFAULT '09:00 - 23:00',
  `rating` DECIMAL(3, 1) NOT NULL DEFAULT 5.0,
  `review_count` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_delivering` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `restaurant_categories`(`id`),
  FOREIGN KEY (`application_id`) REFERENCES `restaurant_applications`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS `product_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name_ar` VARCHAR(100) NOT NULL,
  `name_fr` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `icon` VARCHAR(20) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. PRODUCTS
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `restaurant_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  `name_ar` VARCHAR(191) NOT NULL,
  `name_fr` VARCHAR(191) NOT NULL,
  `description_ar` TEXT NULL,
  `description_fr` TEXT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `image_url` TEXT NULL,
  `is_available` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. ADDRESSES
CREATE TABLE IF NOT EXISTS `addresses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NOT NULL,
  `street` VARCHAR(191) NOT NULL,
  `building` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. CARTS
CREATE TABLE IF NOT EXISTS `carts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `restaurant_id` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. CART ITEMS
CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cart_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `notes` TEXT NULL,
  UNIQUE KEY `uniq_cart_prod` (`cart_id`, `product_id`),
  FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. ORDERS
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(50) NOT NULL UNIQUE,
  `customer_id` INT NOT NULL,
  `restaurant_id` INT NOT NULL,
  `courier_id` INT NULL,
  `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'PREPARING', 'READY', 'SEARCHING_COURIER', 'COURIER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `subtotal` DECIMAL(10, 2) NOT NULL,
  `delivery_fee` DECIMAL(10, 2) NOT NULL DEFAULT 250.00,
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `payment_method` ENUM('COD') NOT NULL DEFAULT 'COD',
  `delivery_address` TEXT NOT NULL,
  `delivery_instructions` TEXT NULL,
  `rejection_reason` TEXT NULL,
  `cancellation_reason` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`),
  FOREIGN KEY (`courier_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. ORDER ITEMS
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NULL,
  `product_name_ar` VARCHAR(191) NOT NULL,
  `product_name_fr` VARCHAR(191) NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10, 2) NOT NULL,
  `total_price` DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. DELIVERIES
CREATE TABLE IF NOT EXISTS `deliveries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL UNIQUE,
  `courier_id` INT NULL,
  `restaurant_id` INT NOT NULL,
  `customer_id` INT NOT NULL,
  `pickup_address` TEXT NOT NULL,
  `delivery_address` TEXT NOT NULL,
  `delivery_fee` DECIMAL(10, 2) NOT NULL,
  `status` ENUM('AVAILABLE', 'ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'AVAILABLE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `pickup_at` TIMESTAMP NULL,
  `delivered_at` TIMESTAMP NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`courier_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`),
  FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. ORDER STATUS HISTORY
CREATE TABLE IF NOT EXISTS `order_status_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `previous_status` VARCHAR(50) NULL,
  `new_status` VARCHAR(50) NOT NULL,
  `changed_by_user_id` INT NULL,
  `notes` TEXT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`changed_by_user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title_ar` VARCHAR(191) NOT NULL,
  `title_fr` VARCHAR(191) NOT NULL,
  `message_ar` TEXT NOT NULL,
  `message_fr` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `reference_id` INT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. REVIEWS
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `restaurant_id` INT NOT NULL,
  `order_id` INT NOT NULL UNIQUE,
  `rating` INT NOT NULL,
  `comment` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. COMPLAINTS
CREATE TABLE IF NOT EXISTS `complaints` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `order_id` INT NULL,
  `subject` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `status` ENUM('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `admin_notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` TIMESTAMP NULL,
  FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS `platform_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT NOT NULL,
  `description` TEXT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. AUDIT LOGS
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(100) NOT NULL,
  `entity_id` INT NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- INITIAL PLATFORM DATA
INSERT INTO `platform_settings` (`key`, `value`, `description`) VALUES
('default_delivery_fee', '250', 'Frais de livraison de base en DZD'),
('min_order_amount', '400', 'Montant minimum de commande en DZD'),
('platform_commission_percent', '10', 'Commission de la plateforme DZ Order (%)'),
('currency', 'DZD', 'Devise par défaut: Dinar Algérien')
ON DUPLICATE KEY UPDATE `value`=VALUES(`value`);

-- STANDARD CATEGORIES
INSERT INTO `restaurant_categories` (`name_ar`, `name_fr`, `slug`, `icon`) VALUES
('مأكولات تقليدية جزائرية', 'Cuisine Traditionnelle Algérienne', 'traditional', '🍲'),
('مشاوي وفحم', 'Grillades & Barbecue', 'grill', '🥩'),
('بيتزا وفطائر', 'Pizzas & Galettes', 'pizza', '🍕'),
('برغر وساندويتش', 'Burgers & Sandwiches', 'burgers', '🍔'),
('حلويات جزائرية وعصرية', 'Pâtisseries & Desserts', 'desserts', '🍯'),
('مشروبات وعصائر', 'Boissons & Jus Frais', 'drinks', '🥤')
ON DUPLICATE KEY UPDATE `name_ar`=VALUES(`name_ar`);

INSERT INTO `product_categories` (`name_ar`, `name_fr`, `slug`, `icon`, `sort_order`) VALUES
('الأطباق الرئيسية التقليدية', 'Plats Principaux Traditionnels', 'traditional-dishes', '🍲', 1),
('المشاوي والسلطات', 'Grillades & Salades', 'grillades', '🥩', 2),
('البيتزا الجزائرية والإيطالية', 'Pizzas & Calzones', 'pizzas', '🍕', 3),
('البرغر والوجبات السريعة', 'Burgers & Fast Food', 'burgers-fastfood', '🍔', 4),
('المشروبات الغازية والعصائر', 'Boissons & Rafraîchissements', 'drinks-beverages', '🥤', 5),
('الحلويات الشرقية والجزائرية', 'Douceurs & Desserts', 'desserts-sweets', '🍰', 6)
ON DUPLICATE KEY UPDATE `name_ar`=VALUES(`name_ar`);

SET FOREIGN_KEY_CHECKS = 1;
