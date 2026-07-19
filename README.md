# 2D Game Asset Studio

面向 Phaser 3 项目的 2D 游戏素材生产与交付平台。它把游戏、关卡、素材类型、风格档案、Asset/AssetVersion、文件、AI 任务、引用关系和 ZIP 导出放在同一条可追溯工作流中。

## 技术架构

- Web：React 19、TypeScript、Vite、Ant Design、Zustand、Axios、PixiJS。
- API：Node.js、NestJS、Prisma、REST、Swagger、class-validator。
- 数据：MariaDB 10.11；生产仅执行 migration，不使用自动同步。
- 存储：本地 `StorageProvider`，接口可替换 MinIO、S3、OSS、COS。
- 任务：第一版数据库状态 + 进程内执行，接口预留 Redis/BullMQ。

项目结构见 [架构设计](docs/architecture.md)，数据模型见 [数据库设计](docs/database-design.md)。

## 环境变量

复制 `.env.example` 为 `.env`，填写数据库连接。`.env` 已被 Git 忽略。应用会在进程内安全组合 Prisma 连接 URL；连接失败仅记录错误码和权限提示，不打印密码。

可在 `.env` 追加以下服务配置：

```dotenv
ADMIN_TOKEN=请设置强管理员令牌
PORT=3000
PUBLIC_BASE_URL=http://localhost:3000
STORAGE_ROOT=./storage
AI_PROVIDER=mock
AI_API_BASE_URL=https://api.openai.com/v1
AI_API_KEY=
AI_IMAGE_MODEL=gpt-image-1
```

`AI_PROVIDER=mock` 用于验证完整异步流程；设置为 `openai-compatible` 后由后端调用兼容 `/images/generations` 的图片接口。API Key 不进入数据库、浏览器或日志。

## 本地启动

```bash
npm install
npm run prisma:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Web 开发地址为 `http://localhost:5173`，API 为 `http://localhost:3000/api`，Swagger 为 `http://localhost:3000/api/docs`。生产构建：

```bash
npm run build
npm start
```

如果远程数据库连接失败且现有账号只有 `'game-info'@'localhost'`，由 MariaDB 管理员确认后执行（替换密码与允许网段）：

```sql
CREATE USER IF NOT EXISTS 'game-info'@'应用服务器IP' IDENTIFIED BY '强密码';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON `game-info`.* TO 'game-info'@'应用服务器IP';
FLUSH PRIVILEGES;
```

程序不会自动创建或修改数据库用户权限。

## 使用流程

1. 创建游戏、关卡和 StyleProfile。
2. 在 AI 生产台输入描述，确认 Design Spec 和最终 Prompt。
3. 生成候选结果并登记为稳定 Asset ID；追加修改产生新 AssetVersion。
4. 上传文件、绑定关卡、配置资源关系，完成审核后发布版本。
5. 在导出中心选择游戏或关卡；完整性检查通过后下载 ZIP。

游戏导出请求：`POST /api/exports`，请求体 `{ "scopeType": "game", "gameId": "game_id" }`。关卡导出增加 `"scopeType":"level"` 和 `"levelId"`。ZIP 内含 Manifest、游戏/关卡引用、SHA-256、关系及 `phaser-loader.json`。

## 数据库命令

```bash
npm run db:migrate   # 开发环境创建新 migration
npm run db:deploy    # 生产环境应用已有 migration
npm run db:seed      # 写入 22 种基础素材类型
```

若 Prisma CLI 未从分离的 `DB_*` 变量构造连接，可仅在执行 CLI 的当前 shell 中临时提供 `DATABASE_URL`；不要提交该值。

## 地图扩展

模型位于 `prisma/schema.prisma` 的 `Map/MapVersion`，适配器契约位于 `apps/api/src/maps/map-editor.adapter.ts`，Web 入口为“地图工作区”的 PixiJS 预览。后续 Tiled、图层、路径与 Phaser 预览通过适配器接入，不把地图写死为背景 PNG。

## 文档

- [命名规范](docs/asset-naming-standard.md)
- [一致性规范](docs/asset-consistency-standard.md)
- [关系规范](docs/asset-relation-standard.md)
- [AI 流程](docs/ai-generation-flow.md)
- [导出格式](docs/export-format.md)
- [地图路线图](docs/map-editor-roadmap.md)
- [API](docs/api.md)
