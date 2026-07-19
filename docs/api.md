# REST API

服务默认位于 `http://localhost:3000/api`，Swagger UI 为 `/api/docs`。设置 `ADMIN_TOKEN` 后，除健康检查、登录和文件读取外的请求需要 `x-admin-token`。

## 系统与登录

- `GET /health`：数据库与服务健康。
- `POST /auth/login`：简单管理员令牌验证。

## 核心资源

- `GET/POST /games`，`PUT/DELETE /games/:id`
- `GET/POST /levels`，`PUT/DELETE /levels/:id`
- `GET/POST /asset-types`，`PUT/DELETE /asset-types/:id`
- `GET/POST /styles`，`PUT/DELETE /styles/:id`
- `GET/POST /assets`，`GET/PUT/DELETE /assets/:assetId`
- `POST /assets/:assetId/versions`
- `POST /assets/:assetId/versions/:version/publish`
- `GET/POST /relations`，`DELETE /relations/:id`
- `POST/DELETE /level-assets/:id`
- `GET /maps`

## 文件和 AI

- `POST /files/upload?assetId=&version=&purpose=`：multipart 字段 `file`；不带 assetId 时作为参考文件上传。
- `POST /generation/draft`：组合 StyleProfile、Design Spec 与最终 Prompt。
- `POST /generation/tasks/:taskId/confirm|retry|cancel`
- `GET /generation/tasks` 与 `GET /generation/tasks/:taskId`
- `POST /generation/results/:resultId/register`：登记候选为 AssetVersion。

## 导出

- `POST /exports`：`{scopeType:"game"|"level", gameId, levelId?}`。
- `GET /exports`、`GET /exports/:exportId`、`GET /exports/:exportId/download`。

请求/响应 schema、状态码及在线试调以 Swagger 为准。
