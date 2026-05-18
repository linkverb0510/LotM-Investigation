import type { GamePhase } from "../types";
import type { PhaseHint, InvestigationStoryletSeed, TriggerContext } from "./schema";
import { GoldenPath, createDefaultGoldenPath } from "./golden-path";
import { GameState } from "./game-state";
import { resolveText } from "./text-resolver";
import { investigationV2StoryletSeeds } from "./storylets";

// ── Phase 双向映射 ──

/** GamePhase → PhaseHint（引擎阶段 → v2 阶段） */
const ENGINE_TO_V2: Partial<Record<GamePhase, PhaseHint>> = {
  briefing: "briefing",
  investigation_up: "investigation_up",
  discussion_1: "discussion_1",
  investigation_down: "investigation_down",
  discussion_2: "discussion_2",
  showdown: "resolution",
};

/** PhaseHint → GamePhase（v2 阶段 → 引擎阶段） */
const V2_TO_ENGINE: Record<PhaseHint, GamePhase> = {
  briefing: "briefing",
  investigation_up: "investigation_up",
  discussion_1: "discussion_1",
  investigation_down: "investigation_down",
  discussion_2: "discussion_2",
  resolution: "showdown",
};

// ── 角色 ID → 角色信息（供 TriggerContext 使用） ──

/** 角色 ID 到公开信息的映射（由外部初始化时注入） */
interface RoleInfo {
  id: string;
  name: string;
  title: string;
  org: string;
}

// ── 桥接类 ──

/**
 * 调查桥接器——在现有引擎和 v2 叙事系统之间建立连接。
 * 
 * 职责：
 * 1. 维护 GoldenPath（阶段锚点 + 调查进度）
 * 2. 维护 GameState（v2 状态字典）
 * 3. 在引擎阶段切换时检查锚点、注入 Storylet
 * 4. 对 Storylet 文本进行占位符解析
 */
export class InvestigationBridge {
  goldenPath: GoldenPath;
  gameState: GameState;
  private storyletPool: InvestigationStoryletSeed[];
  private roleInfoMap: Map<string, RoleInfo>;
  /** 已被分发过的 Storylet ID 集合（避免重复） */
  private dispatchedIds: Set<string>;

  constructor(caseId: string, roleInfos: RoleInfo[]) {
    // 初始化 v2 游戏状态
    this.gameState = new GameState();
    
    // 初始化角色信息映射
    this.roleInfoMap = new Map();
    for (const ri of roleInfos) {
      this.roleInfoMap.set(ri.id, ri);
    }

    // 初始化黄金路径（锚点定义为空——由具体案件配置注入）
    this.goldenPath = createDefaultGoldenPath(caseId, {});
    
    // 挂载状态监听：线索发现自动推动进度
    this.goldenPath.attachToGameState(this.gameState);

    // Storylet 池（全部 36 条）
    this.storyletPool = [...investigationV2StoryletSeeds];
    this.dispatchedIds = new Set();
  }

  // ── Phase 工具方法 ──

  /** 将引擎阶段转换为 v2 阶段 */
  engineToV2(enginePhase: GamePhase): PhaseHint | null {
    return ENGINE_TO_V2[enginePhase] ?? null;
  }

  /** 将 v2 阶段转换为引擎阶段 */
  v2ToEngine(v2Phase: PhaseHint): GamePhase {
    return V2_TO_ENGINE[v2Phase];
  }

  // ── Phase 切换钩子 ──

  /**
   * 引擎阶段切换时调用。
   * @param fromPhase 切换前的引擎阶段
   * @param toPhase 切换后的引擎阶段
   * @param currentRound 当前行动回合数
   * @returns 本次切换需要注入的 Storylet 列表
   */
  onPhaseTransition(
    fromPhase: GamePhase,
    toPhase: GamePhase,
    currentRound: number
  ): InvestigationStoryletSeed[] {
    const v2Phase = this.engineToV2(toPhase);
    if (!v2Phase) return [];

    // 更新进度中的阶段阈值
    this.updateProgressForPhase(v2Phase);

    // 检查是否需要保底注入
    const fallbackAnchors = this.goldenPath.getFallbackAnchors(currentRound);
    
    // 收集匹配当前阶段的 Storylet
    const candidates = this.storyletPool.filter((s) => {
      if (this.dispatchedIds.has(s.id)) return false;
      return s.phaseHint === v2Phase;
    });

    const results: InvestigationStoryletSeed[] = [];

    // 优先处理锚点相关的 Storylet
    for (const anchor of fallbackAnchors) {
      const storylet = candidates.find((s) =>
        anchor.targetStoryletIds.includes(s.id)
      );
      if (storylet) {
        results.push(storylet);
        this.goldenPath.markAnchorComplete(anchor.anchorId);
        this.dispatchedIds.add(storylet.id);
      }
    }

    // 如果锚点已满足，分发该阶段的公共 Storylet
    if (this.goldenPath.canAdvancePhase() || results.length === 0) {
      const publicCandidates = candidates.filter(
        (s) => s.scope === "public" && !this.dispatchedIds.has(s.id)
      );
      // 每阶段最多分发 2 条公共事件
      const selected = publicCandidates.slice(0, 2);
      for (const s of selected) {
        results.push(s);
        this.dispatchedIds.add(s.id);
        // 如果该 Storylet 关联了真相条目，标记线索发现
        if (s.relatedTruthMapIds && s.relatedTruthMapIds.length > 0) {
          this.gameState.markClueFound(s.id);
        }
      }
    }

    return results;
  }

  // ── 私密事件分发 ──

  /**
   * 获取指定角色的待分发私密 Storylet。
   * @param roleId 角色 ID（如 "role-01-edwin"）
   * @param phase 当前引擎阶段
   * @returns 该角色在当前阶段应看到的私密事件列表
   */
  getPrivateStorylets(roleId: string, phase: GamePhase): InvestigationStoryletSeed[] {
    const v2Phase = this.engineToV2(phase);
    if (!v2Phase) return [];

    return this.storyletPool.filter(
      (s) =>
        s.scope === "private" &&
        s.phaseHint === v2Phase &&
        !this.dispatchedIds.has(s.id) &&
        s.affectedRoles?.includes(roleId)
    );
  }

  /** 标记一条私密 Storylet 已分发 */
  markPrivateDispatched(storyletId: string): void {
    this.dispatchedIds.add(storyletId);
  }

  // ── 文本解析 ──

  /**
   * 为指定角色解析一条 Storylet 的 textSeed。
   * 根据角色信息和当前游戏状态替换占位符和条件块。
   */
  resolveTextForRole(
    storylet: InvestigationStoryletSeed,
    roleId: string
  ): string {
    const ri = this.roleInfoMap.get(roleId);
    const ctx: TriggerContext = {
      triggeringRoleId: roleId,
      triggeringRoleName: ri?.name ?? "调查员",
      triggeringRoleTitle: ri?.title ?? "值夜者",
      triggeringRoleOrg: ri?.org ?? "黑夜女神教会",
      triggeringLocation: "东区桥区",
    };
    return resolveText(storylet.textSeed, this.gameState, ctx);
  }

  // ── 进度操作 ──

  /** 行动回合推进时调用（触发异常演进） */
  tickRound(): void {
    this.goldenPath.tickAnomaly(2);
    this.gameState.increment("hoursElapsed");
    // 每推进 4 小时盐痕扩散一些
    const hours = this.gameState.get("hoursElapsed") as number;
    if (hours % 4 === 0) {
      this.gameState.setSaltSpread(Math.floor(hours / 4) * 3);
    }
  }

  /** 讨论阶段完成集体决策时调用 */
  completeDiscussion(): void {
    this.goldenPath.addDecisionProgress(10);
  }

  /** 获取当前综合进度（调试用） */
  getProgressSummary(): string {
    const p = this.goldenPath.getProgress();
    return [
      `综合: ${p.overallProgress}%`,
      `线索: ${p.clueDiscovery}/40`,
      `真相: ${p.truthNodeConnections}/30`,
      `决策: ${p.decisionCompletion}/20`,
      `异常: ${p.anomalyEscalation}/10`,
      `阶段: ${this.goldenPath.currentPhase}`,
      `锚点完成: ${this.goldenPath.completedAnchorCount()}/${this.goldenPath.remainingAnchorCount() + this.goldenPath.completedAnchorCount()}`,
    ].join(" | ");
  }

  // ── 调试命令 ──

  /** 跳转到指定 v2 阶段 */
  skipToPhase(phaseHint: PhaseHint): GamePhase {
    this.goldenPath.currentPhase = phaseHint;
    // 将进度调整到该阶段的中点
    const thresholds = {
      briefing: { min: 0, max: 14 },
      investigation_up: { min: 15, max: 30 },
      discussion_1: { min: 30, max: 45 },
      investigation_down: { min: 45, max: 70 },
      discussion_2: { min: 70, max: 85 },
      resolution: { min: 85, max: 100 },
    };
    const t = thresholds[phaseHint];
    if (t) {
      const mid = Math.floor((t.min + t.max) / 2);
      this.goldenPath.addClueProgress(mid);
    }
    return this.v2ToEngine(phaseHint);
  }

  /** 手动注入指定 Storylet */
  injectStorylet(storyletId: string): InvestigationStoryletSeed | null {
    const storylet = this.storyletPool.find((s) => s.id === storyletId);
    if (storylet) {
      this.dispatchedIds.add(storyletId);
    }
    return storylet ?? null;
  }

  // ── 内部方法 ──

  private updateProgressForPhase(v2Phase: PhaseHint): void {
    // 阶段锚点自动标记当前阶段的进度基准
    switch (v2Phase) {
      case "investigation_up":
        this.gameState.set("hoursElapsed", 4);
        break;
      case "investigation_down":
        this.gameState.set("hoursElapsed", 12);
        this.gameState.setSaltSpread(6);
        break;
      case "resolution":
        this.gameState.set("hoursElapsed", 24);
        break;
    }
  }
}

// ── 工厂函数 ──

/** 为东区案件创建带默认角色信息的桥接器 */
export function createEastDistrictBridge(): InvestigationBridge {
  const roleInfos: RoleInfo[] = [
    { id: "role-01-edwin", name: "艾德温·莫里斯", title: "资深值夜者", org: "黑夜女神教会" },
    { id: "role-02-lyle", name: "莱尔·杜瓦尔", title: "灰雾魔术师", org: "不公开" },
    { id: "role-03-austen", name: "奥斯顿·雷文斯", title: "代罚者执事", org: "风暴之主教会" },
    { id: "role-04-cecilia", name: "塞西莉亚·霍尔文", title: "贵族心理医生", org: "霍尔文家族" },
    { id: "role-05-devlin", name: "戴芙琳·西蒙", title: "值夜者通灵专员", org: "黑夜女神教会" },
    { id: "role-06-elias", name: "伊莱亚斯·温特", title: "独立神秘学顾问", org: "独立研究者" },
  ];
  return new InvestigationBridge("case-east-district-prayer-stone", roleInfos);
}
