import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

import { io, type Socket } from "socket.io-client";

import type {
  Card,
  Faction,
  PendingStoryChoice,
  PublicGameState
} from "@/lib/game/types";

interface PlayerGameState {
  publicState: PublicGameState;
  privateHand: Card[];
  roleName: string;
  selfPlayerId: string;
  readyPlayers: string[];
  roleFaction: Faction;
  pendingChoice: PendingStoryChoice | null;
  hasPendingChoice: boolean;
}

interface RoomEnteredPayload {
  code: string;
  selfPlayerId?: string;
  isHost?: boolean;
}

interface MatchSummary {
  match: number;
  roomCode: string;
  turnsObserved: number;
  durationMs: number;
  finalPhase: string;
  logsCaptured: number;
  finished: boolean;
}

interface SimulationIssue {
  match: number;
  message: string;
}

function waitForSocketEvent<TPayload = void>(socket: Socket, eventName: string): Promise<TPayload> {
  return new Promise((resolve, reject) => {
    const handleEvent = (payload: TPayload) => {
      socket.off(eventName, handleEvent);
      socket.off("connect_error", handleError);
      resolve(payload);
    };

    const handleError = (error: unknown) => {
      socket.off(eventName, handleEvent);
      socket.off("connect_error", handleError);
      reject(error);
    };

    socket.once(eventName, handleEvent);
    socket.once("connect_error", handleError);
  });
}

class VirtualPlayer {
  readonly name: string;
  readonly socket: Socket;
  readonly isHost: boolean;
  readonly issues: SimulationIssue[];

  currentRoomCode: string;
  selfPlayerId = "";
  latestState: PlayerGameState | null = null;
  readySent = false;
  submittedActionForRound = "";
  submittedVoteForRound = "";
  submittedChoiceMarker = "";
  skippedActionPhases = new Set<string>();

  constructor(options: {
    name: string;
    roomCode: string;
    isHost: boolean;
    baseUrl: string;
    issues: SimulationIssue[];
  }) {
    this.name = options.name;
    this.currentRoomCode = options.roomCode;
    this.isHost = options.isHost;
    this.issues = options.issues;
    this.socket = io(options.baseUrl, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      timeout: 8000
    });
  }

  async connectAndEnter(): Promise<RoomEnteredPayload> {
    await waitForSocketEvent(this.socket, "connect");

    this.socket.on("game:state", (payload: PlayerGameState) => {
      if (payload.publicState.roomCode === this.currentRoomCode) {
        this.latestState = payload;
        this.selfPlayerId = payload.selfPlayerId;
      }
    });

    this.socket.on("server:error", (message: string) => {
      this.issues.push({ match: 0, message: `${this.name} 收到服务端错误: ${message}` });
    });

    if (this.isHost) {
      this.socket.emit("room:create", { hostName: this.name });
    } else {
      this.socket.emit("room:join", { roomCode: this.currentRoomCode, playerName: this.name });
    }

    const payload = await waitForSocketEvent<RoomEnteredPayload>(this.socket, "room:entered");
    this.currentRoomCode = payload.code;
    if (payload.selfPlayerId) {
      this.selfPlayerId = payload.selfPlayerId;
    }

    return payload;
  }

  maybeAct(matchNumber: number): void {
    const state = this.latestState;
    if (!state) {
      return;
    }

    const phaseKey = `${state.publicState.phase}-${state.publicState.round}`;

    if (state.publicState.phase === "briefing" && !this.readySent) {
      this.socket.emit("game:ready", { roomCode: this.currentRoomCode });
      this.readySent = true;
      return;
    }

    if (state.pendingChoice) {
      const marker = `${state.pendingChoice.id}-${state.publicState.round}`;
      if (this.submittedChoiceMarker === marker) {
        return;
      }

      const preferredChoice = state.pendingChoice.options[0];
      if (!preferredChoice) {
        this.issues.push({ match: matchNumber, message: `${this.name} 没有拿到可提交的剧情选项。` });
        return;
      }

      this.socket.emit("game:choose", { roomCode: this.currentRoomCode, choiceId: preferredChoice.id });
      this.submittedChoiceMarker = marker;
      return;
    }

    if (state.hasPendingChoice) {
      return;
    }

    if (state.publicState.phase === "discussion_1" || state.publicState.phase === "discussion_2") {
      if (this.submittedVoteForRound === phaseKey) {
        return;
      }

      const target =
        state.publicState.players.find((player) => player.id !== this.selfPlayerId) ??
        state.publicState.players[0];

      if (!target) {
        this.issues.push({ match: matchNumber, message: `${this.name} 在讨论阶段没有找到投票对象。` });
        return;
      }

      this.socket.emit("game:vote", { roomCode: this.currentRoomCode, targetPlayerId: target.id });
      this.submittedVoteForRound = phaseKey;
      return;
    }

    if (
      state.publicState.phase !== "investigation_up" &&
      state.publicState.phase !== "investigation_down" &&
      state.publicState.phase !== "showdown"
    ) {
      return;
    }

    if (this.submittedActionForRound === phaseKey) {
      return;
    }

    const self = state.publicState.players.find((player) => player.id === this.selfPlayerId);
    if (!self) {
      this.issues.push({ match: matchNumber, message: `${this.name} 在行动阶段没有匹配到自身状态。` });
      return;
    }

    const costMultiplier = self.corruption >= 50 && self.corruption < 70 ? 2 : 1;
    const card = state.privateHand.find((candidate) => self.spirituality >= candidate.cost.spirituality * costMultiplier);

    if (!card) {
      if (!this.skippedActionPhases.has(phaseKey)) {
        this.issues.push({ match: matchNumber, message: `${this.name} 在 ${phaseKey} 没有可支付手牌。` });
        this.skippedActionPhases.add(phaseKey);
      }
      return;
    }

    const target = state.publicState.players.find((player) => player.id !== this.selfPlayerId);
    const requiresTarget = ["peek_corruption", "purify", "gain_clue"].includes(card.effect);

    this.socket.emit("game:play", {
      roomCode: this.currentRoomCode,
      cardId: card.id,
      isFaceDown: false,
      targetPlayerId: requiresTarget ? target?.id : undefined
    });
    this.submittedActionForRound = phaseKey;
  }

  disconnect(): void {
    this.socket.disconnect();
  }
}

async function waitForServer(baseUrl: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const probe = io(baseUrl, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      timeout: 2000
    });

    try {
      await waitForSocketEvent(probe, "connect");
      probe.disconnect();
      return;
    } catch {
      probe.disconnect();
      await delay(1000);
    }
  }

  throw new Error(`服务端在 ${timeoutMs}ms 内没有启动完成。`);
}

async function startDevServerIfNeeded(baseUrl: string): Promise<{ process: ReturnType<typeof spawn> | null }> {
  try {
    await waitForServer(baseUrl, 1500);
    return { process: null };
  } catch {
    const child = spawn("npm", ["run", "dev"], {
      cwd: process.cwd(),
      shell: true,
      stdio: "pipe"
    });

    child.stdout.on("data", (chunk) => {
      process.stdout.write(`[dev] ${String(chunk)}`);
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(`[dev] ${String(chunk)}`);
    });

    await waitForServer(baseUrl, 40000);
    return { process: child };
  }
}

async function runSingleMatch(matchNumber: number, baseUrl: string): Promise<{ summary: MatchSummary; issues: SimulationIssue[] }> {
  const issues: SimulationIssue[] = [];
  const seedCode = `T${String(matchNumber).padStart(3, "0")}`;
  const players = [
    new VirtualPlayer({ name: `Host-${matchNumber}`, roomCode: seedCode, isHost: true, baseUrl, issues }),
    new VirtualPlayer({ name: `PlayerA-${matchNumber}`, roomCode: seedCode, isHost: false, baseUrl, issues }),
    new VirtualPlayer({ name: `PlayerB-${matchNumber}`, roomCode: seedCode, isHost: false, baseUrl, issues })
  ];

  const startedAt = Date.now();

  try {
    const hostEntered = await players[0].connectAndEnter();
    const roomCode = hostEntered.code;

    for (let index = 1; index < players.length; index += 1) {
      players[index].disconnect();
      players[index] = new VirtualPlayer({
        name: players[index].name,
        roomCode,
        isHost: false,
        baseUrl,
        issues
      });
      await players[index].connectAndEnter();
    }

    players[0].socket.emit("room:start", { roomCode });

    const timeoutAt = Date.now() + 70000;
    let observedTurns = 0;
    let latestPhase = "lobby";
    let logsCaptured = 0;

    while (Date.now() < timeoutAt) {
      await delay(250);

      players.forEach((player) => player.maybeAct(matchNumber));

      const hostState = players[0].latestState;
      if (!hostState) {
        continue;
      }

      latestPhase = hostState.publicState.phase;
      observedTurns = Math.max(observedTurns, hostState.publicState.round);
      logsCaptured = hostState.publicState.logs.length;

      if (hostState.publicState.phase === "finished") {
        return {
          summary: {
            match: matchNumber,
            roomCode,
            turnsObserved: observedTurns,
            durationMs: Date.now() - startedAt,
            finalPhase: latestPhase,
            logsCaptured,
            finished: true
          },
          issues
        };
      }
    }

    issues.push({ match: matchNumber, message: `第 ${matchNumber} 局在 70 秒内没有结束，最终停在 ${latestPhase}。` });
    return {
      summary: {
        match: matchNumber,
        roomCode,
        turnsObserved: observedTurns,
        durationMs: Date.now() - startedAt,
        finalPhase: latestPhase,
        logsCaptured,
        finished: false
      },
      issues
    };
  } finally {
    players.forEach((player) => player.disconnect());
  }
}

function formatReport(summaries: MatchSummary[], issues: SimulationIssue[], baseUrl: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const passed = summaries.filter((summary) => summary.finished).length;
  const failed = summaries.length - passed;
  const uniqueIssues = [...new Map(issues.map((issue) => [`${issue.match}:${issue.message}`, issue])).values()];

  return `# 自动化多轮测试报告

- 运行日期：${today}
- 目标地址：${baseUrl}
- 总局数：${summaries.length}
- 通过局数：${passed}
- 失败局数：${failed}

## 运行概况

| 局数 | 房间号 | 轮次 | 用时(ms) | 最终阶段 | 日志条数 | 结果 |
| --- | --- | --- | --- | --- | --- | --- |
${summaries
  .map(
    (summary) =>
      `| ${summary.match} | ${summary.roomCode} | ${summary.turnsObserved} | ${summary.durationMs} | ${summary.finalPhase} | ${summary.logsCaptured} | ${summary.finished ? "通过" : "失败"} |`
  )
  .join("\n")}

## 发现的异常

${uniqueIssues.length === 0 ? "本轮未捕获异常。" : uniqueIssues.map((issue) => `- 第 ${issue.match} 局：${issue.message}`).join("\n")}

## 结论

- 当前脚本采用 Socket.IO 直连，不依赖浏览器。
- 自动玩家使用“准备 -> 自动出牌 -> 讨论阶段自动确认 -> 剧情抉择默认选第一项”的保守策略。
- 如果这里仍然失败，问题更可能在服务端阶段推进或状态同步，而不是页面点击逻辑。
`;
}

async function main(): Promise<void> {
  const matches = Number(process.env.MATCHES ?? "10");
  const port = Number(process.env.PORT ?? "3000");
  const baseUrl = process.env.TEST_BASE_URL ?? `http://127.0.0.1:${port}`;
  const reportDir = join(process.cwd(), "docs", "test-reports");
  const reportPath = join(reportDir, `auto-test-${new Date().toISOString().slice(0, 10)}.md`);

  const { process: devProcess } = await startDevServerIfNeeded(baseUrl);
  const summaries: MatchSummary[] = [];
  const issues: SimulationIssue[] = [];

  try {
    for (let match = 1; match <= matches; match += 1) {
      const result = await runSingleMatch(match, baseUrl);
      summaries.push(result.summary);
      issues.push(...result.issues);
    }
  } finally {
    if (devProcess) {
      devProcess.kill();
    }
  }

  await mkdir(reportDir, { recursive: true });
  await writeFile(reportPath, formatReport(summaries, issues, baseUrl), "utf8");

  console.log(`自动化测试完成，报告已写入 ${reportPath}`);
}

main().catch((error) => {
  console.error("自动化测试脚本执行失败", error);
  process.exit(1);
});
