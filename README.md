# Q宠乐斗 v5.0 Frontend

React 前端 Dashboard，为 Q宠乐斗游戏提供可视化管理界面。

## 技术栈

- React 18 + TypeScript / Ant Design Pro
- ECharts / zustand / Vite

## 启动

```bash
npm install
npm run dev
```

访问 `http://localhost:5173`。

## 部署

Push `v5.0-dev` 分支即触发 GitHub Actions 自动构建镜像并部署到云服。

Nginx 反向代理已配置在 `nginx.conf`，端口 80。
