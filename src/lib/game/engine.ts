import { nanoid } from "nanoid";

import { ROLES, CARDS, BOSS_ANOMALY, STORY_EVENTS } from "@/lib/game/content";
import { shuffle } from "@/lib/game/utils";
import type {
  Card,
  GameLogEntry,
  GameState,
  GamePhase,
  PlotPhase,
  PlayedCard,
  PlayerPrivateState,
  PublicGameState,
  TurnAction,
  VoteAction,
  Faction
} from "@/lib/game/types";

function createLog(round: number, phase: GamePhase, text: string): GameLogEntry {
  return { id: nanoid(), round, phase, text };
}

function drawCards(deck: Card[], count: number): { drawn: Card[]; remainingDeck: Card[] } {
  return { drawn: deck.slice(0, count), remainingDeck: deck.slice(count) };
}

// ==========================================
// 剧情管理器 (Plot Manager)
// ==========================================

function updatePlotPhase(state: GameState): GameState {
  const nextState = { ...state, logs: [...state.logs] };
  const round = nextState.round;

  // 1. 轮次驱动的硬性切换
  if (round >= 7 && state.plotPhase !== "p7") { nextState.plotPhase = "p7"; nextState.logs.push(createLog(round, nextState.phase, "【剧情】最终审判降临！")); }
  else if (round >= 6 && state.plotPhase !== "p6") { nextState.plotPhase = "p6"; nextState.logs.push(createLog(round, nextState.phase, "【剧情】决战时刻！")); }
  else if (round >= 5 && state.plotPhase !== "p5") { nextState.plotPhase = "p5"; nextState.logs.push(createLog(round, nextState.phase, "【剧情】阴谋暗流加剧...")); }
  else if (round >= 4 && state.plotPhase !== "p4") { nextState.plotPhase = "p4"; nextState.logs.push(createLog(round, nextState.phase, "【剧情】理智临界点到来。")); }
  else if (round >= 3 && state.plotPhase !== "p3") { nextState.plotPhase = "p3"; nextState.logs.push(createLog(round, nextState.phase, "【剧情】转移至煤气厂遗址。")); }
  else if (round >= 2 && state.plotPhase !== "p2") { nextState.plotPhase = "p2"; nextState.logs.push(createLog(round, nextState.phase, "【剧情】尸体开始异变。")); }

  return nextState;
}

// ==========================================
// 初始化逻辑
// ==========================================

export function createInitialGameState(
  roomCode: string,
  players: Array<{ id: string; name: string; isHost: boolean }>
): GameState {
  // Dynamic Role Assignment Logic
  // Rule: 1 Polluted (04) + 1 Edge (06) + Rest Random
  const mandatoryRoles = ROLES.filter(r => r.id === '04-aurora-infiltrator' || r.id === '06-unstable-one');
  const optionalRoles = ROLES.filter(r => r.id !== '04-aurora-infiltrator' && r.id !== '06-unstable-one');
  
  // If less than 2 players, just fill what we can (though game needs min 3)
  const rolesNeeded = players.length;
  let finalRoles: any[] = [];
  
  if (rolesNeeded >= 2) {
    finalRoles.push(mandatoryRoles[0]); // Infiltrator
    finalRoles.push(mandatoryRoles[1]); // Edge
    const remaining = shuffle(optionalRoles).slice(0, rolesNeeded - 2);
    finalRoles = finalRoles.concat(remaining);
  } else {
    // Fallback for small tests
    finalRoles = shuffle(ROLES).slice(0, rolesNeeded);
  }

  const roles = shuffle(finalRoles); // Shuffle to randomize positions

  
  // 初始牌库：收集所有卡牌并按角色数量扩充
  let deck = shuffle([...CARDS, ...CARDS, ...CARDS]);

  const playerStates: PlayerPrivateState[] = players.map((player, index) => {
    const role = roles[index] || roles[0];
    const draw = drawCards(deck, role.initialAttrs.startHand);
    deck = draw.remainingDeck;

    return {
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      isConnected: true,
      influence: 0, 
      suspicion: 0, 
      hasShield: false,

      spirituality: role.initialAttrs.maxSpirituality,
      maxSpirituality: role.initialAttrs.maxSpirituality,
      corruption: role.initialAttrs.startCorruption,
      clues: role.initialAttrs.startClues,
      restorationMarks: 0,
      marks: {}, // Init marks
      behaviorStats: { purifyCount: 0, ritualCount: 0 }, // Init behavior stats

      handCount: draw.drawn.length,
      playedCount: 0,
      
      role: role,
      hand: draw.drawn,
      playedCards: [],
    };
  });

  return {
    roomCode,
    phase: "briefing", 
    plotPhase: "p1", 
    round: 1,
    activePlayerId: playerStates[0]?.id ?? null,
    drawDeck: deck,
    discardPile: [],
    boss: { ...BOSS_ANOMALY }, // Initialize Boss
    ritualProgress: 0,
    players: playerStates,
    pendingActions: [],
    pendingVotes: [],
    readyPlayers: [],
    pendingChoice: null,
    logs: [createLog(0, "briefing", "贝克兰德大雾霾封锁。失控的通灵者在暗处窥视，调查组集结。")],
    chatLog: [],
    winnerPlayerIds: []
  };
}

function getPlayer(state: GameState, playerId: string): PlayerPrivateState {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) throw new Error("Player not found in state.");
  return player;
}

function finalizeRoundAfterResolution(state: GameState, resolvedFromPhase: GamePhase): GameState {
  let nextState = updatePlotPhase(state);

  // 牌库空时重洗，是为了保证长局测试不会因为牌发完而直接卡死。
  if (nextState.drawDeck.length === 0 && nextState.discardPile.length > 0) {
    nextState.drawDeck = shuffle(nextState.discardPile);
    nextState.discardPile = [];
    nextState.logs.push(createLog(nextState.round, nextState.phase, "♻️ 弃牌堆重洗，能力再次可用。"));
  }

  nextState.players.forEach((player) => {
    const maxHand = player.role.initialAttrs.startHand;
    const drawCount = maxHand - player.hand.length;

    if (drawCount > 0 && nextState.drawDeck.length > 0) {
      const draw = drawCards(nextState.drawDeck, drawCount);
      nextState.drawDeck = draw.remainingDeck;
      player.hand.push(...draw.drawn);
      player.handCount = player.hand.length;
    }
  });

  switch (resolvedFromPhase) {
    case "investigation_up":
      return { ...nextState, phase: "discussion_1", pendingVotes: [], pendingActions: [], activePlayerId: null };
    case "investigation_down":
      return { ...nextState, phase: "discussion_2", pendingVotes: [], pendingActions: [], activePlayerId: null };
    case "showdown":
      return {
        ...nextState,
        phase: "finished",
        pendingActions: [],
        logs: [...nextState.logs, createLog(nextState.round, nextState.phase, "对局结束。")]
      };
    default:
      return { ...nextState, phase: resolvedFromPhase, pendingActions: [], activePlayerId: null };
  }
}

// ==========================================
// 流程控制
// ==========================================

export function confirmReady(state: GameState, playerId: string): GameState {
  if (state.readyPlayers.includes(playerId)) return state;
  const nextReady = [...state.readyPlayers, playerId];
  const player = state.players.find(p => p.id === playerId);
  const playerName = player ? player.name : "Unknown";

  const nextState: GameState = {
    ...state,
    readyPlayers: nextReady,
    logs: [...state.logs, createLog(state.round, state.phase, `${playerName} 已准备。`)]
  };

  if (nextReady.length === state.players.length) {
    nextState.phase = "investigation_up";
    nextState.round = 1;
    nextState.activePlayerId = state.players[0]?.id ?? null;
    nextState.logs.push(createLog(1, "investigation_up", "全员准备就绪，调查开始！"));
  }
  return nextState;
}

// ==========================================
// 出牌与结算逻辑
// ==========================================

export function submitTurnAction(state: GameState, action: TurnAction): GameState {
  const currentPhase = state.phase;
  const isActionPhase = ["investigation_up", "investigation_down", "showdown"].includes(currentPhase);
  
  if (!isActionPhase) throw new Error(`Actions cannot be submitted during ${currentPhase}.`);
  if (state.pendingActions.some((entry) => entry.playerId === action.playerId)) throw new Error("Player already submitted.");

  const player = getPlayer(state, action.playerId);
  const cardIndex = player.hand.findIndex((card) => card.id === action.cardId);
  if (cardIndex === -1) throw new Error("Card not found.");
  
  const card = player.hand[cardIndex];
  
  // 计算污染带来的消耗惩罚
  let costMultiplier = 1;
  if (player.corruption >= 50 && player.corruption < 70) costMultiplier = 2;
  
  const actualCost = card.cost.spirituality * costMultiplier;
  if (player.spirituality < actualCost) throw new Error(`灵性不足 (需要 ${actualCost})`);

  // Pay Cost
  player.spirituality -= actualCost;
  if (card.cost.corruption_delta) player.corruption = Math.min(100, player.corruption + card.cost.corruption_delta);

  // Handle Marks Generation
  if (card.marksGenerated) {
    card.marksGenerated.forEach(m => {
      player.marks[m] = (player.marks[m] || 0) + 1;
    });
  }

  player.hand.splice(cardIndex, 1);
  player.handCount = player.hand.length;
  
  const playedCard: PlayedCard = { card, isFaceDown: action.isFaceDown };
  player.playedCards.push(playedCard);
  player.playedCount = player.playedCards.length;

  const nextState: GameState = {
    ...state,
    players: [...state.players],
    pendingActions: [...state.pendingActions, action],
    logs: [...state.logs, createLog(state.round, currentPhase, `${player.name} 打出了 ${card.name}`)]
  };

  if (nextState.pendingActions.length === nextState.players.length) {
    return resolveRound(nextState);
  }
  return nextState;
}

// ==========================================
// 回合结算与环境压力
// ==========================================

export function resolveRound(state: GameState, isForced: boolean = false): GameState {
  let nextState = { ...state, players: [...state.players], logs: [...state.logs] };

  // 1. Apply Card Effects
  nextState.players.forEach((player) => {
    const latestCard = player.playedCards[player.playedCards.length - 1];
    if (!latestCard) return;
    // Only process cards played THIS round (or unplayed cards that are forced?)
    // If revealedAtRound is undefined, it means it was played in a previous round and not revealed?
    // Or it's a card from history.
    // We should only apply effects to cards revealedAtRound === nextState.round
    if (latestCard.revealedAtRound && latestCard.revealedAtRound < nextState.round) {
        // This card was played previously but maybe not processed? 
        // Actually, we process immediately upon reveal.
        // So if revealedAtRound < current, it's already processed.
        return;
    }
    if (!latestCard.isFaceDown) {
      latestCard.revealedAtRound = nextState.round;
      applyCardEffect(nextState, player, latestCard);
      nextState.discardPile.push(latestCard.card);
    }
  });

  // 2. Boss Threat Scaling (Environment Pressure)
  let threatGrowth = 5; 
  if (nextState.plotPhase === "p3" || nextState.plotPhase === "p4") threatGrowth = 8;
  if (nextState.plotPhase === "p5") threatGrowth = 10;
  
  nextState.boss.threatLevel = Math.min(100, nextState.boss.threatLevel + threatGrowth);
  nextState.logs.push(createLog(nextState.round, nextState.phase, `⚠️【环境】失控的通灵者威胁上升 (${nextState.boss.threatLevel}%)`));

  // 3. Check Crisis
  if (nextState.boss.threatLevel >= 80 && !nextState.logs.some(l => l.text.includes("危机爆发"))) {
    nextState.logs.push(createLog(nextState.round, nextState.phase, "🚨【危机爆发】亡者凝视！所有玩家污染 +10！"));
    nextState.players.forEach(p => {
       p.corruption = Math.min(100, p.corruption + 10);
    });
  }

  // 4. 剧情阶段更新
  
  // 3. Check for Story Event Trigger (P4 End for Edge Player)
  // We only trigger if plotPhase is currently p4 and round is ending (or moving to p5)
  if (nextState.plotPhase === 'p4' && !nextState.pendingChoice) {
      const edgePlayer = nextState.players.find(p => p.role.id === '06-unstable-one');
      if (edgePlayer && edgePlayer.role.faction === 'unknown') {
          // Trigger Evolution Choice
          const event = STORY_EVENTS['06_evolution_p4'];
          if (event) {
              const choiceEvent: typeof event = { ...event, targetPlayerId: edgePlayer.id };
              nextState.pendingChoice = choiceEvent;
              nextState.logs.push(createLog(nextState.round, nextState.phase, `🚨【灵魂拷问】${edgePlayer.name} 正在面临理智的崩塌，必须做出抉择！`));
              // Do not transition phase immediately if choice is pending?
              // For MVP, let's pause logic. 
          }
      }
  }

  
  // Block Phase Transition if a Story Choice is pending
  if (nextState.pendingChoice) {
    nextState.logs.push(createLog(nextState.round, nextState.phase, "⏸️ 剧情抉择进行中，时间暂停..."));
    return nextState; // STOP here. Do not advance phase.
  }

  return finalizeRoundAfterResolution(nextState, state.phase);
}

// ==========================================
// 卡牌效果应用
// ==========================================

function applyCardEffect(state: GameState, player: PlayerPrivateState, playedCard: PlayedCard): void {
  const effect = playedCard.card.effect;
  
  switch (effect) {
    case "gain_clue":
      player.clues += 1;
      player.influence += 1;
      state.logs.push(createLog(state.round, state.phase, `${player.name} 获取了一条线索。`));
      break;
    case "push_threat":
      state.boss.threatLevel = Math.min(100, state.boss.threatLevel + 15);
      state.ritualProgress += 5;
      player.spirituality = Math.min(player.maxSpirituality, player.spirituality + 2);
      state.logs.push(createLog(state.round, state.phase, `${player.name} 暗中推进了仪式并获取了灵性。`));
      break;
    case "purify":
      state.boss.threatLevel = Math.max(0, state.boss.threatLevel - 5);
      player.corruption = Math.max(0, player.corruption - 10);
      state.logs.push(createLog(state.round, state.phase, `${player.name} 净化了周围的污染。`));
      break;
    case "shield":
      player.hasShield = true;
      state.logs.push(createLog(state.round, state.phase, `${player.name} 获得了护盾。`));
      break;
    default:
      break;
  }
}

// ==========================================
// 导出公共状态
// ==========================================

export function serializePublicState(state: GameState, viewerId?: string): PublicGameState {
  return {
    roomCode: state.roomCode,
    phase: state.phase,
    plotPhase: state.plotPhase,
    round: state.round,
    activePlayerId: state.activePlayerId,
    ritualProgress: state.ritualProgress,
    discardPileSize: state.discardPile.length,
    boss: state.boss,
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      isConnected: player.isConnected,
      influence: player.influence,
      suspicion: player.suspicion,
      hasShield: player.hasShield,
      spirituality: player.spirituality,
      maxSpirituality: player.maxSpirituality,
      corruption: player.corruption,
      clues: player.clues,
      restorationMarks: player.restorationMarks,
      marks: player.marks,
      behaviorStats: player.behaviorStats,
      handCount: player.hand.length,
      playedCount: player.playedCards.length
    })),
    playedCards: Object.fromEntries(
      state.players.map((player) => [
        player.id,
        player.playedCards.map((pc) => ({
          ...pc,
          card: pc.isFaceDown ? { id: "hidden", name: "暗牌", type: "info" as const, effect: "gain_clue" as const, cost: {spirituality:0}, description: "???", rarity: "common" as const } : pc.card
        }))
      ])
    ),
    logs: state.logs,
    winnerPlayerIds: state.winnerPlayerIds
  };
}

export function submitVote(state: GameState, vote: VoteAction): GameState {
  // MVP Model A: In Discussion phases, voting acts as "Ready to Proceed"
  if (!state.phase.startsWith("discussion")) {
    // If not in discussion, ignore or throw? Let's ignore for now.
    return state;
  }
  
  if (state.pendingVotes.some((entry) => entry.playerId === vote.playerId)) {
    return state; // Already voted
  }

  const nextState: GameState = {
    ...state,
    pendingVotes: [...state.pendingVotes, vote],
    logs: [...state.logs, createLog(state.round, state.phase, `${vote.playerId} 确认继续。`)]
  };

  // If all players voted (or maybe just enough?)
  // For MVP, require all players.
  if (nextState.pendingVotes.length === nextState.players.length) {
    if (state.phase === "discussion_1") {
      return { 
        ...nextState, 
        phase: "investigation_down", 
        pendingVotes: [], 
        pendingActions: [], 
        activePlayerId: state.players[0]?.id 
      };
    } else if (state.phase === "discussion_2") {
      return { 
        ...nextState, 
        phase: "showdown", 
        pendingVotes: [], 
        pendingActions: [], 
        activePlayerId: state.players[0]?.id 
      };
    }
  }

  return nextState;
}


export function submitStoryChoice(state: GameState, playerId: string, choiceId: string): GameState {
  if (!state.pendingChoice) throw new Error("No pending story choice.");
  if (state.pendingChoice.targetPlayerId !== playerId) throw new Error("This choice is not for you.");

  const nextState = { ...state, players: [...state.players] };
  const player = nextState.players.find(p => p.id === playerId);
  if (!player) throw new Error("Player not found.");

  const choice = nextState.pendingChoice!.options.find(o => o.id === choiceId);
  if (!choice) throw new Error("Invalid choice ID.");

  // Apply Result
  player.role.faction = choice.resultFaction;
  
  if (choice.buffs) {
      if (choice.buffs.corruptionDelta) {
          player.corruption = Math.max(0, Math.min(100, player.corruption + choice.buffs.corruptionDelta));
      }
      if (choice.buffs.maxSpiritualityDelta) {
          player.maxSpirituality += choice.buffs.maxSpiritualityDelta;
          player.spirituality = player.maxSpirituality; // Fully recover spirit
      }
      if (choice.buffs.spiritDelta) {
          player.spirituality = Math.min(player.maxSpirituality, player.spirituality + choice.buffs.spiritDelta);
      }
  }

  nextState.logs.push(createLog(nextState.round, nextState.phase, `【抉择】${player.name} 选择了 "${choice.label}"。${choice.effectText}`));
  
  // Clear pending choice
  nextState.pendingChoice = null;

  // 这里不能重新调用 resolveRound，否则会把刚刚结算过的那轮卡牌效果再算一遍。
  // 正确做法是从“暂停点”继续执行收尾流程：剧情推进、补牌、阶段转换。
  return finalizeRoundAfterResolution(nextState, state.phase);
}
