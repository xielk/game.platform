# 素材关系规范

关系类型：`uses_skill`、`uses_projectile`、`uses_vfx`、`uses_audio`、`drops_item`、`upgrades_to`、`summons_enemy`、`belongs_to_game`、`used_by_level`、`depends_on`、`variant_of`。

关系两端必须是 Asset 稳定业务 ID 对应的数据库记录，不从文件名推断。写入时禁止自引用和重复组合；删除/废弃前查询所有入边、关卡引用及固定版本。导出按关系图收集闭包并检查每个引用的发布版本与必需文件。

