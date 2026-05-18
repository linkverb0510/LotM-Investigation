import type {
  InvestigationGameState,
  InvestigatorState,
  PlayerAction,
  PlayerVote,
  ActionOutcome,
  CheckOutcome,
  PhaseHint,
  Attribute,
} from "./investigation-v2/schema";
import type { InvestigationStoryletSeed } from "./investigation-v2/schema";
import { investigationV2Roles } from "./investigation-v2/roles";
import { investigationV2StoryletSeeds } from "./investigation-v2/storylets";
import { CHARACTER_ATTRIBUTES, getSpecialties } from "./investigation-v2/attributes";
import { resolveCheck, calcDifficulty, formatCheckLog } from "./investigation-v2/dice";
import { GoldenPath, createDefaultGoldenPath } from "./investigation-v2/golden-path";
import { GameState } from "./investigation-v2/game-state";

// ── 内部运行时状态（引擎私有，不对前端序列化） ──

interface EngineInternals {
  goldenPath: GoldenPath;
  gameState: GameState;
}

const internalsMap = new WeakMap<InvestigationGameState, EngineInternals>();

function getInternals(state: InvestigationGameState): EngineInternals {
  if (!internalsMap.has(state)) {
    throw new Error("Engine internals not initialized");
  }
  return internalsMap.get(state)!;
}
import { InvestigationBridge } from "./investigation-v2/bridge";

// ── 卡牌类别 → 行动类别 + 属性映射 ──

const CATEGORY_TO_ACTION: Record<string, string> = {
  "搜证": "investigate",
  "搜证/调度": "investigate",
  "搜证/接触": "investigate",
  "调度/搜证": "investigate",
  "净化": "purify",
  "封印物": "artifact",
  "封印物/净化": "artifact",
  "压制": "suppress",
  "接触/机动": "contact",
  "反制/掩饰": "conceal",
  "保命/伪装": "conceal",
  "调度": "dispatch",
  "调度/掩饰": "dispatch",
  "讨论/接触": "contact",
};

const CATEGORY_TO_ATTRIBUTE: Record<string, string> = {
  "搜证": "insight",
  "搜证/调度": "insight",
  "搜证/接触": "insight",
  "调度/搜证": "insight",
  "净化": "will",
  "封印物": "aura",
  "封印物/净化": "aura",
  "压制": "physique",
  "接触/机动": "aura",
  "反制/掩饰": "cunning",
  "保命/伪装": "cunning",
  "调度": "lore",
  "调度/掩饰": "lore",
  "讨论/接触": "insight",
};

function mapCategory(category: string): { action: string; attribute: Attribute } {
  return {
    action: CATEGORY_TO_ACTION[category] || "investigate",
    attribute: (CATEGORY_TO_ATTRIBUTE[category] || "insight") as Attribute,
  };
}

// ── 辅助 ──

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ══════════════════════════════════════════════════
//  初始化
// ══════════════════════════════════════════════════

export function createInvestigationGame(
  roomCode: string,
  players: Array<{ id: string; name: string; isHost: boolean }>
): InvestigationGameState {
  // 洗牌角色
  const shuffled = [...investigationV2Roles].sort(() => Math.random() - 0.5);
  const playerStates: InvestigatorState[] = players.map((p, i) => {
    const role = shuffled[i % shuffled.length];
    const attrs = { ...CHARACTER_ATTRIBUTES[role.id] };
    const cards = [...role.signatureCards];

    return {
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isConnected: true,
      roleId: role.id,
      roleName: role.publicName,
      roleTitle: role.title,
      roleOrg: role.organization,
      attributes: attrs,
      hand: cards,
      spirituality: role.startStats.maxSpirituality,
      maxSpirituality: role.startStats.maxSpirituality,
      corruption: role.startStats.startCorruption,
      privateClueIds: [],
      agendaCompleted: false,
      hasActed: false,
    };
  });

  const goldenPath = createDefaultGoldenPath("case-east-district", {});
  const gameState = new GameState();
  goldenPath.attachToGameState(gameState);

  const state: InvestigationGameState = {
    roomCode,
    phase: "briefing",
    pressureTier: 0,
    round: 0,
    activePlayerId: null,
    players: playerStates,
    publicClueIds: [],
    discussionTopic: null,
    pendingActions: [],
    pendingVotes: [],
    readyPlayers: [],
    logs: [...],
    resolutionPath: null,
    dispatchedStoryletIds: [],
  };

  internalsMap.set(state, { goldenPath, gameState });
  return state;
}

// ══════════════════════════════════════════════════
//  P0 — 准备就绪
// ══════════════════════════════════════════════════

export function confirmReady(
  state: InvestigationGameState,
  playerId: string
): InvestigationGameState {
  if (state.readyPlayers.includes(playerId)) return state;

  const next = { ...state, readyPlayers: [...state.readyPlayers, playerId] };
  const p = next.players.find((pl) => pl.id === playerId);

  if (next.readyPlayers.length === next.players.length) {
    next.phase = "investigation_up";
    next.round = 1;
    next.activePlayerId = next.players[0]?.id ?? null;
    next.logs = [
      ...next.logs,
      { id: uid(), round: 1, phase: "investigation_up", text: "全员准备就绪，调查开始。" },
    ];
  }

  return next;
}

// ══════════════════════════════════════════════════
//  P1 / P3 — 调查行动
// ══════════════════════════════════════════════════

export function executePlayerAction(
  state: InvestigationGameState,
  action: PlayerAction
): { state: InvestigationGameState; outcome: ActionOutcome | null } {
  const playerIdx = state.players.findIndex((p) => p.id === action.playerId);
  if (playerIdx === -1) return { state, outcome: null };

  const player = { ...state.players[playerIdx] };
  const card = player.hand.find((c) => c.id === action.cardId);
  if (!card) return { state, outcome: null };

  // 灵性检查
  const costNum = parseInt(card.costText) || 1;
  if (player.spirituality < costNum) return { state, outcome: null };

  const { attribute } = mapCategory(card.category);

  // 查找匹配 Storylet
  const storylet = findMatchingStorylet(state, player.roleId, attribute, action.targetId);

  // 计算难度
  const difficulty = calcDifficulty(storylet?.check?.baseDifficulty ?? 12, {
    pressureTier: state.pressureTier,
    characterCorruption: player.corruption,
    priorSuccess: storylet
      ? state.players.some(
          (op) => op.id !== player.id && op.privateClueIds.includes(storylet.id)
        )
      : false,
  });

  // 掷骰
  const checkOutcome = resolveCheck(
    {
      attribute,
      baseDifficulty: difficulty,
      coopAllowed: storylet?.check?.coopAllowed ?? false,
      assistAttributes: storylet?.check?.assistAttributes as Attribute[] | undefined,
    },
    player.roleId,
    { pressureTier: state.pressureTier, characterCorruption: player.corruption }
  );

  // 修正难度为实际计算值
  checkOutcome.difficulty = difficulty;

  // 选择结果文本
  const resolvedText = pickResultText(storylet, checkOutcome);

  // 更新玩家状态
  player.spirituality -= checkOutcome.spiritCost;
  player.corruption = Math.min(10, player.corruption + checkOutcome.corruptionDelta);
  player.hand = player.hand.filter((c) => c.id !== action.cardId);
  player.hasActed = true;

  // 线索处理
  const newPublicClueIds: string[] = [];
  let newPrivateClue: string | null = null;
  const dispatched = [...state.dispatchedStoryletIds];

  if (storylet) {
    const clueId = `clue_${storylet.id}`;
    dispatched.push(storylet.id);

    if (storylet.scope === "public" && checkOutcome.tier !== "catastrophe") {
      newPublicClueIds.push(clueId);
    } else if (storylet.scope === "private") {
      newPrivateClue = resolvedText;
      player.privateClueIds = [...player.privateClueIds, storylet.id];
    }
  }

  // 更新 gameState
  const internals = getInternals(state);
  if (newPublicClueIds.length > 0) {
    internals.gameState.markClueFound(newPublicClueIds[0]);
  }

  const rollSummary = formatCheckLog(
    { ...checkOutcome, difficulty },
    { attribute, baseDifficulty: difficulty, coopAllowed: false },
    player.roleName
  );

  const outcome: ActionOutcome = {
    playerId: player.id,
    checkOutcome: { ...checkOutcome, resolvedText },
    storyletId: storylet?.id ?? "",
    storyletTitle: storylet?.title ?? "常规调查",
    publicRollSummary: rollSummary,
    privateNarrative: resolvedText,
    newPublicClueIds,
    newPrivateClue,
    triggeredEventId: checkOutcome.triggerEventId,
  };

  const players = [...state.players];
  players[playerIdx] = player;

  const nextState: InvestigationGameState = {
    ...state,
    players,
    publicClueIds: [...state.publicClueIds, ...newPublicClueIds],
    pendingActions: [...state.pendingActions, action],
    logs: [
      ...state.logs,
      { id: uid(), round: state.round, phase: state.phase, text: rollSummary },
      ...(newPublicClueIds.length > 0
        ? [
            {
              id: uid(),
              round: state.round,
              phase: state.phase,
              text: `📜【${storylet?.title ?? "发现"}】${resolvedText}`,
            },
          ]
        : []),
    ],
    dispatchedStoryletIds: state.dispatchedStoryletIds,
  };

  return { state: nextState, outcome };
}

// ══════════════════════════════════════════════════
//  回合结算
// ══════════════════════════════════════════════════

export function resolveActionRound(
  state: InvestigationGameState
): InvestigationGameState {
  let next = { ...state, pendingActions: [] };

  // 重置 hasActed
  next.players = next.players.map((p) => ({ ...p, hasActed: false }));

  // 压力演进
  next.pressureTier = Math.min(5, next.pressureTier + 1);

  // 检查阶段推进
  const internals = getInternals(state);
  internals.goldenPath.tickAnomaly(2);
  if (internals.goldenPath.canAdvancePhase()) {
    const newPhase = internals.goldenPath.advancePhase();
    if (newPhase) {
      next.phase = newPhase;
      next.logs = [
        ...next.logs,
        { id: uid(), round: next.round, phase: newPhase, text: `【阶段推进】进入 ${newPhase}` },
      ];
    }
  }

  // 保留 internals 映射
  internalsMap.set(next, internals);

  return next;
}

// ══════════════════════════════════════════════════
//  P2 / P4 — 讨论投票
// ══════════════════════════════════════════════════

export function submitVote(
  state: InvestigationGameState,
  vote: PlayerVote
): InvestigationGameState {
  if (state.pendingVotes.some((v) => v.playerId === vote.playerId)) return state;

  const next = {
    ...state,
    pendingVotes: [...state.pendingVotes, vote],
  };

  if (next.pendingVotes.length === next.players.length) {
    // 讨论结束 → 推进阶段
    if (state.phase === "discussion_1") {
      next.phase = "investigation_down";
      next.round += 1;
      next.pendingVotes = [];
    } else if (state.phase === "discussion_2") {
      next.phase = "resolution";
      next.pendingVotes = [];
    }
  }

  return next;
}

// ══════════════════════════════════════════════════
//  P5 — 收束结局
// ══════════════════════════════════════════════════

export function resolveEnding(
  state: InvestigationGameState
): InvestigationGameState {
  let path: "perfect" | "compromise" | "collapse" = "compromise";

  const internals = getInternals(state);
  const progress = internals.goldenPath.getProgress();
  if (progress) {
    if (progress.overallProgress >= 70 && progress.truthNodeConnections >= 20) {
      path = "perfect";
    } else if (progress.overallProgress >= 50) {
      path = "compromise";
    } else {
      path = "collapse";
    }
  }

  let endLogText = "";
  switch (path) {
    case "perfect":
      endLogText = "石碑被重新封印，旧案报告重见天日。真相抵达了该抵达的人。";
      break;
    case "compromise":
      endLogText =
        "事情被压住了，名字被保住了，街区暂时安静了下来。但你们都知道，还有什么东西停在封签后面。";
      break;
    case "collapse":
      endLogText = "崩坏不是结束，而是那句低语变得更安静、更广泛、更不肯离开的开始。";
      break;
  }

  return {
    ...state,
    phase: "resolution",
    resolutionPath: path,
    logs: [
      ...state.logs,
      { id: uid(), round: state.round, phase: "resolution", text: `【结局】${endLogText}` },
    ],
  };
}

// ══════════════════════════════════════════════════
//  卡牌适配（InvestigationCardSeed → 前端兼容格式）
// ══════════════════════════════════════════════════

/** 前端兼容的简化卡牌格式 */
export interface FrontendCard {
  id: string;
  name: string;
  type: "info" | "utility" | "ritual";
  effect: string;
  cost: { spirituality: number };
  description: string;
  rarity: string;
}

function adaptCard(card: InvestigationCardSeed): FrontendCard {
  const costNum = parseInt(card.costText) || 1;
  return {
    id: card.id,
    name: card.name,
    type: card.category.includes("净化") ? "ritual" as const : "info" as const,
    effect: "gain_clue",
    cost: { spirituality: costNum },
    description: card.rulesText,
    rarity: "common",
  };
}

// ══════════════════════════════════════════════════
//  状态序列化
// ══════════════════════════════════════════════════

export function serializePublicState(state: InvestigationGameState) {
  return {
    roomCode: state.roomCode,
    phase: state.phase,
    pressureTier: state.pressureTier,
    round: state.round,
    activePlayerId: state.activePlayerId,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isConnected: p.isConnected,
      roleName: p.roleName,
      roleTitle: p.roleTitle,
      roleOrg: p.roleOrg,
      spirituality: p.spirituality,
      maxSpirituality: p.maxSpirituality,
      corruption: p.corruption,
      handCount: p.hand.length,
      hasActed: p.hasActed,
    })),
    publicClueIds: state.publicClueIds,
    discussionTopic: state.discussionTopic,
    readyPlayers: state.readyPlayers,
    logs: state.logs,
    resolutionPath: state.resolutionPath,
  };
}

export function serializePlayerState(
  state: InvestigationGameState,
  playerId: string
) {
  const player = state.players.find((p) => p.id === playerId);
  return {
    publicState: serializePublicState(state),
    privateHand: player?.hand.map(adaptCard) ?? [],
    privateClueIds: player?.privateClueIds ?? [],
    roleId: player?.roleId ?? "",
    attributes: player?.attributes ?? null,
    spirituality: player?.spirituality ?? 0,
    maxSpirituality: player?.maxSpirituality ?? 0,
    corruption: player?.corruption ?? 0,
    agendaCompleted: player?.agendaCompleted ?? false,
  };
}

// ══════════════════════════════════════════════════
//  调查目标
// ══════════════════════════════════════════════════

/** 调查目标定义 */
export interface InvestigationTarget {
  id: string;
  name: string;
  hint: string;
  /** 关联的 Storylet ID 列表（优先匹配） */
  storyletIds: string[];
}

/** 全案调查目标 */
export const INVESTIGATION_TARGETS: Record<string, InvestigationTarget> = {
  basement: {
    id: "basement",
    name: "教堂地下室",
    hint: "灰白盐痕的源头 · 石碑所在",
    storyletIds: [
      "seed-public-salt-spread",
      "seed-public-salt-expansion",
      "seed-public-artifacts-resonance",
    ],
  },
  morgue: {
    id: "morgue",
    name: "临时停尸房",
    hint: "死者的最后遗言 · 尸检记录",
    storyletIds: [
      "seed-public-missing-page",
      "seed-public-second-body",
    ],
  },
  archives: {
    id: "archives",
    name: "值夜者档案室",
    hint: "被借走三年的旧案记录",
    storyletIds: [
      "seed-public-missing-archives",
      "seed-private-edwin-griffin-record",
    ],
  },
  church_perimeter: {
    id: "church_perimeter",
    name: "教堂周边街区",
    hint: "巡夜人证词的矛盾点 · 灵性引导标记",
    storyletIds: [
      "seed-public-watchman-contradiction",
      "seed-public-charity-route",
    ],
  },
  charity_office: {
    id: "charity_office",
    name: "慈善项目办公室",
    hint: "亚瑟签名的所在 · 被安排的路线",
    storyletIds: [
      "seed-public-charity-route",
    ],
  },
  spirit_realm: {
    id: "spirit_realm",
    name: "灵界边缘",
    hint: "通灵者能听到的低语 · 不散的残响",
    storyletIds: [
      "seed-public-nightmare-wave",
    ],
  },
};

/** 获取当前阶段可用的调查目标 */
export function getAvailableTargets(phase: string): InvestigationTarget[] {
  const all = Object.values(INVESTIGATION_TARGETS);
  if (phase === "investigation_up") {
    return all.filter((t) =>
      ["basement", "morgue", "archives", "church_perimeter", "spirit_realm"].includes(t.id)
    );
  }
  if (phase === "investigation_down") {
    return all; // P3 所有目标可用
  }
  return [];
}

// ══════════════════════════════════════════════════
//  内部工具
// ══════════════════════════════════════════════════

function findMatchingStorylet(
  state: InvestigationGameState,
  roleId: string,
  attr: Attribute,
  targetId: string
): InvestigationStoryletSeed | null {
  const dispatched = new Set(state.dispatchedStoryletIds);
  const pool = investigationV2StoryletSeeds;
  const target = INVESTIGATION_TARGETS[targetId];

  // 1. 优先：该目标关联的 Storylet + 匹配 phase + 匹配属性
  if (target) {
    let candidates = pool.filter(
      (s) =>
        s.phaseHint === state.phase &&
        target.storyletIds.includes(s.id) &&
        (s.check?.attribute === attr || !s.check) &&
        !dispatched.has(s.id)
    );
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  // 2. 其次：匹配当前 phase + 带有 check 配置且属性匹配的公共 Storylet
  let candidates = pool.filter(
    (s) =>
      s.phaseHint === state.phase &&
      s.scope === "public" &&
      s.check?.attribute === attr &&
      !dispatched.has(s.id)
  );
  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // 3. 再次：匹配当前 phase 的任意公共 Storylet
  candidates = pool.filter(
    (s) =>
      s.phaseHint === state.phase &&
      s.scope === "public" &&
      !dispatched.has(s.id)
  );
  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // 4. 最后：匹配当前 phase 的该角色私密 Storylet
  candidates = pool.filter(
    (s) =>
      s.phaseHint === state.phase &&
      s.scope === "private" &&
      s.affectedRoles?.includes(roleId) &&
      !dispatched.has(s.id)
  );
  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  return null;
}

function pickResultText(
  storylet: InvestigationStoryletSeed | null,
  outcome: CheckOutcome
): string {
  if (storylet?.results) {
    const r = storylet.results;
    switch (outcome.tier) {
      case "revelation":
        return r.revelation ?? storylet.textSeed;
      case "success":
        return r.success ?? storylet.textSeed;
      case "partial":
        return r.partial ?? storylet.textSeed;
      case "failure":
        return r.failure ?? storylet.textSeed;
      case "catastrophe":
        return r.catastrophe ?? storylet.textSeed;
    }
  }
  return storylet?.textSeed ?? "你进行了一次常规调查。";
}
