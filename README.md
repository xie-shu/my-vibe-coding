# AI 成长舱 · AI PM 产品思维学习助手

> 面向 AI 产品经理求职与日常成长的个人学习工作台。每天完成一道产品思维练习，沉淀 AI 热点资料和练习复盘，并通过 AI 问答助手持续提升面试表达与产品判断力。

![Portfolio](https://img.shields.io/badge/status-portfolio--ready-f4a7b9) ![React](https://img.shields.io/badge/React-19-149eca) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688) ![Vite](https://img.shields.io/badge/Vite-8-646cff)

## 在线预览

- GitHub Pages：[https://xie-shu.github.io/my-vibe-coding/](https://xie-shu.github.io/my-vibe-coding/)
- 仓库地址：[https://github.com/xie-shu/my-vibe-coding](https://github.com/xie-shu/my-vibe-coding)

说明：GitHub Pages 是纯前端静态部署，默认使用 Demo 模式，不会在前端暴露大模型 API Key。真实 GPT 问答、ASR、内容抓取等能力建议通过本地或云端后端服务接入。

## 产品定位

AI 成长舱不是传统题库，也不是通用聊天工具，而是一个面向 AI 产品经理的个人成长工作台：

- 用每日练习训练产品分析、需求拆解、AI 理解和结构化表达；
- 用 AI 热点资料库沉淀前沿技术、产品更新和行业案例；
- 用练习复盘库记录每次作答、评分、参考答案和改进建议；
- 用 AI 问答助手把资料、练习记录和热点内容转化为可复用的面试表达。

## 当前 V1.0 核心功能

- 今日产品思维练习：展示题目、背景、考察能力和作答建议；
- 答案评分与复盘：输出评分、优点、不足、优化方向和参考答案；
- AI 产品热点资料库：沉淀 AI 产品、Agent、RAG、多模态和开源项目资料；
- 练习复盘库：保存每天的题目、用户回答、AI 点评和标准答案；
- 知识库检索：支持资料检索与练习复盘两类内容查看；
- AI 问答助手：基于知识库、热点资料和历史练习进行问答；
- 响应式体验：支持网页端和移动端自适应。

## 页面说明

| 页面 | 功能 |
|---|---|
| 今日页 `/` | 查看今日练习题、AI 产品雷达、最近练习和能力概览 |
| 训练页 `/practice` | 完成产品思维练习，提交回答并获取 AI 评分 |
| AI 产品雷达 `/radar` | 查看 AI 热点资料、产品解读和面试表达素材 |
| 知识库 `/knowledge` | 查看资料检索与练习复盘库，管理知识来源 |
| AI 问答 `/chat` | 基于知识库和练习记录进行 AI 对话 |
| 练习记录 `/practices` | 查看历史题目、个人回答、参考答案和解析 |

## 三个 Agent 化流程

当前 V1.0 可以理解为“三个子 Agent 协作”的产品流程，但实现上更偏向 Agent 化流水线，不强依赖完全自治的多 Agent 系统。

| Agent | 负责什么 | 产出 |
|---|---|---|
| 题目生成 Agent | 根据知识库、热点资料和训练目标生成每日题目 | 题目、背景、考察能力、作答建议 |
| 答案评估 Agent | 根据用户回答和评分 Rubric 做结构化点评 | 分数、优点、不足、改进建议、参考答案 |
| 内容雷达 Agent | 整理 AI 产品与技术热点资料 | 热点卡片、PM 视角解读、可复用面试表达 |

## 技术栈

- 前端：React 19、TypeScript、Vite、React Router、TanStack Query、Zustand、Tailwind CSS；
- 后端：FastAPI、SQLAlchemy、PostgreSQL + pgvector、Redis、OpenAI 兼容模型接口；
- 部署：GitHub Actions + GitHub Pages，线上静态 Demo 模式。

## 本地运行

```bash
cd frontend
npm install
npm run dev
```

默认访问：

```text
http://127.0.0.1:5173/
```

## GitHub Pages 构建

```bash
cd frontend
VITE_BASE_PATH=/my-vibe-coding/ VITE_DEMO_MODE=true VITE_CHAT_MODEL_MODE=demo npm run build
```

## V1.0 功能边界

当前版本已经适合用于作品集演示：支持每日练习、答案复盘、热点资料、知识库、AI 问答以及网页端/移动端自适应。

线上 Demo 不暴露 API Key；如果要接真实 GPT，需要把后端单独部署，再由前端请求后端代理接口。

## 后续迭代方向

V1.1：优化上下文记忆与复杂问题理解，让问答助手能围绕历史练习连续追问，并识别用户薄弱能力。

V1.2：增加点赞点踩、文字反馈和个性化训练计划，根据反馈调整题目难度和答案风格。

V1.3：接入稳定内容源抓取与云端后端，支持真实 GPT 问答、ASR 和每日 AI 产品雷达自动生成。

## 面试介绍一句话

“这是一个面向 AI 产品经理求职准备的个人成长工作台，用每日产品思维练习、AI 热点资料库、练习复盘和知识库问答，帮助我持续训练产品判断力，并把学习内容转化成面试中可表达、可追溯的素材。”
