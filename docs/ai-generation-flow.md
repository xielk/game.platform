# AI 生成流程

1. 选择游戏、关卡和素材类型，输入描述、数值、技能、动画、尺寸和候选数量。
2. 上传参考图并加载游戏 StyleProfile。
3. `AIProvider.generateDesignSpec` 生成结构化规格，用户确认后由 `generatePrompt` 形成最终 Prompt。
4. 确认后的任务进入 queued，执行器调用 `generateImage`，按需轮询 `getTaskStatus`。
5. 下载结果到 StorageProvider，记录模型、参数、seed、Prompt、参考图和结果文件。
6. 用户选择候选，创建或追加 AssetVersion，绑定游戏、关卡及关系，再审核发布。

第一版实现 OpenAI-compatible 图片接口和开发 Mock Provider。Provider 密钥只来自服务端环境变量。失败记录可读错误但屏蔽密钥，任务支持重试与取消。迁移 BullMQ 时保留 REST 和任务表语义。

