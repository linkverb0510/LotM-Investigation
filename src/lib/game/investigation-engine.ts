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
      privateClueTexts: [],
      agendaCompleted: false,
      hasActed: false,
      firstLook: generateFirstLook(role.id),
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
      player.privateClueTexts = [
        ...player.privateClueTexts,
        { id: storylet.id, title: storylet.title, text: resolvedText },
      ];
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
  players[playerIdx] = { ...player, lastOutcome: outcome }; // 存储结果供前端弹窗

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
      // 破冰讨论提示
      if (newPhase === "discussion_1") {
        next.discussionTopic = "各位已完成了第一轮调查。你注意到的异常值得向其他人说明——或许他们看见了你不曾看见的东西。";
        next.logs = [
          ...next.logs,
          { id: uid(), round: next.round, phase: newPhase, text: "💬【讨论开始】分享你的发现，比较彼此看到的不同——真相可能存在于碎片之间。" },
        ];
      }
      if (newPhase === "discussion_2") {
        next.discussionTopic = "局势正在恶化。基于目前的全部发现，决定——谁最适合执行最终处置？";
      }
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
  state: InvestigationGameState,
  choice?: "seal" | "reveal" | "compromise"
): InvestigationGameState {
  let path: "perfect" | "compromise" | "collapse" = "compromise";

  // 玩家有选择时，以选择为准
  if (choice === "seal") path = "perfect";
  else if (choice === "reveal") path = "perfect";
  else if (choice === "compromise") path = "compromise";
  else {
    // 无选择时按进度自动判定
    const internals = getInternals(state);
    const progress = internals.goldenPath.getProgress();
    if (progress && progress.overallProgress >= 70 && progress.truthNodeConnections >= 20) {
      path = "perfect";
    } else if (progress && progress.overallProgress >= 50) {
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
      hasActed: p.hasActed,
      // 灵性/污染/手牌数 仅对自己可见（serializePlayerState）
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
    privateClueTexts: player?.privateClueTexts ?? [],
    roleId: player?.roleId ?? "",
    attributes: player?.attributes ?? null,
    spirituality: player?.spirituality ?? 0,
    maxSpirituality: player?.maxSpirituality ?? 0,
    corruption: player?.corruption ?? 0,
    agendaCompleted: player?.agendaCompleted ?? false,
    firstLook: player?.firstLook ?? "",
    lastOutcome: player?.lastOutcome ?? null,
  };
}

// ══════════════════════════════════════════════════
//  P0 开场感知
// ══════════════════════════════════════════════════

/** 为每个角色生成开场「第一眼」文本（基于最高属性） */
function generateFirstLook(roleId: string): string {
  const lookMap: Record<string, string> = {
    "role-01-edwin":
      "你在教堂街口停下了脚步。不是因为看见了什么——是因为一种你太熟悉的沉默。三年前那座教堂在封井之后的夜晚，也是这种沉默。你的指尖在本能地摩挲着怀表的边缘。你知道那种感觉：有什么东西在下面，不是死了，只是等了太久。",
    "role-02-lyle":
      "你比其他人晚到了几分钟——是你故意安排的。你在街对面的阴影里站了一会儿，观察着门口聚集的人群。两个值夜者，一个代罚者，一张贵族面孔，还有那个你在地下聚会上见过一次的巫师。没人注意到你。你注意到了两件事：门口的石阶上有不易察觉的新鲜划痕，和空气里有一股只有你闻得到的烧焦纸页的气味。",
    "role-03-austen":
      "你的航海家直觉在你踏进东区的那一刻就开始响个不停。不是暴风雨前的那种压迫——是更糟的一种。是船在深夜航行时，海面平静得像镜子，但所有的鱼都在往深水里逃的那种感觉。你下意识地确认了一下风暴教会徽记的位置。那不是怕——那是准备。",
    "role-04-cecilia":
      "你在来这里的马车上翻了一遍那份精神援助评估报告。八个证人的情绪描述。七个的用词几乎可以互换。不是相似——是复制。真正的恐惧不会这么整齐。你的观众途径让你的手指在纸面上多停了一秒——不是因为你看出了什么，是因为你怀疑自己在害怕看出什么。",
    "role-05-devlin":
      "你比别人更早感觉到地下室的存在——不是通过灵界视野，而是通过一阵不应该存在的寒意。通灵者的直觉让你在踏进东区的时候就意识到：今晚的死者不止那些被报告上去的。有什么东西在灵界中留下了声音，不是残响，是等待。",
    "role-06-elias":
      "你在翻阅案卷的第一页就看到了那段祷文。不是因为它完整——是因为它不完整。有人在拷贝的时候刻意删掉了一些词句，但保留的部分中有一个赫密斯语的倒装结构，而那种倒装只出现在第四纪仪式文本中。你不需要翻译它。你需要决定什么时候告诉别人你知道它意味着什么。",
  };
  return lookMap[roleId] ?? "你被召集到东区，参与一场异常死亡案的调查。空气中弥漫着大雾霾的残余——和一种你无法命名的紧张。";
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
