export interface InvestigationSourceReference {
  id: string;
  title: string;
  projectPath: string;
  originalPath: string;
  ingestedAt: string;
  authorityLevel: "authoritative";
  notes: string;
}

export interface RoleStartStats {
  maxSpirituality: number;
  startCorruption: number;
  startClues: number;
  startHand: number;
}

export interface InvestigationCardSeed {
  id: string;
  roleId: string;
  name: string;
  category: string;
  costText: string;
  rulesText: string;
  why?: string;
}

export interface RoleStoryletHooks {
  openingPrivate: string;
  midgameReactive: string;
  discussionRelation: string;
  endingAftertaste: string;
}

export interface InvestigationRoleDefinition {
  id: string;
  publicName: string;
  realName: string;
  title: string;
  organization: string;
  pathway: string;
  sequence: string;
  publicRole: string;
  investigationRole: string;
  discussionRole: string;
  difficulty: string;
  startStats: RoleStartStats;
  trait: string;
  signatureCards: InvestigationCardSeed[];
  privateConcern: string;
  riskOrCost: string;
  sensitiveTopics: string[];
  storyletHooks: RoleStoryletHooks;
  backgroundSummary: string;
  sourceDocId: string;
}

export interface ArtifactDefinition {
  name: string;
  category: string;
  threatLevel: string;
  origin: string;
  essence: string;
  mechanisms: string[];
  outwardSigns: string[];
  pathwayBinding: string[];
  currentState: string;
  unfinishedClosure: string;
}

export interface TimelineEntry {
  order: number;
  period: string;
  event: string;
  result: string;
}

export interface FactionOrgDefinition {
  name: string;
  roleInCase: string;
  wants: string;
  knows: string[];
  doesNotKnow: string[];
  fears: string[];
}

export interface CharacterTruthRole {
  name: string;
  truthRole: string;
  details: string;
}

export interface EndingExplanation {
  id: string;
  title: string;
  prerequisites: string[];
  truthReveal: string[];
  fallout: string[];
  characterOutcomes: Record<string, string>;
}

export interface TruthMapEntry {
  id: string;
  clueLabel: string;
  surfaceClue: string;
  truthExplanation: string;
  relatedCharacters: string[];
  relatedOrgs: string[];
  relatedLocations: string[];
}

export interface InvestigationStoryletSeed {
  id: string;
  scope: "public" | "private" | "reactive" | "relationship" | "ending";
  phaseHint: PhaseHint;
  title: string;
  source: string;
  triggerHint: string;
  textSeed: string;
  affectedRoles?: string[];
  relatedTruthMapIds?: string[];
  /** 检定配置——若无此字段则该 Storylet 为纯叙事事件 */
  check?: CheckConfig;
  /** 五档结果文本变体——若无则降级使用 textSeed + 结果标记 */
  results?: StoryletResults;
}

export interface InvestigationCaseDefinition {
  caseId: string;
  caseTitle: string;
  truthSummary: string;
  artifact: ArtifactDefinition;
  timeline: TimelineEntry[];
  factionsAndOrgs: FactionOrgDefinition[];
  characterTruthRoles: CharacterTruthRole[];
  clueTruthMap: TruthMapEntry[];
  endingExplanations: EndingExplanation[];
  sourceDocId: string;
}

// ── 黄金路径与阶段控制 相关类型 ──

/** 阶段提示——Storylet 和锚点共用的阶段枚举 */
export type PhaseHint =
  | "briefing"
  | "investigation_up"
  | "discussion_1"
  | "investigation_down"
  | "discussion_2"
  | "resolution";

/** 饱和式触发通路——为同一锚点提供多条到达路径 */
export interface SaturationPath {
  /** 触发类型：动作触发 / 地点触发 / 讨论关键词触发 / 时间流逝触发 */
  triggerType: "action" | "location" | "discussion_keyword" | "time_elapsed";
  /** 触发条件的描述表达式（例如 "role-01-edwin 使用搜证并选择 basement 方向"） */
  condition: string;
  /** 优先级，1 为最自然／优先级最高的触发方式 */
  priority: number;
}

/** 阶段锚点——每阶段必须完成的关键叙事节点 */
export interface PhaseAnchor {
  /** 锚点唯一标识 */
  anchorId: string;
  /** 所属阶段 */
  phaseHint: PhaseHint;
  /** 该阶段至少需要完成几个锚点（对应 requiredCount 个 targetStoryletIds 中任一触发） */
  requiredCount: number;
  /** 可作为该锚点完成的 Storylet ID 列表（触发列表中的任一条即视为该锚点完成） */
  targetStoryletIds: string[];
  /** 饱和式触发通路列表 */
  saturationPaths: SaturationPath[];
  /** 保底回合——若到第 N 回合仍未触发，则系统自动注入 */
  fallbackTurn: number;
}

/** 调查进度追踪器——驱动阶段推进的数值模型 */
export interface ProgressTracker {
  /** 综合进度 0–100 */
  overallProgress: number;
  /** 线索发现进度 0–40 */
  clueDiscovery: number;
  /** 真相节点连接进度 0–30 */
  truthNodeConnections: number;
  /** 决策完成进度 0–20 */
  decisionCompletion: number;
  /** 异常自动演进进度 0–10 */
  anomalyEscalation: number;
  /** 当前阶段对应的进度下限（低于此值不应推进到下一阶段） */
  currentPhaseThreshold: number;
  /** 下一阶段对应的进度下限 */
  nextPhaseThreshold: number;
}

/** 黄金路径整体定义——个案的完整叙事骨架 */
export interface GoldenPathDefinition {
  /** 关联的案件 ID */
  caseId: string;
  /** 各阶段的锚点列表，key 为 phaseHint */
  phaseAnchors: Record<string, PhaseAnchor[]>;
  /** 各阶段的进度阈值，key 为 phaseHint */
  progressThresholds: Record<string, { min: number; max: number }>;
  /** 初始进度值（通常全部为 0） */
  initialProgress: ProgressTracker;
}

// ── 游戏状态与文本适配 相关类型 ──

/** 游戏内可跟踪的键值状态字典（支持布尔、数值、字符串） */
export interface GameStateVariables {
  deathCount: number;
  nightmareBlockCount: number;
  saltSpreadDistance: number;
  hoursElapsed: number;
  orgConflictLevel: number;
  truthConnectionCount: number;
  /** 允许扩展的通用键值索引 */
  [key: string]: number | boolean | string;
}

/** 触发上下文——Storylet 被触发时由系统注入的运行时信息 */
export interface TriggerContext {
  /** 触发该 Storylet 的角色 ID */
  triggeringRoleId: string;
  /** 触发者公开名称 */
  triggeringRoleName: string;
  /** 触发者头衔 */
  triggeringRoleTitle: string;
  /** 触发者所属组织 */
  triggeringRoleOrg: string;
  /** 事件发生的当前地点 */
  triggeringLocation: string;
}

// ── 跑团核心机制 相关类型 ──

/** 六属性标识 */
export type Attribute = "aura" | "insight" | "will" | "physique" | "cunning" | "lore";

/** 五档检定结果 */
export type DiceResultTier = "revelation" | "success" | "partial" | "failure" | "catastrophe";

/** 角色六维属性值 */
export interface CharacterAttributes {
  aura: number;
  insight: number;
  will: number;
  physique: number;
  cunning: number;
  lore: number;
}

/** 角色专长——特定情境下改变检定规则的被动/主动能力 */
export interface CharacterSpecialty {
  id: string;
  name: string;
  description: string;
  triggerHint?: string;
}

/** 检定配置——嵌入在 Storylet 中，定义该事件触发检定的参数 */
export interface CheckConfig {
  /** 检定使用的属性 */
  attribute: Attribute;
  /** 基础难度（不含环境修正） */
  baseDifficulty: number;
  /** 是否允许合作 */
  coopAllowed: boolean;
  /** 可辅助的属性列表 */
  assistAttributes?: Attribute[];
}

/** 五档结果文本变体 */
export interface StoryletResults {
  revelation?: string;
  success?: string;
  partial?: string;
  failure?: string;
  catastrophe?: string;
}

/** 检定结算结果 */
export interface CheckOutcome {
  tier: DiceResultTier;
  d20Roll: number;
  finalResult: number;
  difficulty: number;
  resolvedText: string;
  cluesGained: number;
  corruptionDelta: number;
  spiritCost: number;
  triggerEventId?: string;
}

// ── 调查引擎 核心状态类型 ──

/** 调查行动类别 */
export type ActionCategory =
  | "investigate"
  | "contact"
  | "suppress"
  | "conceal"
  | "purify"
  | "dispatch"
  | "artifact";

/** 玩家提交的调查行动 */
export interface PlayerAction {
  playerId: string;
  cardId: string;
  /** 调查目标——地点/证物/NPC */
  targetId: string;
  /** 从卡牌类别推断的行动类别 */
  category: ActionCategory;
  /** 使用的检定属性 */
  attribute: Attribute;
}

/** 讨论阶段的投票 */
export interface PlayerVote {
  playerId: string;
  /** 投票方向——"advance"推进 / "hold"暂缓 / targetPlayerId 针对某玩家 */
  vote: "advance" | "hold" | string;
}

/** 单局调查中一名玩家的完整状态 */
export interface InvestigatorState {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  /** v2 角色 ID */
  roleId: string;
  /** 角色公开名 */
  roleName: string;
  /** 角色头衔 */
  roleTitle: string;
  /** 所属组织 */
  roleOrg: string;
  /** 六属性 */
  attributes: CharacterAttributes;
  /** 当前手牌 */
  hand: InvestigationCardSeed[];
  /** 当前灵性 */
  spirituality: number;
  /** 最大灵性 */
  maxSpirituality: number;
  /** 当前污染 */
  corruption: number;
  /** 持有的私密线索 ID 列表 */
  privateClueIds: string[];
  /** 私密线索的叙事文本（仅对持有者可见） */
  privateClueTexts: Array<{ id: string; title: string; text: string }>;
  /** 已完成的个人议程 */
  agendaCompleted: boolean;
  /** 本轮是否已提交行动 */
  hasActed: boolean;
  /** P0 开场感知文本（基于角色最高属性生成） */
  firstLook?: string;
  /** 最近一次行动的结果（仅对本人可见，用于前端弹窗） */
  lastOutcome?: ActionOutcome | null;
  /** 个人议程目标文本（P0展示，P6结算） */
  agendaGoal?: string;
}

/** 一局调查的完整游戏状态 */
export interface InvestigationGameState {
  roomCode: string;
  phase: PhaseHint;
  pressureTier: number;
  round: number;
  activePlayerId: string | null;
  players: InvestigatorState[];
  /** 已公开的线索 ID（所有玩家可见） */
  publicClueIds: string[];
  /** 当前讨论议题 */
  discussionTopic: string | null;
  /** 待处理的行动 */
  pendingActions: PlayerAction[];
  /** 待处理的投票 */
  pendingVotes: PlayerVote[];
  /** 已准备玩家 */
  readyPlayers: string[];
  /** 游戏日志 */
  logs: Array<{ id: string; round: number; phase: PhaseHint; text: string }>;
  /** 收束路径 */
  resolutionPath: "perfect" | "compromise" | "collapse" | null;
  /** 已分发的 Storylet ID（避免重复） */
  dispatchedStoryletIds: string[];
  /** 黄金路径管理器（非序列化） */
  goldenPath?: unknown;
  /** v2 游戏状态字典（非序列化） */
  gameState?: unknown;
  /** 本轮各调查地点的行动者列表（用于合作检测） */
  roundLocations: Record<string, string[]>;
}

/** 行动执行结果 */
export interface ActionOutcome {
  playerId: string;
  checkOutcome: CheckOutcome;
  storyletId: string;
  storyletTitle: string;
  /** 公共可见的掷骰摘要 */
  publicRollSummary: string;
  /** 仅行动者可见的完整文本 */
  privateNarrative: string;
  /** 新发现的公共线索 ID */
  newPublicClueIds: string[];
  /** 新发现的私密线索 */
  newPrivateClue: string | null;
  /** 触发的 Storylet 异常事件 */
  triggeredEventId?: string;
}
