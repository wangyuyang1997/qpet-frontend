# Q宠乐斗 v5.0 Frontend

为 [duanwuqiufenmao.top](https://duanwuqiufenmao.top) 的 Q宠乐斗游戏自动化系统提供可视化管理面板。支持多账号管理、实时状态监控、游戏数据可视化、AI 智能助手。

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | React 18 + TypeScript |
| UI | Ant Design Pro (Ant Design 5) |
| 构建 | Vite |
| 状态管理 | zustand |
| 图表 | ECharts (echarts-for-react) |
| 路由 | React Router 6 |
| 部署 | Nginx + Docker |

## 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录 | 用户登录 |
| `/overview/:accountId` | **概览** | 角色概览 + 本周趋势 + 今日进度 |
| `/accounts` | 角色管理 | 账号列表/添加/删除 |
| `/accounts/:id` | 角色详情 | 账号详情信息 |
| `/config/:accountId` | **自动化配置** | 每个功能的独立开关 |
| `/logs` | 运行日志 | 实时操作日志流 |
| `/ai-chat` | AI 助手 | 基于 DeepSeek 的对话咨询 |
| `/farm/:accountId` | **农场** | 13 块地状态面板 |
| `/museum/:accountId` | 博物馆 | 藏品收集进度 |
| `/battle/:accountId` | 战斗 | NPC/好友对战状态 |
| `/class/:accountId` | 职业 | 技能树/属性分配 |
| `/marriage/:accountId` | **婚姻** | 送花/亲密度管理 |
| `/inventory/:accountId` | **背包** | 道具/鲜花库存 |
| `/gang` | 帮派 | 帮派状态/BOSS |
| `/dungeon` | 副本管理 | 秘境/远征入口 |
| `/auction` | 拍卖行 | 装备市场数据 |
| `/strategies` | 策略管理 | 上号策略配置 |
| `/admin` | 系统管理 | 用户权限管理 |

## 项目结构

```
src/
├── main.tsx                       # 入口
├── App.tsx                        # 路由定义
├── vite-env.d.ts
│
├── layouts/
│   └── BasicLayout.tsx            # 侧边栏 + 顶栏 + 账号切换器
│
├── pages/
│   ├── Login/index.tsx            # 登录页
│   ├── Dashboard/index.tsx        # 概览：经验趋势/饼图/等级曲线/今日进度
│   ├── Accounts/index.tsx         # 角色管理 CRUD
│   ├── AccountDetail/index.tsx    # 角色详情
│   ├── Config/index.tsx           # 自动化功能开关（分组配置）
│   ├── Logs/index.tsx             # 实时日志流（SSE）
│   ├── AIChat/index.tsx           # AI 助手对话
│   ├── Farm/index.tsx             # 农场地块网格面板
│   ├── Museum/index.tsx           # 博物馆收藏进度
│   ├── Battle/index.tsx           # 战斗统计
│   ├── Class/index.tsx            # 职业/技能树
│   ├── Marriage/index.tsx         # 婚姻管理/送花
│   ├── Inventory/index.tsx        # 背包/仓库资源
│   ├── Gang/index.tsx             # 帮派信息
│   ├── Dungeon/index.tsx          # 副本/秘境列表
│   ├── Auction/index.tsx          # 拍卖行数据
│   ├── Strategies/index.tsx       # 上号策略
│   └── Admin/index.tsx            # 系统管理
│
├── components/
│   ├── AccountSwitcher.tsx        # 顶部账号标签切换
│   └── ContextMenu.tsx            # 右键菜单
│
├── store/
│   ├── useAccount.ts              # 账号数据 + 预加载
│   ├── useAuth.ts                 # 认证状态
│   └── useCache.ts                # 客户端缓存
│
└── api/
    └── client.ts                  # API 客户端（axios 封装）
```

## 数据流

```
用户操作 → API Client (axios) → 后端 REST API → 游戏 API
                                   ↓
后端 Engine 定时循环 → 自动化执行 → 游戏 API
                                   ↓
                              DailyRecord → 每周统计图表
                                   ↓
                              SSE 实时推送 → 日志面板
```

前端采用**轻量状态管理**：zustand 管理全局状态（账号列表/认证），页面级数据通过 API 直接获取，不经过全局 store。关键设计：

- **概览页**：60 秒轮询 + ECharts 可视化（7 天经验趋势、角色等级曲线、饼图分布）
- **配置页**：按功能分组（婚姻/背包补给/农场/乐斗/广告），每功能独立开关 + 描述
- **账号切换**：顶部标签栏 + 右键菜单（启动/停止/绑定配偶）
- **实时日志**：SSE 事件流，增量 DOM 更新，日志分类（农场/乐斗/系统）

## 设计要点

1. **路由参数编码**：`accountId` 是 token 的 SHA256 前 12 位 hex，不随角色名/等级变化，永久稳定
2. **API 预加载**：`/api/preload` 一次性返回所有账号的基本信息 + 婚姻缓存
3. **0 全局过载**：页面组件自己管自己的数据，切换不互相影响
4. **配置持久化**：配置存后端数据库，多设备共享，无需重复设置

## 启动

```bash
npm install
npm run dev     # 开发模式 http://localhost:5173
npm run build   # 生产构建 → dist/
```

## 部署

Push 到 `master` 分支触发 GitHub Actions 自动构建 Docker 镜像并部署到京东云服务器。

Nginx 配置见 `nginx.conf`，`/api/` 路径反代到后端。
