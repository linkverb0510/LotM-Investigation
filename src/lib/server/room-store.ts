import { nanoid } from "nanoid";

import {
  createInvestigationGame,
  serializePublicState,
  executePlayerAction,
  confirmReady,
  submitVote,
  resolveActionRound,
  resolveEnding,
  serializePlayerState,
  usePathwayAbility,
} from "@/lib/game/investigation-engine";
import type { JoinRoomInput, RoomSummary, ChatMessage, GamePhase } from "@/lib/game/types";
import type { InvestigationGameState, PlayerAction, PlayerVote } from "@/lib/game/investigation-v2/schema";

interface StoredPlayer {
  id: string;
  name: string;
  socketId: string;
  isHost: boolean;
}

interface StoredRoom {
  code: string;
  hostName: string;
  players: StoredPlayer[];
  gameState: InvestigationGameState | null;
  chatLog: ChatMessage[];
  timer: NodeJS.Timeout | null;
}

function createRoomCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

class RoomStore {
  private readonly rooms = new Map<string, StoredRoom>();

  listRooms(): RoomSummary[] {
    return [...this.rooms.values()].map((room) => ({
      code: room.code,
      hostName: room.hostName,
      playerCount: room.players.length,
      phase: room.gameState?.phase ?? "lobby"
    }));
  }

  createRoom(hostName: string, socketId: string): StoredRoom {
    const code = createRoomCode();
    const hostPlayer: StoredPlayer = {
      id: nanoid(),
      name: hostName,
      socketId,
      isHost: true
    };

    const room: StoredRoom = {
      code,
      hostName,
      players: [hostPlayer],
      gameState: null,
      chatLog: [],
      timer: null,
    };

    this.rooms.set(code, room);
    return room;
  }

  joinRoom(input: JoinRoomInput, socketId: string): StoredRoom {
    const room = this.rooms.get(input.roomCode.toUpperCase());

    if (!room) {
      throw new Error("Room not found.");
    }

    if (room.players.length >= 6) {
      throw new Error("Room is full.");
    }

    if (room.players.some((player) => player.name === input.playerName)) {
      throw new Error("Player name already exists in room.");
    }

    room.players.push({
      id: nanoid(),
      name: input.playerName,
      socketId,
      isHost: false
    });

    return room;
  }

  findRoomBySocket(socketId: string): StoredRoom | undefined {
    return [...this.rooms.values()].find((room) => room.players.some((player) => player.socketId === socketId));
  }

  removePlayer(socketId: string): StoredRoom | undefined {
    const room = this.findRoomBySocket(socketId);

    if (!room) {
      return undefined;
    }

    room.players = room.players.filter((player) => player.socketId !== socketId);

    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      return undefined;
    }

    if (!room.players.some((player) => player.isHost)) {
      room.players[0].isHost = true;
      room.hostName = room.players[0].name;
    }

    if (room.gameState) {
      room.gameState.players = room.gameState.players.map((player) =>
        player.id === room.players.find((entry) => entry.id === player.id)?.id
          ? player
          : { ...player, isConnected: room.players.some((entry) => entry.id === player.id) }
      );
    }

    return room;
  }

  startGame(roomCode: string): StoredRoom {
    const room = this.rooms.get(roomCode.toUpperCase());

    if (!room) {
      throw new Error("Room not found.");
    }

    if (room.players.length < 3) {
      throw new Error("At least 3 players are required to start.");
    }

    room.gameState = createInvestigationGame(room.code, room.players);
    return room;
  }

  getPlayerState(roomCode: string, playerId: string) {
    const room = this.rooms.get(roomCode.toUpperCase());

    if (!room?.gameState) {
      throw new Error("Game not found.");
    }

    const player = room.gameState.players.find((entry) => entry.id === playerId);

    if (!player) {
      throw new Error("Player not found.");
    }

    const privateState = serializePlayerState(room.gameState, playerId);

    return {
      publicState: privateState.publicState,
      privateHand: privateState.privateHand,
      privateClueIds: privateState.privateClueIds,
      privateClueTexts: privateState.privateClueTexts,
      roleId: player.roleId,
      roleName: `${player.roleName} / ${player.roleTitle}`,
      roleOrg: player.roleOrg,
      attributes: player.attributes,
      spirituality: player.spirituality,
      maxSpirituality: player.maxSpirituality,
      corruption: player.corruption,
      readyPlayers: room.gameState.readyPlayers,
      agendaCompleted: player.agendaCompleted,
      firstLook: player.firstLook ?? "",
      agendaGoal: player.agendaGoal ?? "",
      agendaResult: (privateState as any).agendaResult ?? "",
      lastOutcome: player.lastOutcome ?? null,
      pendingChoice: null,
      hasPendingChoice: false,
    };
  }

  getPlayerBySocket(socketId: string): { room: StoredRoom; player: StoredPlayer } {
    const room = this.findRoomBySocket(socketId);

    if (!room) {
      throw new Error("Player room not found.");
    }

    const player = room.players.find((entry) => entry.socketId === socketId);

    if (!player) {
      throw new Error("Player not found.");
    }

    return { room, player };
  }

  // [New] Confirm Ready for P0 Phase
  confirmReady(roomCode: string, playerId: string): StoredRoom {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room?.gameState) throw new Error("Game not found.");
    room.gameState = confirmReady(room.gameState, playerId);
    return room;
  }

  applyTurnAction(roomCode: string, action: { playerId: string; cardId: string; targetPlayerId?: string; isFaceDown?: boolean }): StoredRoom {
    const room = this.rooms.get(roomCode.toUpperCase());

    if (!room?.gameState) {
      throw new Error("Game not found.");
    }

    // 构建新引擎所需的 PlayerAction
    const player = room.gameState.players.find(p => p.id === action.playerId);
    const card = player?.hand.find(c => c.id === action.cardId);
    
    // 从卡牌类别推断行动类别和属性
    const categoryMap: Record<string, { action: string; attribute: string }> = {
      "搜证": { action: "investigate", attribute: "insight" },
      "搜证/调度": { action: "investigate", attribute: "insight" },
      "搜证/接触": { action: "investigate", attribute: "insight" },
      "调度/搜证": { action: "investigate", attribute: "insight" },
      "净化": { action: "purify", attribute: "will" },
      "封印物": { action: "artifact", attribute: "aura" },
      "封印物/净化": { action: "artifact", attribute: "aura" },
      "压制": { action: "suppress", attribute: "physique" },
      "接触/机动": { action: "contact", attribute: "aura" },
      "反制/掩饰": { action: "conceal", attribute: "cunning" },
      "保命/伪装": { action: "conceal", attribute: "cunning" },
      "调度": { action: "dispatch", attribute: "lore" },
      "调度/掩饰": { action: "dispatch", attribute: "lore" },
      "讨论/接触": { action: "contact", attribute: "insight" },
    };
    const mapping = categoryMap[card?.category ?? ""] ?? { action: "investigate", attribute: "insight" };

    const engineAction: PlayerAction = {
      playerId: action.playerId,
      cardId: action.cardId,
      targetId: action.targetPlayerId ?? "现场",
      category: mapping.action as any,
      attribute: mapping.attribute as any,
    };

    const { state } = executePlayerAction(room.gameState, engineAction);
    room.gameState = state;

    // 检查是否全员完成行动
    if (room.gameState.pendingActions.length === room.gameState.players.length) {
      room.gameState = resolveActionRound(room.gameState);
    }

    return room;
  }

  applyVote(roomCode: string, vote: { playerId: string; targetPlayerId?: string }): StoredRoom {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room?.gameState) throw new Error("Game not found.");

    const engineVote: PlayerVote = {
      playerId: vote.playerId,
      vote: vote.targetPlayerId ?? "advance",
    };
    room.gameState = submitVote(room.gameState, engineVote);

    // 讨论结束进入 resolution 后，等待收束决策
    if (room.gameState.phase === "resolution" && !room.gameState.resolutionPath) {
      const choice = vote.targetPlayerId as "seal" | "reveal" | "compromise" | undefined;
      if (choice && ["seal", "reveal", "compromise"].includes(choice)) {
        room.gameState = resolveEnding(room.gameState, choice);
      }
    }

    return room;
  }

  // 保留以便 socket-events 兼容
  applyStoryChoice(_roomCode: string, _playerId: string, _choiceId: string): StoredRoom {
    return this.rooms.get(_roomCode.toUpperCase())!;
  }

  // [V2] 讨论阶段途径能力
  applyPathwayAbility(roomCode: string, playerId: string, abilityId: string, targetPlayerId: string): { room: StoredRoom; resultText: string; targetPerception: string } | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room?.gameState) throw new Error("Game not found.");

    const result = usePathwayAbility(room.gameState, playerId, abilityId, targetPlayerId);
    if (!result) return null;

    room.gameState = result.state;
    return { room, resultText: result.resultText, targetPerception: result.targetPerception };
  }

  // [Dev Mode] 处理开发者指令
  handleDevCommand(roomCode: string, playerId: string, command: string): StoredRoom {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room?.gameState) throw new Error("Game not found.");

    const parts = command.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const player = room.gameState.players.find(p => p.id === playerId);

    switch (cmd) {
      case 'set_corruption':
        if (player) player.corruption = Math.min(10, parseInt(args[0]) || 0);
        break;
      case 'set_spirit':
        if (player) player.spirituality = Math.min(player.maxSpirituality, parseInt(args[0]) || 0);
        break;
      case 'set_phase':
        room.gameState.phase = args[0] as any;
        break;
      case 'next_round':
        room.gameState.round += 1;
        break;
      case 'add_clue':
        room.gameState.publicClueIds = [...room.gameState.publicClueIds, args[0] || `clue_dev_${Date.now()}`];
        break;
      case 'progress':
        room.gameState.logs = [
          ...room.gameState.logs,
          { id: nanoid(), round: room.gameState.round, phase: room.gameState.phase,
            text: `🔧【Dev】阶段:${room.gameState.phase} | 压力:${room.gameState.pressureTier} | 公共线索:${room.gameState.publicClueIds.length}`,
          },
        ];
        break;
      default:
        break;
    }
    return room;
  }


  addChatMessage(roomCode: string, msg: ChatMessage): StoredRoom {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) throw new Error("Room not found.");
    room.chatLog.push(msg);
    return room;
  }

  clearRoomTimer(roomCode: string) {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (room?.timer) {
      clearTimeout(room.timer);
      room.timer = null;
    }
  }

  getRoom(roomCode: string): StoredRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }
}

export const roomStore = new RoomStore();
