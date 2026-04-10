# MTO (无库存) ERP 管理系统

本项目是一个基于无库存按单生产 (Make-To-Order) 模式的轻量级 ERP 系统。涵盖从销售订单价格快照、发货单分批交付、到最终费用清单合并结算的完整业务流，并集成物理哈希防篡改的电子签章工作流。

## 技术栈选型
- **包管理工具**: pnpm (Monorepo 架构)
- **前端**: React + Vite + TypeScript (`apps/frontend`)
- **后端**: NestJS + TypeScript (`apps/backend`)
- **数据持久层**: PostgreSQL + Prisma (`@erp/database`)
- **共享类型库**: `@erp/shared-types`
- **对象存储**: MinIO (用于图纸与印章归档)

---

## 0. 环境要求
- Node.js 22.x
- pnpm 10.x
- Docker / Docker Compose (用于容器化部署)

---

## 1. 本地开发流程

### 1.1 拉取代码与安装依赖
项目采用 pnpm Workspace 架构，**严禁使用 npm 或 yarn**。

```bash
git pull origin main
pnpm install
```

### 1.2 生成 Prisma Client
Prisma Client 产物不提交到 Git，首次运行前必须生成：

```bash
pnpm --filter @erp/database exec prisma generate
```

### 1.3 构建共享包（后端依赖）
后端依赖 `@erp/shared-types` 和 `@erp/database` 的构建产物：

```bash
pnpm --filter @erp/shared-types build
pnpm --filter @erp/database build
```

### 1.4 配置数据库连接
在 `packages/database/.env` 创建环境变量：

```env
# 格式：postgresql://用户名:密码@主机:端口/数据库名?schema=public
DATABASE_URL="postgresql://postgres:你的密码@127.0.0.1:5433/mto_erp?schema=public"
```

说明：根目录 `pnpm dev` 会优先读取 `packages/database/.env`；若未配置，则回退到默认值 `postgresql://postgres:postgres@127.0.0.1:5433/mto_erp?schema=public`。

### 1.5 同步数据库结构
开发环境可直接使用：

```bash
pnpm --filter @erp/database exec prisma db push
```

### 1.6 启动前后端
在根目录执行一条命令即可同时启动前后端：

```bash
pnpm dev
```

- 前端默认地址: `http://localhost:5173`
- 后端默认地址: `http://localhost:3000`
- 若后端提示 `Can't reach database server at 127.0.0.1:5433`，请先启动数据库（例如执行 `docker compose up -d db`）。

## 2. Docker 部署流程（推荐）

仓库已内置以下文件：
- `docker-compose.yml`
- `docker/backend.Dockerfile`
- `docker/frontend.Dockerfile`
- `docker/nginx.conf`

### 2.1 一键启动

```bash
docker compose up -d --build
```

### 2.2 服务访问地址
- 前端（Nginx）: `http://localhost:8080`
- 后端 API: `http://localhost:3000`
- PostgreSQL: `localhost:5433`

### 2.3 查看状态与日志

```bash
docker compose ps
docker compose logs -f db
docker compose logs -f backend
docker compose logs -f frontend
```

### 2.4 停止与清理

```bash
# 停止容器（保留数据库卷）
docker compose down

# 停止并删除数据卷（会清空数据库）
docker compose down -v
```

### 2.5 数据库迁移说明
- `backend` 容器启动时会自动执行：`prisma migrate deploy`
- 如果你修改了 Prisma Schema 并新增 migration，重新 `docker compose up -d --build` 即可生效

### 2.6 常见问题
1. `Cannot connect to the Docker daemon`
   Docker Desktop / Docker Engine 未启动。
2. 端口冲突 (`8080` / `3000` / `5433`)
   修改 `docker-compose.yml` 的 `ports` 映射后重启。
3. 首次构建较慢
   属于正常现象，后续会利用 Docker 层缓存加速。
4. 文档盖章上传失败
   当前仅支持上传 `PDF`，并且单文件大小不能超过 10MB。

---

# MTO-ERP 系统 API 接口文档

## 全局规范
* **基础路径**: `http://localhost:3000`
* **响应结构**: 成功均返回 `{ "code": 200, "message": "...", "data": {...} }`

---

## 1. 零件与字典模块 (Parts)

| 接口路径                  | 请求方式 | 状态   | 功能说明                              |
| :------------------------ | :------- | :----- | :------------------------------------ |
| `/api/parts`              | POST     | 已完成 | 录入新零件，后端自动生成 `partNumber` |
| `/api/parts`              | GET      | 已完成 | 分页查询零件列表                      |
| `/api/parts/:id`          | GET      | 已完成 | 获取单一零件详情及其关联图纸          |
| `/api/parts/:id/drawings` | POST     | 已完成 | 上传图纸                              |

**POST `/api/parts` (新增零件) 请求参数:**
| 字段名         | 类型   | 必填 | 默认值 | 详细说明                                 |
| :------------- | :----- | :--- | :----- | :--------------------------------------- |
| `name`         | String | 是   | -      | 零件业务名称                             |
| `material`     | String | 是   | -      | 零件物理材质 (如: 304不锈钢)             |
| `spec`         | String | 否   | null   | 规格或型号说明                           |
| `commonPrices` | Object | 是   | `{}`   | 常用价格配置字典 (如: `{"标准价": 450}`) |

---

## 2. 订单管理模块 (Orders)

| 接口路径                      | 请求方式 | 状态   | 功能说明                   |
| :---------------------------- | :------- | :----- | :------------------------- |
| `/api/orders`                 | POST     | 已完成 | 创建订单，锁定交易明细快照 |
| `/api/orders`                 | GET      | 已完成 | 分页查询订单列表           |
| `/api/orders/:id`             | GET      | 已完成 | 获取订单详情及发货进度     |
| `/api/orders/:id/close-short` | PATCH    | 已完成 | 异常流转：触发订单短交结案 |

**POST `/api/orders` (创建订单) 请求参数:**
| 字段名               | 类型   | 必填 | 默认值 | 详细说明                   |
| :------------------- | :----- | :--- | :----- | :------------------------- |
| `customerName`       | String | 是   | -      | 交易客户公司名称           |
| `items`              | Array  | 是   | -      | 订单包含的零件明细列表     |
| `items[].partId`     | Number | 是   | -      | 关联的底层零件 ID          |
| `items[].orderedQty` | Number | 是   | -      | 客户合同要求的初始采购数量 |

**PATCH `/api/orders/:id/close-short` (短交结案) 请求参数:**
| 字段名   | 类型   | 必填 | 默认值 | 详细说明                            |
| :------- | :----- | :--- | :----- | :---------------------------------- |
| `reason` | String | 否   | null   | 短交的具体原因备注 (如: "报废不补") |

---

## 3. 发货管理模块 (Deliveries)

| 接口路径          | 请求方式 | 状态   | 功能说明                           |
| :---------------- | :------- | :----- | :--------------------------------- |
| `/api/deliveries` | POST     | 已完成 | 提交分批发货单，内置防超发事务校验 |
| `/api/deliveries` | GET      | 已完成 | 分页查询物流出库发货记录           |

**POST `/api/deliveries` (提交发货) 请求参数:**
| 字段名                | 类型   | 必填 | 默认值 | 详细说明                            |
| :-------------------- | :----- | :--- | :----- | :---------------------------------- |
| `orderId`             | Number | 是   | -      | 本次发货关联的原始订单 ID           |
| `remark`              | String | 否   | null   | 整批发货的物流备注                  |
| `items`               | Array  | 是   | -      | 实际出库的发货明细列表              |
| `items[].orderItemId` | Number | 是   | -      | 精确对应到订单中的具体明细行 ID     |
| `items[].quantity`    | Number | 是   | -      | 本次实际打包发货的数量              |
| `items[].remark`      | String | 否   | null   | 行项目异常备注 (如: "划痕报废少发") |

---

## 4. 财务对账模块 (Billing)

| 接口路径                  | 请求方式 | 状态   | 功能说明                                 |
| :------------------------ | :------- | :----- | :--------------------------------------- |
| `/api/billing`            | POST     | 已完成 | 基于发货明细提取历史单价，合并生成对账单 |
| `/api/billing`            | GET      | 已完成 | 分页查询对账单列表                       |
| `/api/billing/:id/status` | PATCH    | 已完成 | 扭转对账单状态 (如: 变更为已结清)        |

**POST `/api/billing` (生成对账单) 请求参数:**
| 字段名            | 类型   | 必填 | 默认值 | 详细说明                           |
| :---------------- | :----- | :--- | :----- | :--------------------------------- |
| `customerName`    | String | 是   | -      | 结算方客户名称                     |
| `deliveryItemIds` | Array  | 是   | -      | 需要合并结算的实际发货明细 ID 数组 |
| `extraItems`      | Array  | 否   | `[]`   | 额外手动计费项 (如运费)            |

---

## 5. 印章与归档模块 (Documents & Seals)

| 接口路径              | 请求方式 | 状态   | 功能说明                           |
| :-------------------- | :------- | :----- | :--------------------------------- |
| `/api/seals`          | POST     | 待开发 | 上传并注册电子印章图片             |
| `/api/documents/seal` | POST     | 待开发 | 对指定单据执行盖章，生成防篡改 PDF |

**POST `/api/documents/seal` (执行盖章) 请求参数:**
| 字段名       | 类型   | 必填 | 默认值 | 详细说明                            |
| :----------- | :----- | :--- | :----- | :---------------------------------- |
| `targetType` | String | 是   | -      | 单据类型 (ORDER, DELIVERY, BILLING) |
| `targetId`   | Number | 是   | -      | 目标单据的主键 ID                   |
| `sealId`     | Number | 是   | -      | 所调用的印章 ID                     |
| `userId`     | Number | 是   | -      | 执行操作的用户 ID                   |
