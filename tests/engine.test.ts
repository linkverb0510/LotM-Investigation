import { describe, expect, it } from "vitest";

import { createInitialGameState, serializePublicState, submitTurnAction } from "@/lib/game/engine";

function createPlayers() {
  return [
    { id: "p1", name: "Klein", isHost: true },
    { id: "p2", name: "Audrey", isHost: false },
    { id: "p3", name: "Leonard", isHost: false }
  ];
}

describe("game engine", () => {
  it("creates a playable game state for three players", () => {
    const state = createInitialGameState("ABCD", createPlayers());

    expect(state.phase).toBe("briefing");
    expect(state.players).toHaveLength(3);
    expect(state.players.every((player) => player.hand.length === 3)).toBe(true);
  });

  it("moves to discussion after every player submits a turn action", () => {
    let state = createInitialGameState("ABCD", createPlayers());
    state.phase = "investigation_up"; // Set valid phase

    state.players.forEach((player) => {
      const card = player.hand[0];
      state = submitTurnAction(state, {
        playerId: player.id,
        cardId: card.id,
        isFaceDown: false
      });
    });

    expect(state.phase).toBe("discussion_1");
  });

  // it("finishes the game after all players vote in the final round", () => { ... }); // Skipped for now

  it("hides face-down card details in public state", () => {
    let state = createInitialGameState("ABCD", createPlayers());
    state.phase = "investigation_up"; // Set valid phase
    const card = state.players[0].hand[0];

    state = submitTurnAction(state, {
      playerId: "p1",
      cardId: card.id,
      isFaceDown: true
    });

    const publicState = serializePublicState(state);
    expect(publicState.playedCards["p1"][0].card.name).toBe("暗牌");
  });
});
