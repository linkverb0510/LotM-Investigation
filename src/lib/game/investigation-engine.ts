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

/** 创建新 state 对象时自动转移 internals 引用 */
function cloneState(
  state: InvestigationGameState,
  overrides: Partial<InvestigationGameState> = {}
): InvestigationGameState {
  const newState = { ...state, ...overrides };
  if (internalsMap.has(state)) {
    internalsMap.set(newState, internalsMap.get(state)!);
  }
  return newState;
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
      agendaGoal: CHARACTER_AGENDAS[role.id]?.goal ?? "",
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
    logs: [
      {
        id: uid(),
        round: 0,
        phase: "briefing",
        text: "贝克兰德东区·1352年秋。一周内数起异常死亡被秘密上报。调查组集结。",
      },
    ],
    resolutionPath: null,
    dispatchedStoryletIds: [],
    roundLocations: {},
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

  const next = cloneState(state, { readyPlayers: [...state.readyPlayers, playerId] });
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
  players[playerIdx] = { ...player, lastOutcome: outcome };

  // 记录本轮该地点的行动者
  const roundLocations = { ...state.roundLocations };
  if (!roundLocations[action.targetId]) roundLocations[action.targetId] = [];
  if (!roundLocations[action.targetId].includes(player.id)) {
    roundLocations[action.targetId] = [...roundLocations[action.targetId], player.id];
  }

  const nextState = cloneState(state, {
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
    roundLocations,
  });

  return { state: nextState, outcome };
}

// ══════════════════════════════════════════════════
//  回合结算
// ══════════════════════════════════════════════════

export function resolveActionRound(
  state: InvestigationGameState
): InvestigationGameState {
  let next = cloneState(state, { pendingActions: [] });

  // 重置 hasActed + 检测合作
  const coopInsights: string[] = [];
  const entries = Object.entries(state.roundLocations);
  for (const [targetId, playerIds] of entries) {
    if (playerIds.length >= 2) {
      const names = playerIds
        .map((pid) => state.players.find((p) => p.id === pid))
        .filter(Boolean)
        .map((p) => p!.roleName);
      const targetName =
        INVESTIGATION_TARGETS[targetId]?.name ?? targetId;
      coopInsights.push(
        `${names.join("和")}在【${targetName}】分别从不同角度进行了调查——他们的发现互相印证了更深层的线索。`
      );
    }
  }

  next.players = next.players.map((p) => ({ ...p, hasActed: false }));
  next.roundLocations = {}; // 重置本轮回合追踪

  if (coopInsights.length > 0) {
    next.logs = [
      ...next.logs,
      ...coopInsights.map((text) => ({
        id: uid(),
        round: next.round,
        phase: next.phase,
        text: `🤝【合作洞察】${text}`,
      })),
    ];
  }

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

  const next = cloneState(state, { pendingVotes: [...state.pendingVotes, vote] });

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

  // 结算个人议程
  const next = resolveAgendas(cloneState(state, { resolutionPath: path }), path);

  return {
    ...next,
    phase: "resolution",
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
    roundLocations: state.roundLocations,
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
    agendaGoal: player?.agendaGoal ?? "",
    agendaResult: getAgendaResult(player?.roleId ?? "", player?.agendaCompleted ?? false),
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
//  讨论途径能力
// ══════════════════════════════════════════════════

/** 讨论阶段途径能力定义 */
interface PathwayAbility {
  id: string;
  name: string;
  roleId: string;
  /** 检定属性 */
  attribute: Attribute;
  /** 目标防御属性 */
  defense: Attribute;
  /** 基础难度 */
  difficulty: number;
  /** 结果文本（五档） */
  results: Record<string, { userText: string; targetPerception: string }>;
}

const PATHWAY_ABILITIES: PathwayAbility[] = [
  {
    id: "cecilia-empathy-read",
    name: "情绪窥探",
    roleId: "role-04-cecilia",
    attribute: "insight",
    defense: "will",
    difficulty: 12,
    results: {
      revelation: {
        userText: "你看穿了对方的每一层伪装——他的镇定是反复练习的，他的回避是有具体方向的。你不仅知道他在隐藏什么，你还知道他为什么隐藏。",
        targetPerception: "你感到一股锐利的洞察从对面的心理医生身上传来——她看穿了你。不是猜测，是确认。",
      },
      success: {
        userText: "你的观众途径让你捕捉到了对方情绪中的一处断裂——他在某个问题上说了实话，但在另一个问题上收紧了所有微表情。你知道他在隐藏，但不确定具体是什么。",
        targetPerception: "心理医生的目光在你身上多停留了一秒。她的表情没有任何变化，但你的直觉告诉你——她在读你。",
      },
      partial: {
        userText: "对方的情绪结构比你预想的更复杂——你能感觉到混合着焦虑和警惕，但无法分离出具体哪一层是真实的。",
        targetPerception: "一阵轻微的不安掠过你的意识——像是有人在黑暗中触碰了你一下，但随即消失。你不确定那是什么。",
      },
      failure: {
        userText: "对方的表情控制远超你的预期——或者说，你的注意力被某种外部的灵性干扰分散了。你读不到任何有用的信息。",
        targetPerception: "",
      },
      catastrophe: {
        userText: "你读到了——但你读到的是一种不属于对方的平静。那种平静不是情绪控制，是来自外部的、像是被什么东西安抚过的「归顺」。你突然不确定那是对方的情绪还是石碑辐射对你的影响。污染+1。",
        targetPerception: "你注意到心理医生的瞳孔在短暂扩张后猛地收缩——她看到了什么。不是关于你的。是关于这个房间。",
      },
    },
  },
  {
    id: "edwin-dream-touch",
    name: "梦境触碰",
    roleId: "role-01-edwin",
    attribute: "will",
    defense: "will",
    difficulty: 14,
    results: {
      revelation: {
        userText: "你的梦魇能力在对方的意识表层捕捉到了一个反复出现的意象——不是梦，是记忆的残片。一个被反复压抑的画面：与旧教堂事件相关的某个瞬间。他不是在隐藏线索——他是在害怕自己回想起来的后果。",
        targetPerception: "你突然想起了旧教堂事件中的一个细节——不是你自己主动想的，是像被什么东西从记忆深处拽出来的。你看向艾德温——他什么都没说，但他知道。",
      },
      success: {
        userText: "你在对方意识边缘触到了一层反复按压过的痕迹——像一个被反复抚平的折角。他在刻意避开某个话题，而且避开的不是一次两次，是长期养成的习惯。",
        targetPerception: "一阵轻微的困意掠过——然后你的思绪短暂地滑到了旧教堂事件上。你立刻收紧了意识。有人在碰你的记忆。",
      },
      partial: {
        userText: "对方的意识结构比你预期的更警觉——你的触碰在接近某个关键记忆时被一层训练有素的防御弹开了。你只知道那里有东西，但不知道是什么。",
        targetPerception: "你的值夜者训练在瞬间激活了警觉——有人在试图进入你的意识。你本能地关上了门，但你不确定那个触碰来自谁。",
      },
      failure: {
        userText: "对方的意识像一面被反复擦拭过的镜子——你看不到任何残留的痕迹。不是因为干净，是因为被擦得太多次了。",
        targetPerception: "",
      },
      catastrophe: {
        userText: "你在试图深入对方意识时触到了一层不属于他的记忆——不是他的，是地下室的。石碑辐射在你们之间产生了一个短暂的灵性通道，你看到了一段画面：十七段祷文，十六段在发光，第十七段是空的。你猛地切断了连接。污染+1。",
        targetPerception: "你短暂地失去了大约两秒钟的意识——然后你记起了地下室里的石碑。不是你想起来的——是它被塞进你的记忆里的。有人触碰了不该碰的东西。",
      },
    },
  },
  {
    id: "elias-aura-scan",
    name: "灵体观察",
    roleId: "role-06-elias",
    attribute: "lore",
    defense: "aura",
    difficulty: 10,
    results: {
      revelation: {
        userText: "你的窥秘之眼在对方的以太体上看到了一个不该存在的结构——一层薄薄的灰白色灵性附着，频率与地下室石碑的辐射完全一致。他已经被影响了——他自己可能不知道。更关键的是，你看到他的星灵体有一道被反复灼烧的旧痕——三年前的仪式实验留下的。你知道他是谁了——格里芬实验的另一个参与者。",
        targetPerception: "你感到一股不带情感的审视从巫师的方向传来——不是针对你的行为，是针对你的灵性结构本身。他在看你的以太体。",
      },
      success: {
        userText: "对方的灵体结构在你眼中呈现出明显的异常——星灵体有不自然的波动痕迹，说明他接触过某种高强度的仪式残留。更关键的：这股波动频率与石碑的辐射有部分重叠。他不是最近被影响的——这个痕迹至少有两三年了。",
        targetPerception: "巫师的目光在你身上停留了异常长的时间——他的瞳孔在快速微调焦距，像是在看你身上某个你看不见的层面。",
      },
      partial: {
        userText: "对方的灵体在你眼中闪烁着不稳定的光泽——你能确认有异常存在，但异常的类型和来源超出了你的判断范围。可能是旧案残留，也可能是当前石碑辐射的影响。你需要更近距离的观察。",
        targetPerception: "你感到一阵微弱的灵性波动从巫师的方向掠过——像是被一根看不见的手指轻轻戳了一下。他没有解释。",
      },
      failure: {
        userText: "石碑的低频辐射污染了整个空间的灵性视野——你看每个人都像隔着一层灰白色的薄雾。你无法确认任何具体的异常。",
        targetPerception: "",
      },
      catastrophe: {
        userText: "你在扫描对方的灵体时，你的窥秘之眼突然自动锁定了地下室的方向——不是因为对方有问题，而是石碑的辐射在那一瞬间强到覆盖了所有人的灵性信号。你短暂地看到了所有人的以太体上都附着了一层相同的灰白色薄膜。污染+1。你无法确定你看到的异常是对方的还是你自己的。",
        targetPerception: "巫师突然闭上了眼睛——然后猛地睁开。他看着你的方向，但焦点在你身后。你回头——什么都没有。",
      },
    },
  },
];

/** 使用讨论途径能力 */
export function usePathwayAbility(
  state: InvestigationGameState,
  playerId: string,
  abilityId: string,
  targetPlayerId: string
): { state: InvestigationGameState; resultText: string; targetPerception: string } | null {
  const ability = PATHWAY_ABILITIES.find((a) => a.id === abilityId);
  if (!ability) return null;

  const user = state.players.find((p) => p.id === playerId);
  const target = state.players.find((p) => p.id === targetPlayerId);
  if (!user || !target || user.roleId !== ability.roleId) return null;

  // 魔术师免疫洞察窥探
  if (ability.attribute === "insight" && target.roleId === "role-02-lyle") {
    const resultText = "你试图读取对方的情绪——但魔术师的表情和肢体语言在你的观众途径面前像一面完美的镜子。你什么都读不到。他对表情的控制是你见过的最完美的——完美到你怀疑他是不是连自己都骗过去了。";
    return { state, resultText, targetPerception: "" };
  }

  // 检定
  const checkOutcome = resolveCheck(
    { attribute: ability.attribute, baseDifficulty: ability.difficulty, coopAllowed: false },
    user.roleId,
    { characterCorruption: user.corruption }
  );

  // 目标被动感知
  let targetPerception = "";
  if (checkOutcome.tier !== "failure") {
    const defOutcome = resolveCheck(
      { attribute: ability.defense, baseDifficulty: 14, coopAllowed: false },
      target.roleId,
      { characterCorruption: target.corruption }
    );
    if (defOutcome.tier === "revelation" || defOutcome.tier === "success") {
      targetPerception = ability.results[checkOutcome.tier]?.targetPerception ?? "";
    }
  }

  const tier = checkOutcome.tier;
  const resultText = ability.results[tier]?.userText ?? `你的${ability.name}未能获得明确信息。`;

  // 灾厄追加污染
  const players = state.players.map((p) => {
    if (p.id === playerId && tier === "catastrophe") {
      return { ...p, corruption: Math.min(10, p.corruption + 1) };
    }
    return p;
  });

  return {
    state: cloneState(state, { players }),
    resultText,
    targetPerception,
  };
}

/** 角色个人议程定义 */
export interface CharacterAgenda {
  roleId: string;
  goal: string;
  conditionHint: string;
  completeText: string;
  failText: string;
}

export const CHARACTER_AGENDAS: Record<string, CharacterAgenda> = {
  "role-01-edwin": {
    roleId: "role-01-edwin",
    goal: "让旧案YN-0417报告被正式承认——三年前那份被你亲手写下又被截留的报告，这一次至少要有人读到它。",
    conditionHint: "在调查中接触旧案档案，并在收束时推动「揭露真相」",
    completeText: "三年的旧案终于被翻了出来。你那份灵性残留分析报告被重新阅读、正式归档。你只是在值夜日志上写下了一句迟到了三年的话：「已处理。」这一次，这两个字是真的。",
    failText: "报告再次被封存。你走出值夜站时天刚亮，和三年前一样。唯一的区别是——这一次你没有再翻开那本日志。",
  },
  "role-02-lyle": {
    roleId: "role-02-lyle",
    goal: "确保仪式残卷的第三页和第七页不落入任何教会之手——销毁它们，然后像往常一样消失。",
    conditionHint: "在残卷被公开讨论前完成销毁，或在收束时确保关键信息不外泄",
    completeText: "残卷的关键两页被销毁。你销毁了所有与指令有关的痕迹。二十四小时后你会在贝克兰德某个不起眼的街角等待下一次联络——但这一次，你对联络产生了一丝迟疑。",
    failText: "残卷落入了教会记录。你的委派者切断了联络——你长久以来的情报庇护消失了。你现在是真正的孤狼了。",
  },
  "role-03-austen": {
    roleId: "role-03-austen",
    goal: "确保错译祷碑由风暴之主教会优先封存——执行命令，完成教会的私下目标。",
    conditionHint: "在收束时推动「封印石碑」方向",
    completeText: "石碑被封入了代罚者的保管设施。教会的评价是「执行到位」。但你的值班记录里有一行你后来删掉的话：「风暴教会徽记在精神同化场内失去指向性。代罚者的信仰不是护盾。」",
    failText: "你选择了联合封存——违背了「不必等待」的指令。教会不会公开责难你，但你知道自己失去了一些东西。不过你也第一次觉得，自己不是在替政治游戏收拾残局。",
  },
  "role-04-cecilia": {
    roleId: "role-04-cecilia",
    goal: "保护霍尔文家族的名字不进入案件的公开结论——那个在侧门后面蹲下来对你说「慢一点，别怕」的人，不值得被公开审判。",
    conditionHint: "在调查深入慈善项目时控制信息流向，或在收束时避免「揭露真相」",
    completeText: "案件的官方结论里没有霍尔文家族的名字。你在社交圈里听到的版本是「霍尔文家的慈善项目经受了考验」。但你是看人最准的那一个——你知道自己参与了一场体面的掩盖。",
    failText: "你在讨论中说出了你应该说的话。霍尔文家族的名字和亚瑟一起出现在报告中。两百年声誉全没了。但你在某个失眠的夜晚想起他七岁时对你说的那句话——「慢一点，别怕。」这一次没有慢一点的余地了。",
  },
  "role-05-devlin": {
    roleId: "role-05-devlin",
    goal: "打破一次通灵者的核心规矩——允许个人情绪介入灵性连接。三年前你遵守了规矩，然后一个十七岁的学徒死了。这一次，你不能再站在规矩这一边。",
    conditionHint: "在通灵相关行动中触发「灵界漫游」专长，选择深入一层",
    completeText: "你打破了规矩。你获得了残响中最关键的信息——但代价是你的自我锚定发生了偏移。你在灵界中迷失了大约六秒钟。等回来的时候，你发现灵界归于安静。而安静——第一次不是空洞，而是完成。",
    failText: "你遵守了规矩。如同三年前面对那个学徒时一样——保持了专业距离。残响信息不够完整。有些事情也许永远不会被回答。但至少这一次，你没有被自己困住。",
  },
  "role-06-elias": {
    roleId: "role-06-elias",
    goal: "完整记录错译祷碑的十七段祷文结构——不是为任何人，是为了满足那份从十六岁起就停不下来的好奇心。",
    conditionHint: "在调查中至少两次深入分析仪式的知识检定，或在收束时获取完整石碑信息",
    completeText: "你把全部十七段祷文记在了脑子里。不需要纸，不需要档案。碑文结构被提交进了正式研究报告——然后被封存在摩斯苦修会的知识库深处。你不知道有多少人会读到它。但那十七段祷文现在住进了你的记忆里——像一个种子。你不知道它什么时候会发芽。",
    failText: "你在核心逻辑面前停了下来。你把父亲的笔记锁回了书架最高层。好奇心没有消失——但至少这一次，门是你自己锁上的。",
  },
};

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

/** 根据角色ID和议程完成状态获取结局文本 */
function getAgendaResult(roleId: string, completed: boolean): string {
  const agenda = CHARACTER_AGENDAS[roleId];
  if (!agenda) return "";
  return completed ? agenda.completeText : agenda.failText;
}

/** 在收束时结算所有角色的个人议程 */
function resolveAgendas(state: InvestigationGameState, resolutionPath: string): InvestigationGameState {
  const players = state.players.map((p) => {
    let completed = false;
    switch (p.roleId) {
      case "role-01-edwin":
        completed = resolutionPath === "perfect"; // 揭露真相=报告被看见
        break;
      case "role-02-lyle":
        completed = resolutionPath !== "perfect"; // 非揭露=残卷安全
        break;
      case "role-03-austen":
        completed = resolutionPath === "perfect"; // 封印=风暴教会目标达成
        break;
      case "role-04-cecilia":
        completed = resolutionPath !== "perfect"; // 非揭露=家族保住
        break;
      case "role-05-devlin":
        completed = p.corruption >= 3; // 高污染=打破规矩的代价
        break;
      case "role-06-elias":
        completed = state.publicClueIds.length >= 4; // 足够线索=足够的研究材料
        break;
    }
    return { ...p, agendaCompleted: completed };
  });
  return cloneState(state, { players });
}
