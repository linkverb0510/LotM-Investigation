# LW 长期记忆与经验教训

本文档记录开发过程中的关键经验、项目理解、避坑指南与常用约定。

---

## 2026-05-14 | 初始项目认知

*   **技术栈**: Next.js (App Router) + TypeScript + Socket.IO + Prisma (SQLite).
*   **核心架构**: 
    *   `src/lib/game`: 纯逻辑/引擎 (Engine, Types, Content, Utils).
    *   `src/lib/server`: 房间管理与 Socket 事件分发 (RoomStore, SocketEvents).
*   **开发原则**:
    *   不瞎猜，有疑问先问 (Ask User).
    *   不自动编译打包 (避免资源浪费).
    *   代码修改保持最小侵入 (Surgical Changes).
*   **坑点**:
    *   投票指认机制涉及阵营判定：投对（减缓仪式/得线索），投错（加速仪式/损灵性）。逻辑比单纯的分票更复杂。

---

## 2026-05-15 | 前端私有视角适配

*   **关键经验**:
    *   如果前端需要展示“我的手牌”和“我的资源”，仅靠公开玩家列表不够，Socket 私有快照里必须显式下发 `selfPlayerId`。
*   **坑点**:
    *   不能默认 `players[0]` 就是当前客户端玩家，这会直接导致灵性校验、目标选择和个人头衔展示出错。
*   **约定**:
    *   目标型卡牌的前端交互先走“选牌 -> 选目标 -> 发事件”的显式流程，避免一键操作导致参数缺失。

---

## 2026-05-15 | 角色策划审查经验

*   **关键经验**:
    *   角色设计不能只追求“看起来很强”，而要先明确桌面职责，再围绕职责配置资源、代价与暴露风险。
    *   《诡秘之主》改编角色最容易犯的错误是“名词贴皮”，真正有效的文本应体现组织关系、处境压力与非凡代价。
*   **坑点**:
    *   全能型角色会压缩团队分工空间，尤其是同时拥有净化、控制、恢复、查验时，其他角色会失去存在意义。
    *   纯随机闪避、纯硬控、无代价高收益等机制虽然直观，但会削弱推理桌游的互动性与可读性。
    *   不要把角色原型机械对应到单一原著人物；很多职业和途径更适合做“世界观内新角色”，而不是直接复刻主角团。
*   **约定**:
    *   角色文档后续优先采用统一结构：定位、审查结论、机制方向、卡牌建议、背景剧情。
    *   后续新增角色时，至少回答三个问题：他在桌上的职责是什么、他的强项代价是什么、他的文本为何必须存在于贝克兰德这场故事里。

---

## 2026-05-15 | 角色卡文档写法约定

*   **关键经验**:
    *   角色卡文档与策划审查文档必须分离。前者服务于玩家阅读、系统录入和 UI 展示，后者服务于内部讨论。
    *   角色能力文本越短越好，但必须保持可执行性；复杂裁定应放到后续规则文档，而不是塞进角色卡主体。
*   **坑点**:
    *   在角色文件里混入“问题分析”“为什么这样改”会让文档既不像正式设定，也不像可用规则。
    *   如果没有固定字段顺序，后续继续扩角色时很容易出现有的角色写数值、有的角色只写故事的失衡情况。
*   **约定**:
    *   角色文件统一采用：角色概览、建议初始属性、角色介绍、核心能力、扮演要点、背景剧情、风味台词。
    *   角色卡中的"真实阵营"和"公开形象"允许并存，方便后续拆分玩家可见信息与系统完整信息。

---

## 2026-05-15 | 角色序列 7 深度重做

*   **关键经验**:
    *   所有角色必须严格对齐原著途径名称与序列 7 能力设定。
    *   角色能力设计优先还原原著核心能力（如梦魇的梦境操控、魔术师的火焰跳跃/纸人替身、风眷者的风雷压制、隐修士的低语聆听、通灵者的亡者沟通）。
    *   强度差异通过污染代价、灵性消耗、失控风险等机制补偿，而非削弱能力本身。
*   **途径修正**:
    *   黑夜女神途径（原"不眠者"）·序列 7 梦魇：资深值夜者、失控边缘者
    *   占卜家途径·序列 7 魔术师：灰雾魔术师（原塔罗会信使，定位完全重做）
    *   风暴之主途径（原"水手"）·序列 7 风眷者：代罚者军官
    *   玫瑰学派途径（原"秘祈人"）·序列 7 隐修士：极光会渗透者
    *   死神途径（原"收尸人"）·序列 7 通灵者：教会医生
*   **设计原则**:
    *   角色卡文档只写"可读、可玩、可实现"的内容，不写审查结论或设计解释。
    *   能力文本保持短、准、可执行，复杂裁定放到后续规则文档。
     *   背景剧情与风味台词按原著文风重写，增强代入感。

---

## 2026-05-18 | 叙事架构与黄金路径建设

*   **关键经验**:
    *   **黄金路径 = 阶段锚点 + 调查进度条**：锚点保叙事下限（每阶段必须有 1-3 个 Storylet 必然触发），进度条保节奏上限（防止调查无限拖延）。两者互为冗余，锚点未完成 + 进度达标 → 系统注入保底事件；锚点完成 + 进度不足 → 解锁支线。
    *   **饱和式触发**：每个锚点应有 2-3 条不同到达通路（action/location/discussion/time），最后一条为保底回合注入，确保关键叙事节点绝不错过。
    *   **Storylet 数据量控制**：从 43 条全集中按 MVP 筛选约 19 条新增事件，覆盖 P0-P6 全流程。MVP 不做完=后续无法验证黄金路径是否成立。
*   **坑点**:
    *   `InvestigationStoryletSeed.phaseHint` 原为内联联合类型，提取为独立 `PhaseHint` 类型后必须确保所有引用处都更新。漏改会导致 TypeScript 类型推断断裂。
    *   新增 Storylet 插入时必须找到正确的 `phaseHint` 分组位置，不能随意插入——否则后续维护时难以按阶段定位事件。
    *   textSeed 从 Storylet 全集裁剪时，必须保留关键叙事信息（人物、地点、异常特征），删减的是修饰性描述而非事实性内容。
*   **约定**:
    *   所有新增类型一律追加在 schema.ts 末尾，用 `// ── 分组标题 ──` 分隔。
    *   Storylet ID 命名：`seed-{scope}-{角色英文名缩写}-{事件关键字}`，如 `seed-private-cecilia-childhood`。
    *   占位符语法：变量用 `{path.to.value}`，条件块用 `{if:condition}...{/if}`，取反用 `{if:!condition}...{/if}`。
    *   game-state.ts 使用 onChange 回调模式（非 EventEmitter），供 golden-path 订阅状态变化。
    *   执行顺序：Plan Mode 先出完整设计文档 → 确认后 Build Mode 基础设施先行 → Storylet 数据批量填充 → 文档收尾。

---

## 2026-05-18 | 桥接集成与 dev 命令

*   **关键经验**:
    *   **桥接适配模式**：v2 系统与现有引擎是两个独立体系，不应重写引擎。正确做法是在 `room-store.ts` 的方法中记录 `oldPhase`，调用引擎函数后比对 `newPhase`，再通过 `_hookBridgeOnPhaseChange` 注入 Storylet。引擎保持纯函数不变。
    *   **Phase 双向映射**：`GamePhase`（引擎层）↔ `PhaseHint`（v2 层）通过查表映射，`showdown`→`resolution` 是唯一非一一对应项。
    *   **Dev 命令扩展**：在 room-store 中新增 `skip_to`/`inject`/`progress` 三条命令，与已有 `set_phase` 等命令并列。前端通过 `Ctrl+Shift+D` 呼出浮层输入框。
*   **坑点**:
    *   `applyTurnAction` 也会触发阶段切换（resolveRound → finalizeRoundAfterResolution），不能遗漏钩子。
    *   `handleDevCommand` 中 `skip_to` 不仅要改 `gameState.phase`（引擎的 GamePhase），还要同步更新 GoldenPath 的 `currentPhase`（v2 的 PhaseHint），否则进度计算错位。
    *   私密 Storylet 分发需要角色 ID 映射——引擎使用 `nanoid` 分配玩家 ID，但 v2 使用 `role-01-edwin` 风格的角色 ID。当前通过独立 `roleInfoMap` 桥接，但两者不联动，后续需统一。
    *   前端 `game:dev_cmd` 的 socket 监听已在 `socket-events.ts` 中注册，不需要额外添加服务端监听器。
*   **约定**:
    *   桥接器中的调试命令以 `skip_to`/`inject`/`progress` 命名，与旧命令风格一致。
    *   所有 Storylet 文本写入 `gameState.logs` 时使用 `📜【标题】` 前缀，区分于系统日志。

---

## 2026-05-18 | 跑团核心机制

*   **关键经验**:
    *   **六属性体系**：灵性/洞察/意志/体质/诡诈/知识——每种属性关联特定行动类别（搜证→洞察、通灵→灵性、压制→体质、掩饰→诡诈）。属性分布极端的角色（奥斯顿体质6诡诈1）具有明显的「擅长领域」和「禁区」。
    *   **五档结果**：天启(5%)/成功(45%)/勉强(15%)/失败(15%)/灾厄(5%)——灾厄不是空手而归，而是获得被污染的误导信息且不知道它是错的。
    *   **专长不提供被动加值**，而是在特定情境下改变检定规则——如莱尔的「灰雾直觉」（差≤2可重掷）、戴芙琳的「灵界漫游」（失败可选深入一层但风险加大）。
    *   **难度修正因子**：石碑周边+2、压力Tier3以上+2、角色污染≥4+2、持有物品-2、合作-2——越晚行动越难。
    *   **Storylet扩展**：InvestigationStoryletSeed 新增 `check?`（检定配置）和 `results?`（五档文本变体）——不填则保持纯叙事事件。
*   **坑点**:
    *   D20掷骰必须用 `Math.floor(Math.random()*20)+1`——用 `Math.ceil` 会导致1永远不会出现。
    *   专长修正函数 `applySpecialtyDifficulty` 需要在 `calcDifficulty` 基础上叠加，不能绕过基础难度修正。
    *   Storylet 的 `results` 字段中的文本需要保证与 `relatedTruthMapIds` 指向的真相一致——灾厄文本中的误导信息必须是「对真相的扭曲」而非「完全错误的设定」。
*   **约定**:
    *   属性ID统一用英文：aura/insight/will/physique/cunning/lore。
    *   角色ID沿用 v2 规范：role-01-edwin ~ role-06-elias。
    *   Storylet checks 附在公共事件上，私密事件通常不挂检定（因为私密事件已限定角色）。
     *   设计文档先行原则再次确认：每次新机制先写MD设计文档，再写代码。

---

## 2026-05-18 | Docs 架构重组

*   **关键操作**:
    *   归档 7 个旧文件到 `archived/`（阶段0规划总表、架构图与关系图、Lore校正版3份、codex_ui_report、codex-prompts旧任务）。
    *   开发相关文档拆分为 6 个分类子目录：产品规划(2)、模式设计(3)、角色体系(4)、玩法机制(4)、开发日志(3)、工具参考(3)。
    *   核心案件主文档将「真相候选槽位」替换为权威源引用 + 变体维度表。
    *   新增 2 份游戏设计参考文档（BG3属性检定分析、极乐迪斯科检定驱动叙事分析）。
    *   重写 `docs/README.md` 和 `文档结构总表.md`。
*   **坑点**:
    *   PowerShell `Move-Item -LiteralPath` 是移动中文文件名到中文目录的关键——必须用 `-LiteralPath` 而非 `-Path`。
    *   `git mv` 在文件未被 track 时失败——非 git-tracked 文件必须用普通 move。
    *   移动文件后旧文档中的绝对路径链接会失效——只修复了关键入口链接，开发日志内部链接保留原样。
*   **约定**:
    *   后续新增文档按分类放入对应子目录。
    *   开发日志统一放 `开发日志/`，按 `开发文档_YYYYMMDD[_主题].md` 命名。
    *   设计参考沉淀到 `game-design-references/`，按 `{游戏名}-{分析维度}.md` 命名。

---

## 2026-05-18 | 引擎重写

*   **关键操作**:
    *   废弃旧 `engine.ts`（legacy 卡牌对战原型），新建 `investigation-engine.ts` 作为调查模式主引擎。
    *   新引擎核心数据流：玩家选卡 → room-store 读取卡牌类别 → 映射属性 → 构建 PlayerAction → executePlayerAction → 匹配 Storylet → D20 检定 → 五档结果 → 更新状态。
    *   Internals 模式：GoldenPath + GameState 通过 `WeakMap<InvestigationGameState, EngineInternals>` 管理，不进入序列化管道。
    *   `room-store.ts` 的 `applyTurnAction` 保留了格式兼容层——从旧 socket 格式（`{cardId, isFaceDown, targetPlayerId}`）自动转换为新引擎的 `PlayerAction`（`{cardId, targetId, category, attribute}`）。
    *   `room-client.tsx` 完整重写（1296行 → 320行），基于新引擎数据结构。
*   **坑点**:
    *   `InvestigationGameState` 接口中不能直接放 `GoldenPath`/`GameState` 实例——它们包含方法和 mutable 状态，序列化到前端会爆炸。用 WeakMap 管理是正确的。
    *   旧引擎的 `Card` 类型与新引擎的 `InvestigationCardSeed` 字段完全不同（`cost.spirituality` vs `costText`）——必须通过 `adaptCard()` 转换。
    *   `socket-events.ts` 的定时器 auto-resolve 调用 `resolveActionRound` 传入的是 `room.gameState`（现在是 `InvestigationGameState`），类型正确但确保 `currentState` 的 internals 已在 `createInvestigationGame` 时初始化。
    *   `InvestigationStoryletSeed` 的 `check?.attribute` 通过 schema 定义是 `Attribute` 类型，传给 `resolveCheck` 时需确保类型匹配。
*   **约定**:
    *   新引擎函数遵循纯函数风格：输入旧 state → 返回新 state（不修改输入）。
    *   前端 `FrontendCard` 是 `InvestigationCardSeed` 的前端兼容简化版。
    *   旧 `engine.ts` 保留但不再被任何模块引用，作为历史参考。
