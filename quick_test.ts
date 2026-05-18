import { createInitialGameState, serializePublicState } from "./src/lib/game/engine";

try {
  console.log("Testing initialization...");
  const state = createInitialGameState("TEST", [
    { id: "1", name: "Player1", isHost: true },
    { id: "2", name: "Player2", isHost: false }
  ]);

  console.log(`Phase: ${state.phase}`);
  console.log(`PlotPhase: ${state.plotPhase}`);
  console.log(`Players: ${state.players.length}`);
  
  // Check roles
  state.players.forEach(p => {
    console.log(`- ${p.name}: Role ${p.role.name}, Pathway ${p.role.pathway}, Faction ${p.role.faction}`);
    console.log(`  Attrs: SPI=${p.spirituality}, POL=${p.corruption}, Clues=${p.clues}`);
    console.log(`  Hand: ${p.hand.length} cards`);
  });

  // Check Public State
  const pub = serializePublicState(state);
  console.log(`Public State OK? ${pub.roomCode === "TEST"}`);
  
  console.log("✅ Test Passed!");
} catch (e) {
  console.error("❌ Test Failed:", e);
}
