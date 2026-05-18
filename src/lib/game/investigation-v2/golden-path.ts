import type {
  GoldenPathDefinition,
  PhaseAnchor,
  ProgressTracker,
  PhaseHint,
} from "./schema";
import type { GameState } from "./game-state";

// ── 默认阶段进度阈值 ──

const DEFAULT_THRESHOLDS: Record<string, { min: number; max: number }> = {
  briefing:           { min: 0,  max: 14 },
  investigation_up:   { min: 15, max: 30 },
  discussion_1:       { min: 30, max: 45 },
  investigation_down: { min: 45, max: 70 },
  discussion_2:       { min: 70, max: 85 },
  resolution:         { min: 85, max: 100 },
};

// ── 阶段顺序 ──

const PHASE_ORDER: PhaseHint[] = [
  "briefing",
  "investigation_up",
  "discussion_1",
  "investigation_down",
  "discussion_2",
  "resolution",
];

function nextPhase(current: PhaseHint): PhaseHint | null {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

/**
 * 黄金路径管理器——驱动案件叙事的骨架。
 * 订阅 gameState 变化来自动更新进度，并判断阶段是否可以推进。
 */
export class GoldenPath {
  private definition: GoldenPathDefinition;
  private progress: ProgressTracker;
  /** 已完成锚点的 ID 集合 */
  private completedAnchors: Set<string>;
  /** 当前阶段 */
  currentPhase: PhaseHint;

  constructor(definition: GoldenPathDefinition) {
    this.definition = definition;
    this.progress = { ...definition.initialProgress };
    this.completedAnchors = new Set();
    this.currentPhase = "briefing";
  }

  // ── 进度操作 ──

  /** 线索被发现时调用 */
  addClueProgress(amount = 5): void {
    this.progress.clueDiscovery = Math.min(40, this.progress.clueDiscovery + amount);
    this.recalcOverall();
  }

  /** 讨论中真相节点被正确识别时调用 */
  addTruthProgress(amount = 10): void {
    this.progress.truthNodeConnections = Math.min(30, this.progress.truthNodeConnections + amount);
    this.recalcOverall();
  }

  /** 集体决策完成时调用 */
  addDecisionProgress(amount = 10): void {
    this.progress.decisionCompletion = Math.min(20, this.progress.decisionCompletion + amount);
    this.recalcOverall();
  }

  /** 每个行动回合自动增长的异常演进 */
  tickAnomaly(amount = 2): void {
    this.progress.anomalyEscalation = Math.min(10, this.progress.anomalyEscalation + amount);
    this.recalcOverall();
  }

  /** 获取当前综合进度 */
  getProgress(): ProgressTracker {
    return { ...this.progress };
  }

  /** 获取当前进度百分比 */
  getOverallProgress(): number {
    return this.progress.overallProgress;
  }

  // ── 锚点操作 ──

  /** 标记指定锚点已完成 */
  markAnchorComplete(anchorId: string): void {
    this.completedAnchors.add(anchorId);
  }

  /** 检查指定锚点是否已完成 */
  isAnchorComplete(anchorId: string): boolean {
    return this.completedAnchors.has(anchorId);
  }

  /** 获取当前阶段已完成的锚点数量 */
  completedAnchorCount(): number {
    const anchors = this.definition.phaseAnchors[this.currentPhase] ?? [];
    return anchors.filter((a) => this.completedAnchors.has(a.anchorId)).length;
  }

  /** 获取当前阶段还需要完成的锚点数量 */
  remainingAnchorCount(): number {
    const anchors = this.definition.phaseAnchors[this.currentPhase] ?? [];
    if (anchors.length === 0) return 0;
    const totalRequired = anchors[0].requiredCount;
    return Math.max(0, totalRequired - this.completedAnchorCount());
  }

  // ── 阶段推进判定 ──

  /**
   * 判断当前阶段是否可以推进到下一阶段。
   * 条件：①锚点已完成 ②进度达标
   */
  canAdvancePhase(): boolean {
    const thresholds = this.definition.progressThresholds[this.currentPhase];
    if (!thresholds) return false;

    // 进度是否达标
    const progressOk = this.progress.overallProgress >= thresholds.min;

    // 锚点是否达标
    const anchors = this.definition.phaseAnchors[this.currentPhase] ?? [];
    if (anchors.length === 0) return progressOk;

    const required = anchors[0].requiredCount;
    const completedCount = anchors.filter((a) => this.completedAnchors.has(a.anchorId)).length;
    const anchorsOk = completedCount >= required;

    return progressOk && anchorsOk;
  }

  /**
   * 执行阶段推进。返回新阶段（若有），null 表示无法推进。
   */
  advancePhase(): PhaseHint | null {
    if (!this.canAdvancePhase()) return null;

    const next = nextPhase(this.currentPhase);
    if (!next) return null;

    this.currentPhase = next;

    // 更新进度阈值
    const nextThresholds = this.definition.progressThresholds[next];
    if (nextThresholds) {
      this.progress.currentPhaseThreshold = nextThresholds.min;
      this.progress.nextPhaseThreshold = nextThresholds.max;
    }

    return next;
  }

  // ── 保底注入 ──

  /**
   * 获取需要在当前回合通过保底通路注入的锚点。
   * @param currentTurn 当前阶段内的行动回合数（从1开始）
   * @returns 需要保底注入的锚点列表
   */
  getFallbackAnchors(currentTurn: number): PhaseAnchor[] {
    const anchors = this.definition.phaseAnchors[this.currentPhase] ?? [];
    return anchors.filter(
      (a) => !this.completedAnchors.has(a.anchorId) && currentTurn >= a.fallbackTurn
    );
  }

  // ── 订阅游戏状态 ──

  /** 将 golden-path 挂载到 gameState，监听状态变化来自动更新进度 */
  attachToGameState(gameState: GameState): void {
    gameState.onChange((key, _value) => {
      // 线索发现 → 自动增加线索进度
      if (typeof key === "string" && key.startsWith("clue_") && gameState.isFlagged(key)) {
        this.addClueProgress(5);
      }
      // 真相连接 → 自动增加真相进度
      if (key === "truthConnectionCount") {
        this.addTruthProgress(10);
      }
    });
  }

  // ── 内部方法 ──

  private recalcOverall(): void {
    this.progress.overallProgress =
      this.progress.clueDiscovery +
      this.progress.truthNodeConnections +
      this.progress.decisionCompletion +
      this.progress.anomalyEscalation;
  }
}

// ── 工厂函数 ──

/**
 * 为东区案创建默认黄金路径实例。
 * 由外部调用者传入具体锚点定义（锚点定义在 storylets 层，与案件绑定）。
 */
export function createDefaultGoldenPath(
  caseId: string,
  phaseAnchors: Record<string, PhaseAnchor[]>,
  overrides?: Partial<ProgressTracker>
): GoldenPath {
  const definition: GoldenPathDefinition = {
    caseId,
    phaseAnchors,
    progressThresholds: { ...DEFAULT_THRESHOLDS },
    initialProgress: {
      overallProgress: 0,
      clueDiscovery: 0,
      truthNodeConnections: 0,
      decisionCompletion: 0,
      anomalyEscalation: 0,
      currentPhaseThreshold: 0,
      nextPhaseThreshold: 15,
      ...overrides,
    },
  };
  return new GoldenPath(definition);
}
