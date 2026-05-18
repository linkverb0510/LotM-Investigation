// Timers for auto-resolve
const roomTimers: Record<string, NodeJS.Timeout> = {};

function startRoomTimer(roomCode: string, io: Server) {
  // Clear existing
  if (roomTimers[roomCode]) {
    clearTimeout(roomTimers[roomCode]);
  }
  
  const room = roomStore.getRoom(roomCode);
  if (!room?.gameState) return;

  // Determine duration
  const phase = room.gameState.phase;
  let duration = 30000; // Default 30s
  if (phase?.startsWith('discussion')) {
    duration = 90000; // 90s discussion
  }
  
  // Don't timer in lobby or finished
  if (phase === 'lobby' || phase === 'finished') return;

  console.log(`⏰ Starting ${duration/1000}s timer for ${roomCode} (${phase})`);

  roomTimers[roomCode] = setTimeout(() => {
    console.log(`⏰ TIMEOUT for ${roomCode}`);
    roomStore.clearRoomTimer(roomCode); // Clean up reference
    delete roomTimers[roomCode];
    
    // Force resolve
    const currentState = room.gameState;
    if (!currentState) return;
    room.gameState = resolveActionRound(currentState);
    roomStore.clearRoomTimer(roomCode); // Just in case
    
    // Broadcast
    emitRoomSnapshot(io, roomCode);
  }, duration);
}

function clearRoomTimer(roomCode: string) {
  if (roomTimers[roomCode]) {
    clearTimeout(roomTimers[roomCode]);
    delete roomTimers[roomCode];
    console.log(`⏰ Timer cleared for ${roomCode}`);
  }
}

import type { Server, Socket } from "socket.io";

import { roomStore } from "@/lib/server/room-store";
import { resolveActionRound } from "@/lib/game/investigation-engine";
import type { ChatMessage } from "@/lib/game/types";

function emitRoomSnapshot(io: Server, roomCode: string): void {
  const room = roomStore.getRoom(roomCode);

  if (!room) {
    return;
  }

  io.to(roomCode).emit("room:updated", {
    code: room.code,
    hostName: room.hostName,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHost: player.isHost
    })),
    phase: room.gameState?.phase ?? "lobby"
  });

  if (room.gameState) {
    room.players.forEach((player) => {
      const snapshot = roomStore.getPlayerState(room.code, player.id);
      io.to(player.socketId).emit("game:state", {
        ...snapshot,
        selfPlayerId: player.id
      });
    });
    // Restart timer on state update
    startRoomTimer(roomCode, io);
  } else {
    clearRoomTimer(roomCode);
  }
}

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    socket.on("rooms:list", () => {
      socket.emit("rooms:list", roomStore.listRooms());
    });

    socket.on("room:create", ({ hostName }: { hostName: string }) => {
      try {
        const room = roomStore.createRoom(hostName.trim(), socket.id);
        socket.join(room.code);
        const selfPlayer = room.players.find((player) => player.socketId === socket.id);
        socket.emit("room:entered", {
          code: room.code,
          selfPlayerId: selfPlayer?.id,
          isHost: selfPlayer?.isHost ?? false
        });
        emitRoomSnapshot(io, room.code);
      } catch (error) {
        socket.emit("server:error", error instanceof Error ? error.message : "Failed to create room.");
      }
    });

    socket.on("room:join", ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
      try {
        const room = roomStore.joinRoom({ roomCode, playerName: playerName.trim() }, socket.id);
        socket.join(room.code);
        const selfPlayer = room.players.find((player) => player.socketId === socket.id);
        socket.emit("room:entered", {
          code: room.code,
          selfPlayerId: selfPlayer?.id,
          isHost: selfPlayer?.isHost ?? false
        });
        emitRoomSnapshot(io, room.code);
      } catch (error) {
        socket.emit("server:error", error instanceof Error ? error.message : "Failed to join room.");
      }
    });

    socket.on("room:start", ({ roomCode }: { roomCode: string }) => {
      try {
        const room = roomStore.startGame(roomCode);
        emitRoomSnapshot(io, room.code);
      } catch (error) {
        socket.emit("server:error", error instanceof Error ? error.message : "Failed to start game.");
      }
    });

    socket.on("game:ready", ({ roomCode }: { roomCode: string }) => {
      try {
        const { player } = roomStore.getPlayerBySocket(socket.id);
        const room = roomStore.confirmReady(roomCode, player.id);
        emitRoomSnapshot(io, room.code);
      } catch (error) {
        socket.emit("server:error", error instanceof Error ? error.message : "Failed to ready up.");
      }
    });

    socket.on(
      "game:play",
      ({
        roomCode,
        cardId,
        isFaceDown,
        targetPlayerId
      }: {
        roomCode: string;
        cardId: string;
        isFaceDown: boolean;
        targetPlayerId?: string;
      }) => {
      try {
        const { player } = roomStore.getPlayerBySocket(socket.id);
        const room = roomStore.applyTurnAction(roomCode, {
          playerId: player.id,
          cardId,
          isFaceDown,
          targetPlayerId
        });
        emitRoomSnapshot(io, room.code);
      } catch (error) {
        socket.emit("server:error", error instanceof Error ? error.message : "Failed to play card.");
      }
    });

    socket.on("game:vote", ({ roomCode, targetPlayerId }: { roomCode: string; targetPlayerId: string }) => {
      try {
        const { player } = roomStore.getPlayerBySocket(socket.id);
        const room = roomStore.applyVote(roomCode, {
          playerId: player.id,
          targetPlayerId
        });
        emitRoomSnapshot(io, room.code);
      } catch (error) {
        socket.emit("server:error", error instanceof Error ? error.message : "Failed to vote.");
      }
    });

    socket.on("game:choose", ({ roomCode, choiceId }: { roomCode: string; choiceId: string }) => {
      try {
        const { player } = roomStore.getPlayerBySocket(socket.id);
        const room = roomStore.applyStoryChoice(roomCode, player.id, choiceId);
        emitRoomSnapshot(io, room.code);
      } catch (error) {
        socket.emit("server:error", error instanceof Error ? error.message : "Failed to submit story choice.");
      }
    });

    socket.on("game:dev_cmd", ({ roomCode, command }: { roomCode: string; command: string }) => {
      try {
        const { player } = roomStore.getPlayerBySocket(socket.id);
        const room = roomStore.handleDevCommand(roomCode, player.id, command);
        emitRoomSnapshot(io, room.code);
      } catch (error) {
        socket.emit("server:error", error instanceof Error ? error.message : "Failed dev command.");
      }
    });

    // 讨论阶段途径能力
    socket.on("game:ability", ({ roomCode, abilityId, targetPlayerId }: { roomCode: string; abilityId: string; targetPlayerId: string }) => {
      try {
        const { player } = roomStore.getPlayerBySocket(socket.id);
        const result = roomStore.applyPathwayAbility(roomCode, player.id, abilityId, targetPlayerId);
        if (result) {
          // 向使用者发送私密结果
          socket.emit("game:ability_result", {
            resultText: result.resultText,
            targetPerception: "",
          });
          // 向目标发送被动感知结果
          if (result.targetPerception) {
            const targetRoom = roomStore.getRoom(roomCode);
            const targetPlayer = targetRoom?.players.find((p) => p.id === targetPlayerId);
            if (targetPlayer) {
              io.to(targetPlayer.socketId).emit("game:ability_perceived", {
                text: result.targetPerception,
              });
            }
          }
        }
        emitRoomSnapshot(io, roomCode);
      } catch (error) {
        socket.emit("server:error", error instanceof Error ? error.message : "Failed ability.");
      }
    });


    socket.on("game:chat", ({ roomCode, text }: { roomCode: string; text: string }) => {
      try {
        if (!text || text.trim().length === 0) return;
        
        const { player } = roomStore.getPlayerBySocket(socket.id);
        const msg: ChatMessage = {
          id: Math.random().toString(36).slice(2), // Simple ID
          senderId: player.id,
          senderName: player.name,
          text: text,
          timestamp: Date.now()
        };
        
        roomStore.addChatMessage(roomCode, msg);
        io.to(roomCode).emit("room:chat", msg);
      } catch (error) {
        // Ignore chat errors silently
      }
    });


    // 公开私密线索
    socket.on("game:share_clue", ({ roomCode, clueId }: { roomCode: string; clueId: string }) => {
      try {
        const { player } = roomStore.getPlayerBySocket(socket.id);
        roomStore.applyShareClue(roomCode, player.id, clueId);
        emitRoomSnapshot(io, roomCode);
      } catch (error) {
        socket.emit("server:error", error instanceof Error ? error.message : "Failed to share clue.");
      }
    });


    socket.on("disconnect", () => {
      const room = roomStore.removePlayer(socket.id);

      if (room) {
        emitRoomSnapshot(io, room.code);
      }
    });
  });
}
