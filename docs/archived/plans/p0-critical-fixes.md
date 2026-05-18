# P0 问题解决计划：完成完整一局游戏

> **目标**：修复所有 P0 级问题，实现"从开局到结算完整跑完一局"
> **优先级**：最高（阻塞首次可玩版本）
> **预计工时**：2-3 小时（含测试）

---

## 一、P0-1: 修复玩家状态浅拷贝竞态

### 问题
`engine.ts` 中多处使用 `players: [...state.players]` 做浅拷贝，后续直接修改 player 对象属性，破坏不可变性。

### 方案
引入 `structuredClone` 进行深拷贝（Node.js 19+ 原生支持），或在关键操作处对单个 player 对象做深拷贝。

### 修改清单

| 函数 | 修改点 |
|------|--------|
| `createInitialGameState` | playerStates 构建无需修改（新建对象） |
| `confirmReady` | 无需修改（仅添加 readyPlayers，不改 player） |
| `submitTurnAction` | 需要深拷贝被修改的 player 对象 |
| `resolveRound` | 需要深拷贝所有被修改的 player 对象 |
| `submitVote` | 无需修改（仅添加 pendingVotes） |
| `submitStoryChoice` | 需要深拷贝被修改的 player 对象 |

### 实施步骤
1. 在 `engine.ts` 顶部添加辅助函数 `clonePlayer(p): PlayerPrivateState`
2. 在所有修改 player 属性的地方，先克隆再替换到 players 数组
3. 验证 `resolveRound` 中的 `nextState.players.forEach` 不直接修改原引用

---

## 二、P0-2: 实现胜利判定逻辑

### 问题
`winnerPlayerIds` 字段从未填充，游戏无胜负判定。

### 方案设计

**胜利条件（基于模型 A 设计）**：

| 阵营 | 胜利条件 |
|------|----------|
| 调查者 (investigator) | P5 结束时 `boss.threatLevel < 50` 且自身 `corruption < 80` |
| 污染源/渗透者 (polluter) | P5 结束时 `boss.threatLevel >= 80` 或至少 2 名调查者 `corruption >= 80` |
| 不稳定者 (06-unstable-one) | 根据自身抉择后的阵营归属判定 |

### 实施步骤
1. 在 `engine.ts` 新增 `determineWinners(state: GameState): GameState` 函数
2. 在 `resolveRound` 的 `showdown -> finished` 转换前调用该函数
3. 填充 `state.winnerPlayerIds` 数组
4. 在 `serializePublicState` 中包含胜利者信息
5. 前端根据 `winnerPlayerIds` 展示结算画面

---

## 三、P0-3: 补全基础 UI（完整一局体验）

### 缺失组件清单

| # | 组件 | 描述 | 依赖 |
|---|------|------|------|
| 1 | `BossThreatBar` | 顶部 HUD 显示 `boss.threatLevel`，颜色动态变化 | engine 已有数据 |
| 2 | `StoryChoiceModal` | P4 剧情抉择弹窗，响应 `pendingChoice` | engine 已有数据 |
| 3 | `SettlementScreen` | 结算画面，显示胜负结果、各玩家数据 | 需 P0-2 完成 |
| 4 | `DiscussionOverlay` | 讨论阶段交互（MVP: 简单倒计时+继续按钮） | socket 已有 |
| 5 | 阶段切换通知 | 阶段变更时全屏文字提示 | engine 已有 logs |

### 实施步骤
1. 在 `room-client.tsx` 中新增 `BossThreatBar` 组件（嵌入 `GameHeader`）
2. 新增 `StoryChoiceModal` 组件，监听 `pendingChoice` 状态
3. 新增 `SettlementScreen` 组件，展示胜利者 + 统计数据
4. 在 `discussion` 阶段添加倒计时 UI + "确认继续"按钮
5. 在阶段切换时显示过渡动画/文字（2 秒后消失）

---

## 四、验收标准

- [ ] 浅拷贝修复后，多次并发出牌不出现状态异常
- [ ] 游戏结束时 `winnerPlayerIds` 非空
- [ ] 前端能从头到尾完整展示：准备 → 调查 → 讨论 → 调查 → 讨论 → 对决 → 结算
- [ ] Boss 威胁条在整个游戏过程中可见
- [ ] P4 抉择弹窗正常弹出并可交互
- [ ] 结算画面显示胜利者名单

---

## 五、风险与回退

| 风险 | 缓解措施 |
|------|----------|
| 深拷贝可能影响性能 | 当前玩家数 3-6，数据量小，无性能问题 |
| 胜利条件平衡性 | 先实现基础逻辑，后续可通过配置文件调整阈值 |
| UI 样式不完美 | MVP 阶段功能优先，样式后续迭代 |
