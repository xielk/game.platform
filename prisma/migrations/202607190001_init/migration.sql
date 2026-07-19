-- CreateTable
CREATE TABLE `games` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `game_id` VARCHAR(100) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'draft',
    `current_version_id` BIGINT UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `games_game_id_key`(`game_id`),
    INDEX `games_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `game_versions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `game_id` BIGINT UNSIGNED NOT NULL,
    `version` VARCHAR(32) NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'draft',
    `config` JSON NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `game_versions_status_idx`(`status`),
    UNIQUE INDEX `game_versions_game_id_version_key`(`game_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `levels` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `level_id` VARCHAR(120) NOT NULL,
    `game_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(24) NOT NULL DEFAULT 'draft',
    `config` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `levels_level_id_key`(`level_id`),
    INDEX `levels_game_id_status_sort_order_idx`(`game_id`, `status`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_types` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `type_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `category` VARCHAR(64) NULL,
    `allowed_mime_types` JSON NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `asset_types_type_id_key`(`type_id`),
    INDEX `asset_types_category_is_enabled_idx`(`category`, `is_enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `asset_id` VARCHAR(180) NOT NULL,
    `game_id` BIGINT UNSIGNED NOT NULL,
    `asset_type_id` BIGINT UNSIGNED NOT NULL,
    `display_name` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'draft',
    `tags` JSON NULL,
    `current_version_id` BIGINT UNSIGNED NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `assets_asset_id_key`(`asset_id`),
    INDEX `assets_game_id_asset_type_id_status_idx`(`game_id`, `asset_type_id`, `status`),
    INDEX `assets_display_name_idx`(`display_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_versions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `asset_id` BIGINT UNSIGNED NOT NULL,
    `version_number` INTEGER NOT NULL,
    `parent_version_id` BIGINT UNSIGNED NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'draft',
    `design_spec` JSON NULL,
    `prompt` LONGTEXT NULL,
    `negative_prompt` TEXT NULL,
    `style_profile_snapshot` JSON NULL,
    `generation_metadata` JSON NULL,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `asset_versions_status_created_at_idx`(`status`, `created_at`),
    UNIQUE INDEX `asset_versions_asset_id_version_number_key`(`asset_id`, `version_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_files` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `version_id` BIGINT UNSIGNED NULL,
    `purpose` VARCHAR(40) NOT NULL,
    `provider` VARCHAR(32) NOT NULL DEFAULT 'local',
    `storage_key` VARCHAR(500) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(120) NOT NULL,
    `size_bytes` BIGINT UNSIGNED NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `public_path` VARCHAR(600) NOT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `asset_files_storage_key_key`(`storage_key`),
    INDEX `asset_files_version_id_purpose_idx`(`version_id`, `purpose`),
    INDEX `asset_files_sha256_idx`(`sha256`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `level_assets` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `level_id` BIGINT UNSIGNED NOT NULL,
    `asset_id` BIGINT UNSIGNED NOT NULL,
    `asset_version_id` BIGINT UNSIGNED NULL,
    `usage` VARCHAR(64) NOT NULL DEFAULT 'default',
    `config` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `level_assets_asset_id_idx`(`asset_id`),
    UNIQUE INDEX `level_assets_level_id_asset_id_usage_key`(`level_id`, `asset_id`, `usage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_relations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `source_asset_id` BIGINT UNSIGNED NOT NULL,
    `target_asset_id` BIGINT UNSIGNED NOT NULL,
    `relation_type` VARCHAR(64) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `asset_relations_target_asset_id_relation_type_idx`(`target_asset_id`, `relation_type`),
    UNIQUE INDEX `asset_relations_source_asset_id_target_asset_id_relation_typ_key`(`source_asset_id`, `target_asset_id`, `relation_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `style_profiles` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `style_id` VARCHAR(120) NOT NULL,
    `style_name` VARCHAR(120) NOT NULL,
    `game_id` BIGINT UNSIGNED NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `camera_angle` VARCHAR(120) NULL,
    `perspective` VARCHAR(120) NULL,
    `art_style` VARCHAR(180) NULL,
    `outline_style` VARCHAR(180) NULL,
    `color_palette` JSON NULL,
    `lighting_direction` VARCHAR(120) NULL,
    `shadow_style` VARCHAR(180) NULL,
    `background_requirement` VARCHAR(180) NULL,
    `transparency_requirement` VARCHAR(180) NULL,
    `character_scale` VARCHAR(120) NULL,
    `tower_scale` VARCHAR(120) NULL,
    `frame_canvas_size` VARCHAR(64) NULL,
    `tile_size` INTEGER NULL,
    `animation_fps_default` INTEGER NULL,
    `direction_count` INTEGER NULL,
    `prompt_prefix` TEXT NULL,
    `negative_prompt` TEXT NULL,
    `reference_images` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `style_profiles_style_id_key`(`style_id`),
    INDEX `style_profiles_game_id_is_active_idx`(`game_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prompt_templates` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `template_id` VARCHAR(120) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `asset_type_id` BIGINT UNSIGNED NULL,
    `template` LONGTEXT NOT NULL,
    `variables` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `prompt_templates_template_id_key`(`template_id`),
    INDEX `prompt_templates_asset_type_id_is_active_idx`(`asset_type_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `generation_tasks` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `task_id` VARCHAR(120) NOT NULL,
    `game_id` BIGINT UNSIGNED NOT NULL,
    `level_id` BIGINT UNSIGNED NULL,
    `asset_type_id` BIGINT UNSIGNED NOT NULL,
    `asset_id` BIGINT UNSIGNED NULL,
    `style_profile_id` BIGINT UNSIGNED NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'draft',
    `provider` VARCHAR(64) NOT NULL,
    `model` VARCHAR(120) NULL,
    `input` JSON NOT NULL,
    `design_spec` JSON NULL,
    `prompt` LONGTEXT NULL,
    `negative_prompt` TEXT NULL,
    `model_params` JSON NULL,
    `reference_file_ids` JSON NULL,
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 3,
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `generation_tasks_task_id_key`(`task_id`),
    INDEX `generation_tasks_status_created_at_idx`(`status`, `created_at`),
    INDEX `generation_tasks_game_id_asset_type_id_idx`(`game_id`, `asset_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `generation_results` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `result_id` VARCHAR(120) NOT NULL,
    `task_id` BIGINT UNSIGNED NOT NULL,
    `file_id` BIGINT UNSIGNED NULL,
    `asset_version_id` BIGINT UNSIGNED NULL,
    `provider_result_id` VARCHAR(180) NULL,
    `seed` VARCHAR(120) NULL,
    `metadata` JSON NULL,
    `selected` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `generation_results_result_id_key`(`result_id`),
    INDEX `generation_results_task_id_selected_idx`(`task_id`, `selected`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `export_tasks` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `export_id` VARCHAR(120) NOT NULL,
    `scope_type` VARCHAR(24) NOT NULL,
    `game_id` BIGINT UNSIGNED NOT NULL,
    `level_id` BIGINT UNSIGNED NULL,
    `game_version_id` BIGINT UNSIGNED NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'queued',
    `schema_version` VARCHAR(24) NOT NULL DEFAULT '1.0',
    `options` JSON NULL,
    `integrity_report` JSON NULL,
    `storage_key` VARCHAR(500) NULL,
    `sha256` CHAR(64) NULL,
    `error_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `finished_at` DATETIME(3) NULL,

    UNIQUE INDEX `export_tasks_export_id_key`(`export_id`),
    INDEX `export_tasks_status_created_at_idx`(`status`, `created_at`),
    INDEX `export_tasks_game_id_level_id_idx`(`game_id`, `level_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maps` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `map_id` VARCHAR(160) NOT NULL,
    `game_id` BIGINT UNSIGNED NOT NULL,
    `level_id` BIGINT UNSIGNED NULL,
    `name` VARCHAR(160) NOT NULL,
    `format` VARCHAR(40) NOT NULL DEFAULT 'tiled_json',
    `current_version_id` BIGINT UNSIGNED NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `maps_map_id_key`(`map_id`),
    INDEX `maps_game_id_level_id_status_idx`(`game_id`, `level_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `map_versions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `map_id` BIGINT UNSIGNED NOT NULL,
    `version_number` INTEGER NOT NULL,
    `parent_version_id` BIGINT UNSIGNED NULL,
    `format` VARCHAR(40) NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `tile_width` INTEGER NULL,
    `tile_height` INTEGER NULL,
    `layers` JSON NULL,
    `objects` JSON NULL,
    `file_refs` JSON NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `map_versions_map_id_version_number_key`(`map_id`, `version_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `game_versions` ADD CONSTRAINT `game_versions_game_id_fkey` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `levels` ADD CONSTRAINT `levels_game_id_fkey` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_game_id_fkey` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assets` ADD CONSTRAINT `assets_asset_type_id_fkey` FOREIGN KEY (`asset_type_id`) REFERENCES `asset_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_versions` ADD CONSTRAINT `asset_versions_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_versions` ADD CONSTRAINT `asset_versions_parent_version_id_fkey` FOREIGN KEY (`parent_version_id`) REFERENCES `asset_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_files` ADD CONSTRAINT `asset_files_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `asset_versions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `level_assets` ADD CONSTRAINT `level_assets_level_id_fkey` FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `level_assets` ADD CONSTRAINT `level_assets_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `level_assets` ADD CONSTRAINT `level_assets_asset_version_id_fkey` FOREIGN KEY (`asset_version_id`) REFERENCES `asset_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_relations` ADD CONSTRAINT `asset_relations_source_asset_id_fkey` FOREIGN KEY (`source_asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_relations` ADD CONSTRAINT `asset_relations_target_asset_id_fkey` FOREIGN KEY (`target_asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `style_profiles` ADD CONSTRAINT `style_profiles_game_id_fkey` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prompt_templates` ADD CONSTRAINT `prompt_templates_asset_type_id_fkey` FOREIGN KEY (`asset_type_id`) REFERENCES `asset_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generation_tasks` ADD CONSTRAINT `generation_tasks_game_id_fkey` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generation_tasks` ADD CONSTRAINT `generation_tasks_level_id_fkey` FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generation_tasks` ADD CONSTRAINT `generation_tasks_asset_type_id_fkey` FOREIGN KEY (`asset_type_id`) REFERENCES `asset_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generation_tasks` ADD CONSTRAINT `generation_tasks_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generation_tasks` ADD CONSTRAINT `generation_tasks_style_profile_id_fkey` FOREIGN KEY (`style_profile_id`) REFERENCES `style_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generation_results` ADD CONSTRAINT `generation_results_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `generation_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generation_results` ADD CONSTRAINT `generation_results_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `asset_files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `generation_results` ADD CONSTRAINT `generation_results_asset_version_id_fkey` FOREIGN KEY (`asset_version_id`) REFERENCES `asset_versions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_tasks` ADD CONSTRAINT `export_tasks_game_id_fkey` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_tasks` ADD CONSTRAINT `export_tasks_level_id_fkey` FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maps` ADD CONSTRAINT `maps_game_id_fkey` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maps` ADD CONSTRAINT `maps_level_id_fkey` FOREIGN KEY (`level_id`) REFERENCES `levels`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `map_versions` ADD CONSTRAINT `map_versions_map_id_fkey` FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `map_versions` ADD CONSTRAINT `map_versions_parent_version_id_fkey` FOREIGN KEY (`parent_version_id`) REFERENCES `map_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
