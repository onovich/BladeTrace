# 只狼：贝塞尔轨道弹刀模拟器 (Sekiro Deflection Engine)

这是一个基于 Web 技术构建的《只狼》弹刀机制模拟引擎，用于展示**多段贝塞尔曲线拼接**与**分段缓动函数插值**在攻防节奏设计中的应用。

## 目录结构

```
sekiro_game/
├── index.html   # 主界面与 HTML5 Canvas
├── style.css    # 战术黑/日式和风 UI 样式
├── game.js      # 游戏引擎、多段贝塞尔数学计算、音效与 FSM 逻辑
└── README.md    # 项目说明文档
```

## 运行方式

无需额外安装依赖或服务器，解压后双击 `index.html` 即可直接在现代浏览器（Chrome / Edge / Safari / Firefox）中进行体验与调试。

## 核心技术实现

1. **多段贝塞尔拼接**：每一招由 2~3 段 3 阶贝塞尔曲线平滑链接。
2. **分段缓动（Easing）**：包含 EaseInCubic (蓄力加速)、EaseOutExpo (疾速爆发)、SlowFastPause (变奏) 等算法。
3. **判定窗口**：接近玩家判定圈的最后 $180	ext{ms}$ 内开启完美弹反帧。
4. **Web Audio API**：内置高频金属击鸣与碰撞合音，实时合成战斗音效。
