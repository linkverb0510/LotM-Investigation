# 开发报告：引擎逻辑细化与高级机制实现

> **日期**: 2026-05-14  
> **任务**: 实现“失控边缘者弱判定”与“危险地点获取封印物”机制。

---

## 1. 需求回顾与选择

在上一轮开发中，我们确认了两个关键设计决策（选项 B）：
1.  **失控边缘者（Weak Determination）**：阵营转换不只看数值，受社交投票（关注度）影响。
2.  **封印物获取（Dangerous Locations）**：只有通过特定“危险调查”行动才高概率获得。

---

## 2. 实施方案

### 2.1 数据结构扩展 (`types.ts`)
*   **Tags 系统**：在 `Card` 接口中增加 `tags?: string[]`，用于标记卡牌特性（如 `dangerous_location`）。
*   **社交救赎**：在 `PlayerPublicState` 中增加 `restorationMarks`（救赎标记），记录玩家受到的社交关注。

### 2.2 危险地点与封印物逻辑 (`content.ts` & `engine.ts`)
*   **标记卡牌**：在 `content.ts` 中将“深渊凝视”等卡牌标记为 `["dangerous_location"]`。
*   **掉落判定**：
    *   在 `submitTurnAction` 中，系统检查打出卡牌的 tags。
    *   若包含 `dangerous_location`，触发 50% 概率判定。
    *   若成功，从 `artifactDeck` 抽取一张卡加入玩家手牌，并记录日志。

### 2.3 失控边缘者社交转换逻辑 (`engine.ts`)
*   **获取标记**：
    *   在 `finalizeVoting`（投票结算）阶段，如果目标是“失控边缘者”，其 `restorationMarks + 1`。
    *   *设计意图*：这代表“同伴的关注”让他感到温暖/理智回归，而非单纯的排斥。
*   **转换判定**：
    *   在 `resolveRound`（回合结算）阶段，检查条件：`restorationMarks >= 2` 且 `corruption < 40`。
    *   若满足，立即将 `faction` 从 `polluted` 切换为 `investigator`，并修改角色名。

---

## 3. 验证与兼容性

*   **灵活性**：Tag 系统允许未来任意卡牌变为“危险调查”，无需修改引擎代码。
*   **社交博弈**：弱判定机制鼓励玩家在投票阶段权衡：是投死污染源，还是投“边缘者”拉他一把？
*   **性能**：逻辑仅增加简单的数组遍历和条件判断，不影响性能。

---

## 4. 交付物

*   ✅ `src/lib/game/types.ts` (Tags, Restoration Marks)
*   ✅ `src/lib/game/content.ts` (Dangerous Tags)
*   ✅ `src/lib/game/engine.ts` (Artifact Drop, Conversion Logic)
*   ✅ `docs/dev-reports/2026-05-14-engine-refinement.md`
*   ✅ `docs/study-notes/02-tag-driven-logic-and-social-mechanics.md`
