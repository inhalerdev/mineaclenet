-- noinspection SqlNoDataSourceInspectionForFile

CREATE TABLE IF NOT EXISTS home_sections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  section_key VARCHAR(64) NOT NULL,
  image_url VARCHAR(512) DEFAULT NULL,
  background_image_url VARCHAR(512) DEFAULT NULL,
  link_url VARCHAR(512) DEFAULT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY home_sections_section_key_unique (section_key)
);

CREATE TABLE IF NOT EXISTS home_feature_tiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tile_key VARCHAR(64) NOT NULL,
  link_url VARCHAR(512) DEFAULT '#',
  image_url VARCHAR(512) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY home_feature_tiles_tile_key_unique (tile_key),
  KEY home_feature_tiles_sort_order_index (sort_order)
);

CREATE TABLE IF NOT EXISTS home_announcements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  announcement_key VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL,
  eyebrow VARCHAR(48) DEFAULT 'Update',
  body VARCHAR(420) NOT NULL,
  image_url VARCHAR(512) DEFAULT NULL,
  content TEXT NULL,
  link_url VARCHAR(512) DEFAULT '#',
  sort_order INT NOT NULL DEFAULT 0,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY home_announcements_key_unique (announcement_key),
  KEY home_announcements_sort_order_index (sort_order)
);

CREATE TABLE IF NOT EXISTS home_world_stats (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  world_key VARCHAR(64) NOT NULL,
  players_online INT UNSIGNED NOT NULL DEFAULT 0,
  max_players INT UNSIGNED NOT NULL DEFAULT 0,
  image_url VARCHAR(512) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY home_world_stats_world_key_unique (world_key),
  KEY home_world_stats_sort_order_index (sort_order)
);

CREATE TABLE IF NOT EXISTS home_player_summary (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(32) DEFAULT NULL,
  uuid CHAR(36) DEFAULT NULL,
  skin_url VARCHAR(512) DEFAULT NULL,
  players_online INT UNSIGNED NOT NULL DEFAULT 0,
  max_players INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY home_player_summary_updated_at_index (updated_at)
);

CREATE TABLE IF NOT EXISTS home_social_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  platform_key VARCHAR(64) NOT NULL,
  url VARCHAR(512) DEFAULT '#',
  sort_order INT NOT NULL DEFAULT 0,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY home_social_links_platform_key_unique (platform_key),
  KEY home_social_links_sort_order_index (sort_order)
);

INSERT INTO home_sections (section_key, image_url, background_image_url, link_url)
VALUES
  ('hero', NULL, '/assets/brand/hero-mov.m4v', '#'),
  ('community', NULL, NULL, NULL),
  ('footer', NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE section_key = VALUES(section_key);

INSERT INTO home_feature_tiles (tile_key, link_url, image_url, sort_order)
VALUES
  ('store', '#', NULL, 10),
  ('stats', '#', NULL, 20),
  ('vote', '#', NULL, 30),
  ('staff', '#', NULL, 40)
ON DUPLICATE KEY UPDATE tile_key = VALUES(tile_key);

INSERT INTO home_world_stats (world_key, players_online, max_players, image_url, sort_order)
VALUES
  ('overworld', 0, 0, NULL, 10),
  ('nether', 0, 0, NULL, 20),
  ('end', 0, 0, NULL, 30)
ON DUPLICATE KEY UPDATE world_key = VALUES(world_key);

INSERT INTO home_player_summary (username, uuid, skin_url, players_online, max_players)
VALUES (NULL, NULL, NULL, 0, 0);

INSERT INTO home_social_links (platform_key, url, sort_order)
VALUES
  ('discord', '#', 10),
  ('x', '#', 20),
  ('youtube', '#', 30),
  ('tiktok', '#', 40)
ON DUPLICATE KEY UPDATE platform_key = VALUES(platform_key);
