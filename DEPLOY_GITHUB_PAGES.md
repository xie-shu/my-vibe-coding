# GitHub Pages 部署说明

本仓库支持把 `frontend` 作为静态作品集部署到 GitHub Pages。

## 部署模式

GitHub Pages 只能托管静态前端，不能安全保存大模型 API Key。因此线上 Pages 默认使用：

- `VITE_DEMO_MODE=true`
- `VITE_CHAT_MODEL_MODE=demo`

也就是作品集演示模式：页面、知识库、练习记录、AI 热点、问答流程都能稳定展示，但不会把真实 API Key 暴露到浏览器。

如果后续要线上接真实 GPT，需要把 `backend` 单独部署到 Render、Railway、Vercel Serverless、Cloudflare Workers 等后端环境，再把前端的 `VITE_API_BASE_URL` 指向该后端地址。

## 第一次部署步骤

1. 在 GitHub 创建一个新仓库，例如：

   `my-vibe-coding`

2. 在本地项目根目录执行：

   ```bash
   git init
   git add .
   git commit -m "Deploy AI PM growth cockpit"
   git branch -M main
   git remote add origin https://github.com/xie-shu/my-vibe-coding.git
   git push -u origin main
   ```

3. 打开 GitHub 仓库：

   `Settings → Pages → Build and deployment`

4. Source 选择：

   `GitHub Actions`

5. 等待 Actions 跑完后，访问：

   `https://xie-shu.github.io/my-vibe-coding/`

## 本地构建检查

```bash
cd frontend
VITE_BASE_PATH=/my-vibe-coding/ VITE_DEMO_MODE=true VITE_CHAT_MODEL_MODE=demo npm run build
```

## 移动端适配

前端已经使用响应式布局，支持桌面端和移动端访问。重点适配包括：

- 侧边栏在移动端切换为底部导航；
- 首页卡片在移动端自动单列展示；
- 练习页、知识库页、问答页在窄屏下自动压缩布局；
- 触控按钮保留足够点击区域。
