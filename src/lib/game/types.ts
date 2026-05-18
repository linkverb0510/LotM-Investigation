export type Pathway =
  | "evernight"       // 黑夜女神途径
  | "seer"            // 占卜家途径
  | "storm"           // 风暴之主途径
  | "rose"            // 玫瑰学派途径
  | "death"           // 死神途径 (收尸人)
  | "mutated_sleepless"; // 变异 (仅失控边缘者)

// 阵营：unknown 代表初始中立/未觉醒状态
export type Faction = "investigator" | "polluted" | "unknown";
export type PollutedSubType = "aurora" | "outer_deity" | "none";

export type GamePhase =
  | "lobby"
  | "briefing"
  | "investigation_up" // P1-P2: 迷雾搜集
  | "discussion_1"
  | "investigation_down" // P3-P5: 阴谋暗流
  | "discussion_2"
  | "showdown"          // P6-P7: 最终决战
  | "finished";

// 新增：剧情阶段 (P1-P7)
export type PlotPhase = "p1" | "p2" | "p3" | "p4" | "p5" | "p6" | "p7";

export type CardType = "info" | "utility" | "ritual";
export type CardEffect =
  | "gain_clue"          // 获取线索
  | "peek_corruption"    // 探查污染/弱点
  | "purify"             // 净化/降低威胁
  | "shield"             // 护盾/防御
  | "push_threat"        // 增加 Boss 威胁 (邪恶用)
  | "recycle";           // 资源回收 (医生用)

export interface CardCost {
  spirituality: number;
  corruption_delta?: number; // 污染代价
}

export interface Card {
  id: string;
  name: string;
  type: CardType;
  effect: CardEffect;
  cost: CardCost;
  description: string;
  sideEffect?: string;
  rarity: "common" | "rare" | "artifact";
  tags?: string[]; // Tags like 'investigation', 'defense', 'hidden_ritual'
  marksGenerated?: string[]; //打出此卡时获得的标记
}

export interface RoleCard {
  id: string;
  name: string;
  title: string;
  pathway: Pathway;
  faction: Faction;
  pollutedType?: PollutedSubType;
  ability: string; // 天赋描述
  cards: string[]; // 专属卡牌 ID 列表
  initialAttrs: {
    maxSpirituality: number;
    startCorruption: number;
    startClues: number;
    startHand: number;
  };
}

// NPC Boss 定义

export interface ChoiceOption {
  id: string;
  label: string;
  description: string;
  resultFaction: Faction;
  effectText: string; // Narrative description of the result
  buffs?: {
    corruptionDelta?: number;
    maxSpiritualityDelta?: number;
    spiritDelta?: number;
  };
}

export interface PendingStoryChoice {
  id: string;
  targetPlayerId: string; // Who must choose
  roleId: string;
  title: string;
  context: string; // Story text
  options: ChoiceOption[];
  phase: PlotPhase; // Triggered at which phase end
}

export interface BossState {
  id: string;
  name: string;
  description: string; // 原著描述
  threatLevel: number; // 0-100
  weaknessRevealed: boolean;
  nextSkillName: string;
}

export interface PlayerPublicState {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  
  influence: number; 
  suspicion: number; 
  hasShield: boolean;

  spirituality: number; 
  maxSpirituality: number; 
  corruption: number; 
  clues: number; 
  restorationMarks: number; // For Unstable One conversion

  marks: Record<string, number>; // Custom marks
  behaviorStats: { purifyCount: number; ritualCount: number }; // Behavior tracking

  handCount: number;
  playedCount: number;
}

export interface PlayerPrivateState extends PlayerPublicState {
  role: RoleCard;
  hand: Card[];
  playedCards: PlayedCard[];
}

export interface PlayedCard {
  card: Card;
  isFaceDown: boolean;
  revealedAtRound?: number;
}

export interface GameLogEntry {
  id: string;
  round: number;
  phase: GamePhase;
  text: string;
}

export interface TurnAction {
  playerId: string;
  cardId: string;
  isFaceDown: boolean;
  targetPlayerId?: string;
}

export interface VoteAction {
  playerId: string;
  targetPlayerId: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface GameState {
  chatLog: ChatMessage[];
  roomCode: string;
  phase: GamePhase;
  plotPhase: PlotPhase; // 新增剧情阶段
  round: number;
  activePlayerId: string | null;
  
  drawDeck: Card[];
  discardPile: Card[];
  
  boss: BossState; // 新增 NPC Boss
  pendingChoice: PendingStoryChoice | null; // 挂起的剧情抉择

  ritualProgress: number; // 仪式进度 (邪恶目标)
  players: PlayerPrivateState[];
  pendingActions: TurnAction[];
  pendingVotes: VoteAction[];
  readyPlayers: string[];
  
  logs: GameLogEntry[];
  winnerPlayerIds: string[];
}

export interface PublicGameState {
  roomCode: string;
  phase: GamePhase;
  plotPhase: PlotPhase;
  round: number;
  activePlayerId: string | null;
  
  ritualProgress: number;
  discardPileSize: number;
  boss: BossState;
  
  players: PlayerPublicState[];
  playedCards: Record<string, PlayedCard[]>;
  logs: GameLogEntry[];
  winnerPlayerIds: string[];
}

export interface RoomSummary {
  code: string;
  hostName: string;
  playerCount: number;
  phase: GamePhase;
}

export interface CreateRoomInput {
  hostName: string;
}

export interface JoinRoomInput {
  roomCode: string;
  playerName: string;
}
