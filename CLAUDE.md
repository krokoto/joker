# CLAUDE.md

## 项目定位

Balatro 风格的「扑克 + 小丑牌组合」单机网页游戏，纯前端（Vue 3 + Vite），无后端、无登录、无 API key。这是一个分 6 轮迭代的教学项目，**当前为第 1 轮**：核心循环 + 设置 + 动效 + AI。

需求与设计是锁定的，实现前必读：

- `01-第1轮-PRD-小丑牌核心循环.html` —— 产品需求文档（玩法 / 数值 / 文案 / 状态机 / 验收清单，含大量「锁定」项）
- `01-第1轮-DESIGN-小丑牌核心循环.html` —— 设计规范（配色 token / 字体三类分工 / 组件尺寸 / 动画时序）

改玩法、数值、文案、视觉前，先回这两份文档对照锁定值，不要自行臆造。

## 目录约定

```
index.html                  入口，引入 Google Fonts（Press Start 2P / VT323 / Inter）
vite.config.js              Vite 配置，base 自适应 DEPLOY_TARGET（'pages' → '/joker/'，否则 './'）
src/
  main.js                   Vue 挂载入口
  App.vue                   主组件（~1750 行）：全部 UI + 状态机 + 动效，目前所有逻辑集中于此
  game.js                   纯逻辑层：牌组 / 洗牌 / 9 种牌型识别 / 计分公式 / 6 张 Joker 库 / AI 启发式枚举
  style.css                 全局样式：CSS 变量、深蓝水纹背景、按钮规范、动画 keyframes
  components/               预留（暂空）
public/                     静态资源（暂空）
dist/                       构建产物（gitignore）
01-第1轮-*.html             PRD / DESIGN 文档
```

## 常用命令

```bash
npm install        # 安装依赖
npm run dev        # 开发服务器，默认 http://localhost:5173/（常驻进程，不会自己退出）
npm run build      # 生产构建，要求 0 error 0 warning
npm run preview    # 预览构建产物
DEPLOY_TARGET=pages npm run build   # 为 GitHub Pages 构建（base 改为 /joker/）
```

## 关键约定与坑（来自 PRD §10 硬约束）

- 字体三类分工：中文用 Inter + PingFang SC，数字大屏用 VT323，纯英文装饰用 Press Start 2P。**不要用 Press Start 2P / VT323 渲染中文。**
- 背景深蓝水纹 `#0a1438 → #1a2858 → #0a1438`，不偏紫。
- 右主区布局 `grid-template-rows: 230px 1fr 280px`（不要三等分）；牌堆 `absolute` 内嵌出牌区右下角（**绝不用 fixed**）。
- 出牌按钮 X = 选中数；弃牌按钮 X = 剩余弃牌数（别写反）。
- 大盲注通关进 `won` 不进商店。
- 飞牌/弃牌动画期间，原手牌用 `visibility: hidden` 保留占位（避免重影 + 不让其他牌位移）。
- 工程化：1 轮 = 1 个 commit；除 README/CLAUDE 外不要造其他 .md 文档。

## 后续轮次（本轮不做）

第 3 轮接 Howler 音频 + 粒子升级；第 4 轮 agent-browser 验收；第 5 轮 Tauri 跨端打包；第 6 轮 DeepSeek 真 LLM 接入。设置面板的 BGM/SFX 滑块、AI 按钮本轮已做出 UI，后续轮次只补接线。
