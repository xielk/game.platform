# 素材命名规范

## 资源 ID

资源 ID 全小写，只允许英文、数字、下划线，不含中文、空格或连字符。发布后永久稳定；显示名称变化、文件变化或版本变化均不修改 ID，也不根据新名称覆盖已发布 ID。

通用格式为 `{object_type}_{theme_or_faction}_{object_name}`，例如 `enemy_forest_goblin`、`mini_boss_forest_goblin_chief`、`boss_forest_goblin_king`、`tower_forest_arrow`、`skill_forest_dash`、`projectile_forest_arrow`、`vfx_forest_arrow_hit`、`currency_gold_coin_small`、`item_forest_goblin_token`、`map_forest_level_001`、`tileset_forest_basic`。

对象专属资源格式为 `{owner_asset_id}_{resource_type}_{name}`，例如 `enemy_forest_goblin_anim_walk`、`enemy_forest_goblin_skill_dash`、`tower_forest_arrow_lv01_projectile_arrow`。只有该角色使用时归属角色 ID；多个角色可复用时使用 `skill_common_dash`、`vfx_common_hit_physical`、`projectile_common_arrow` 等独立通用 ID，通过 `AssetRelation` 引用，禁止复制相同特效或子弹。

## 文件名与版本

业务 ID 与物理路径分开保存。推荐 `{asset_id}_{version}_{purpose}.{extension}`，如 `enemy_forest_goblin_v001_atlas.png`、`enemy_forest_goblin_v001_atlas.json`、`enemy_forest_goblin_v001_preview.png`。版本统一 `v001`、`v002`、`v003`，由 AssetVersion 管理。

禁止使用 `final`、`final2`、`new`、`latest`、`test`、`修改版` 等不可追踪命名。

