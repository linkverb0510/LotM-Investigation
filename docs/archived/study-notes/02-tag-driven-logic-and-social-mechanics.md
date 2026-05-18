# 学习笔记：标签驱动逻辑与社交博弈机制

> **主题**：如何通过架构设计提升游戏的可扩展性和社交深度。

---

## 1. 标签驱动逻辑 (Tag-Driven Logic)

在引擎开发中，我们经常遇到“某类卡牌具有特殊效果”的需求。比如“危险地点调查”可能掉落封印物。

### 1.1 错误做法：硬编码 (Hardcoding)
```typescript
// ❌ 坏味道：如果以后有 10 种危险卡牌，if 语句会很长
if (card.id === "abyssal-gaze" || card.id === "deep-search") {
  tryGetArtifact();
}
```
**缺点**：每次新加卡牌都要改引擎代码，容易引入 Bug，且逻辑分散。

### 1.2 正确做法：标签系统 (Tags)
```typescript
// ✅ 优雅：卡牌数据定义 tags，引擎只关心 tag
export interface Card {
  tags?: string[]; // ["dangerous_location"]
}

// 引擎代码：
if (card.tags?.includes("dangerous_location")) {
  tryGetArtifact();
}
```
**优点**：
*   **解耦**：引擎逻辑与卡牌内容分离。
*   **可扩展**：新卡牌只需加 tag，无需改引擎。
*   **复用**：一个 tag 可以触发多种效果（如“危险”同时增加污染和掉落率）。

---

## 2. 弱判定与社交博弈 (Weak Determination)

在设计“失控边缘者”这种可变阵营角色时，我们面临两种选择。

### 2.1 强判定 (Hard Threshold)
*   **逻辑**：`if (corruption < 20) return investigator;`
*   **体验**：玩家只需做任务降低数值，缺乏互动感。像是单机 RPG。

### 2.2 弱判定 (Social Determination) - *本项目采用*
*   **逻辑**：`if (restorationMarks >= 2 && corruption < 40) ...`
*   **来源**：`restorationMarks` 来自其他玩家的**投票**（关注度）。
*   **体验**：
    *   **边缘者视角**：我必须主动暴露或引导别人关注我，才能获救（而不是躲在角落）。
    *   **调查者视角**：我投给他，是为了杀他，还是为了拉他一把？
    *   **结果**：投票行为不再是单纯的“排除异己”，而是变成了“资源分配”（救赎 vs 淘汰）。

---

## 3. 软工启示

1.  **数据驱动设计 (Data-Driven Design)**：将逻辑规则（如掉落率、转换条件）抽象为通用算法，通过数据配置（Tags, Marks）来表现差异。这是现代游戏引擎（Unity/Unreal）的核心思想。
2.  **机制服务于体验**：好的代码结构（如 Weak Determination）能直接催生出更有趣的玩家互动。在写代码前，先问自己：“这行代码会让玩家产生什么情感？”
