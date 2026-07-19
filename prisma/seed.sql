SET NAMES utf8mb4;

INSERT INTO asset_types (type_id,name,category,allowed_mime_types,is_enabled,created_at,updated_at) VALUES
('enemy','敌人','character','["image/png","image/webp","application/json"]',1,NOW(3),NOW(3)),
('mini_boss','小型 Boss','character','["image/png","image/webp","application/json"]',1,NOW(3),NOW(3)),
('boss','Boss','character','["image/png","image/webp","application/json"]',1,NOW(3),NOW(3)),
('tower','防御塔','character','["image/png","image/webp","application/json"]',1,NOW(3),NOW(3)),
('hero','英雄','character','["image/png","image/webp","application/json"]',1,NOW(3),NOW(3)),
('npc','NPC','character','["image/png","image/webp","application/json"]',1,NOW(3),NOW(3)),
('skill','技能','combat','["image/png","image/webp","application/json"]',1,NOW(3),NOW(3)),
('projectile','子弹','combat','["image/png","image/webp","application/json"]',1,NOW(3),NOW(3)),
('vfx','特效','combat','["image/png","image/webp","application/json"]',1,NOW(3),NOW(3)),
('item','道具','economy','["image/png","image/webp"]',1,NOW(3),NOW(3)),
('currency','货币','economy','["image/png","image/webp"]',1,NOW(3),NOW(3)),
('card','卡片','ui','["image/png","image/webp"]',1,NOW(3),NOW(3)),
('ui','界面','ui','["image/png","image/webp","application/json"]',1,NOW(3),NOW(3)),
('icon','图标','ui','["image/png","image/webp"]',1,NOW(3),NOW(3)),
('audio','音效','audio','["audio/mpeg","audio/ogg"]',1,NOW(3),NOW(3)),
('music','音乐','audio','["audio/mpeg","audio/ogg"]',1,NOW(3),NOW(3)),
('tileset','图块集','map','["image/png","image/webp","application/json"]',1,NOW(3),NOW(3)),
('map','地图','map','["image/png","application/json"]',1,NOW(3),NOW(3)),
('background','背景','environment','["image/png","image/webp"]',1,NOW(3),NOW(3)),
('decoration','装饰物','environment','["image/png","image/webp"]',1,NOW(3),NOW(3)),
('building','建筑','environment','["image/png","image/webp"]',1,NOW(3),NOW(3)),
('obstacle','障碍物','environment','["image/png","image/webp"]',1,NOW(3),NOW(3))
ON DUPLICATE KEY UPDATE name=VALUES(name),category=VALUES(category),allowed_mime_types=VALUES(allowed_mime_types),is_enabled=1,updated_at=NOW(3);
