# 地图编辑器路线图

第一阶段提供地图导航入口、Map/MapVersion 模型、map/tileset 资源类型、文件与关卡关系，以及 PixiJS 只读预览容器。`MapEditorAdapter` 负责 `importMap`、`exportMap`、`validateMap` 和 `toPreviewScene`，领域层不绑定 PNG 或特定编辑器。

后续阶段依次加入：背景与 Tileset 上传；Tiled JSON/TMJ 导入导出；tile/layer/object 编辑；路径、建塔点、出生点、终点、障碍和装饰；多路线与波次绑定；Phaser 预览；地图版本比较与发布；AI 地图生成。每个编辑保存为新 MapVersion，可引用固定 AssetVersion。

