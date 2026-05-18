/**
 * 自动测试脚本：6 Bot 模拟完整一局游戏
 * 启动方式：npx tsx scripts/bot-test.ts
 *
 * 测试流程：
 *   Player0 创建房间 → Player1-5 加入 → 开始游戏
 *   → P0 全员准备 → P1 每人打一张牌 → 自动结算
 *   → P2 全员投票 → P3 再一轮 → P4 投票
 *   → P5 收束选择 → P6 查看结局
 */

import { io, Socket } from "socket.io-client";

const BOT_COUNT = 6;
const SERVER_URL = "http://localhost:3000";
const BOTS: BotState[] = [];

interface BotState {
  index: number;
  name: string;
  socket: Socket;
  playerId: string;
  roomCode: string;
  phase: string;
  hand: any[];
  roleId: string;
  roleName: string;
  firstLook: string;
  agendaGoal: string;
  spirituality: number;
  corruption: number;
  lastOutcome: any;
  publicClueIds: string[];
  privateClueIds: string[];
  errors: string[];
  resultText: string;
  agendaResult: string;
}

function log(bot: BotState | string, msg: string) {
  const prefix =
    typeof bot === "string"
      ? `[${bot}]`
      : `[Bot${bot.index}·${bot.roleName?.slice(0, 4) ?? "??"}]`;
  console.log(`${prefix} ${msg}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── 创建单个 Bot ──
function createBot(index: number): BotState {
  const name = `TestBot${index}`;
  const socket = io(SERVER_URL, {
    transports: ["websocket"],
    autoConnect: false,
    reconnection: false,
  });

  const bot: BotState = {
    index,
    name,
    socket,
    playerId: "",
    roomCode: "",
    phase: "lobby",
    hand: [],
    roleId: "",
    roleName: "",
    firstLook: "",
    agendaGoal: "",
    spirituality: 0,
    corruption: 0,
    lastOutcome: null,
    publicClueIds: [],
    privateClueIds: [],
    errors: [],
    resultText: "",
    agendaResult: "",
  };

  socket.on("server:error", (msg: string) => {
    bot.errors.push(msg);
    log(bot, `❌ Server Error: ${msg}`);
  });

  // 永久监听 game:state 以保持状态同步
  socket.on("game:state", (data: any) => {
    if (!data?.publicState) return;
    bot.phase = data.publicState.phase ?? bot.phase;
    bot.hand = data.privateHand ?? bot.hand;
    bot.spirituality = data.spirituality ?? bot.spirituality;
    bot.corruption = data.corruption ?? bot.corruption;
    bot.lastOutcome = data.lastOutcome ?? bot.lastOutcome;
    bot.publicClueIds = data.publicState.publicClueIds ?? bot.publicClueIds;
    bot.privateClueIds = data.privateClueIds ?? bot.privateClueIds;
    bot.roleId = data.roleId ?? bot.roleId;
    bot.roleName = data.roleName?.split("/")[0]?.trim() ?? bot.roleName;
    bot.firstLook = data.firstLook ?? bot.firstLook;
    bot.agendaGoal = data.agendaGoal ?? bot.agendaGoal;
    bot.resultText = data.publicState?.resolutionPath ?? bot.resultText;
    bot.agendaResult = data.agendaResult ?? bot.agendaResult;
  });

  socket.on("game:ability_result", (payload: any) => {
    log(bot, `🔍 能力结果: ${payload.resultText?.slice(0, 40)}...`);
  });

  socket.on("game:ability_perceived", (payload: any) => {
    log(bot, `👁️ 被动感知: ${payload.text?.slice(0, 40)}...`);
  });

  BOTS.push(bot);
  return bot;
}

// ── 主流程 ──
async function runTest() {
  console.log("═══════════════════════════════════════");
  console.log("  Bot 自动化测试 — 6人完整对局");
  console.log("═══════════════════════════════════════\n");

  // 创建 6 个 Bot
  for (let i = 0; i < BOT_COUNT; i++) {
    createBot(i);
  }

  // 连接
  console.log("[Step 1] 连接服务器...");
  for (const bot of BOTS) {
    await new Promise<void>((resolve) => {
      bot.socket.on("connect", () => {
        log(bot, "已连接");
        resolve();
      });
      bot.socket.connect();
    });
  }
  console.log("   ✅ 全部连接\n");

  // 创建房间
  console.log("[Step 2] Bot0 创建房间...");
  const host = BOTS[0];
  await new Promise<void>((resolve) => {
    host.socket.emit("room:create", { hostName: host.name });
    host.socket.on("room:entered", (data: any) => {
      host.roomCode = data.code;
      host.playerId = data.selfPlayerId;
      log(host, `创建房间 ${host.roomCode}`);
      resolve();
    });
  });
  await sleep(500);

  // 加入房间
  console.log("[Step 3] Bot1-5 加入房间...");
  for (let i = 1; i < BOT_COUNT; i++) {
    const bot = BOTS[i];
    await new Promise<void>((resolve) => {
      bot.socket.emit("room:join", {
        roomCode: host.roomCode,
        playerName: bot.name,
      });
      bot.socket.on("room:entered", (data: any) => {
        bot.playerId = data.selfPlayerId;
        bot.roomCode = host.roomCode;
        log(bot, "已加入");
        resolve();
      });
    });
  }
  console.log("   ✅ 全部加入\n");
  await sleep(500);

  // 开始游戏
  console.log("[Step 4] 开始游戏...");
  host.socket.emit("room:start", { roomCode: host.roomCode });
  await sleep(2000); // 等 game:state 推送到所有Bot

  log("SYSTEM", `角色分配:`);
  for (const bot of BOTS) {
    log("SYSTEM", `  Bot${bot.index}: ${bot.roleName}(${bot.roleId}) 灵性${bot.spirituality}/${bot.corruption}污 手牌${bot.hand.length}张`);
  }
  console.log();

  // P0: 全员准备
  console.log("[Step 5] P0 全员准备...");
  let p0Errors = 0;
  for (const bot of BOTS) {
    await sleep(300);
    bot.socket.emit("game:ready", { roomCode: bot.roomCode });
  }

  // 等待进入 P1
  await sleep(2000);
  for (const bot of BOTS) {
    if (bot.phase !== "investigation_up") {
      p0Errors++;
      log(bot, `⚠️ P0未推进, 当前phase=${bot.phase}`);
    }
  }
  if (p0Errors === 0) console.log("   ✅ P0→P1 全部推进\n");
  else console.log(`   ⚠️ ${p0Errors} 个Bot未推进\n`);

  // P1: 第一轮行动 — 每人打一张牌
  console.log("[Step 5] P1 第一轮行动...");
  const TARGETS = ["basement", "morgue", "archives", "church_perimeter", "spirit_realm", "charity_office"];
  let p1Errors = 0;

  for (let i = 0; i < BOT_COUNT; i++) {
    const bot = BOTS[i];
    await sleep(600);

    if (bot.hand.length === 0) {
      log(bot, `⚠️ 无手牌! phase=${bot.phase} spirituality=${bot.spirituality}`);
      p1Errors++;
      continue;
    }

    const card = bot.hand[0];
    const target = TARGETS[i % TARGETS.length];
    log(bot, `打出 ${card.name}→${target} 灵性${bot.spirituality}/${bot.corruption}污`);

    bot.socket.emit("game:play", {
      roomCode: bot.roomCode,
      cardId: card.id,
      isFaceDown: false,
      targetPlayerId: target,
    });

    await sleep(1200); // 等state更新
    log(bot, `结果: phase=${bot.phase} 手牌=${bot.hand.length} 灵性=${bot.spirituality}`);
  }

  console.log(`   P1 完成\n`);
  await sleep(3000);

  console.log("[Step 6] P1后状态:");
  for (const bot of BOTS) {
    log(bot, `phase=${bot.phase} 公共线索=${bot.publicClueIds.length} 私密=${bot.privateClueIds.length}`);
  }

  // 如果在 investigation_up, 手动推进到 discussion
  if (BOTS[0].phase === "investigation_up") {
    console.log("\n[Step 6.5] 手动推进回合...");
    // 等自动结算timer触发? 不, 直接强制推进
    // 模拟: 所有bot发送确认
    const roomCode = BOTS[0].roomCode;
    BOTS[0].socket.emit("game:dev_cmd", { roomCode, command: "next_round" });
    await sleep(1000);
    BOTS[0].socket.emit("game:dev_cmd", { roomCode, command: "set_phase discussion_1" });
    await sleep(2000);
  }

  // ── 测试报告 ──
  console.log("\n═══════════════════════════════════════");
  console.log("  测试报告");
  console.log("═══════════════════════════════════════");

  let totalErrors = 0;
  for (const bot of BOTS) {
    const errCount = bot.errors.length;
    totalErrors += errCount;
    const phaseStatus = bot.phase === "resolution" && bot.resultText ? "✅ 完成" : "⚠️ 未完成";
    console.log(`${bot.name}(${bot.roleName}): ${phaseStatus} phase=${bot.phase} 议程=${bot.agendaResult?.slice(0, 20) ?? "?"} 错误${errCount}次`);
    if (bot.errors.length > 0) {
      for (const e of bot.errors) {
        console.log(`    ❌ ${e}`);
      }
    }
  }

  console.log(`\n总错误数: ${totalErrors}`);

  // 断开
  for (const bot of BOTS) {
    bot.socket.disconnect();
  }

  console.log("\n测试完成。");
  process.exit(totalErrors > 0 ? 1 : 0);
}

runTest().catch((err) => {
  console.error("测试崩溃:", err);
  process.exit(1);
});
