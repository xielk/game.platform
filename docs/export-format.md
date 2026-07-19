# 导出格式

支持 `game` 与 `level` 两种范围。正式导出先解析指定游戏版本、关卡引用、素材固定版本或当前发布版本，再检查缺失版本、缺失文件和断裂关系；有错误则拒绝 ZIP。

ZIP 包含 `manifest.json`、`game.json`、`levels/*.json`、`maps/` 与按类型分组的 `assets/`。Manifest 使用业务 ID，包含 `schemaVersion`、gameId/gameVersion、exportedAt、assetId/version、文件相对路径、SHA-256、关系和关卡引用。另含 `phaser-loader.json`，可转换为 Phaser 3 `load.image/audio/atlas/tilemapTiledJSON` 调用。

接口：`POST /api/exports` 创建导出，`GET /api/exports/:id` 查询，`GET /api/exports/:id/download` 下载；请求传 `scopeType`、`gameId`、可选 `levelId/gameVersionId`。

