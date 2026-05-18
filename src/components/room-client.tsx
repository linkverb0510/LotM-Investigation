"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getSocket } from "@/lib/server/socket-client";
import type { FrontendCard } from "@/lib/game/investigation-engine";

// ── 前端状态类型 ──

interface FrontendRoom {
  code: string;
  hostName: string;
  players: Array<{ id: string; name: string; isHost: boolean }>;
  phase: string;
}

interface FrontendPlayer {
  id: string; name: string; isHost: boolean; isConnected: boolean;
  roleName: string; roleTitle: string; roleOrg: string;
  spirituality: number; maxSpirituality: number; corruption: number;
  handCount: number; hasActed: boolean;
}

interface FrontendPublicState {
  roomCode: string; phase: string; pressureTier: number; round: number;
  activePlayerId: string | null;
  players: FrontendPlayer[];
  publicClueIds: string[];
  discussionTopic: string | null;
  readyPlayers: string[];
  logs: Array<{ id: string; round: number; phase: string; text: string }>;
  resolutionPath: string | null;
}

interface FrontendPlayerState {
  publicState: FrontendPublicState;
  privateHand: FrontendCard[];
  privateClueIds: string[];
  roleId: string;
  roleName: string;
  roleOrg: string;
  attributes: Record<string, number> | null;
  spirituality: number;
  maxSpirituality: number;
  corruption: number;
  agendaCompleted: boolean;
  selfPlayerId: string;
  readyPlayers: string[];
}

// ── 辅助函数 ──

function phaseLabel(phase: string): string {
  const m: Record<string, string> = {
    lobby: "等待大厅",
    briefing: "P0 案情简报",
    investigation_up: "P1 第一轮行动",
    discussion_1: "P2 第一轮讨论",
    investigation_down: "P3 第二轮行动",
    discussion_2: "P4 第二轮讨论",
    resolution: "P5 收束",
  };
  return m[phase] ?? phase;
}

function pressureLabel(tier: number): string {
  const m = ["异常沉寂", "盐痕扩散", "噩梦蔓延", "仪式加速", "临界点", "失控"];
  return m[tier] ?? `Tier ${tier}`;
}

// ═══════════════════════════════════════
//  主组件
// ═══════════════════════════════════════

export function RoomClient({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<FrontendRoom | null>(null);
  const [state, setState] = useState<FrontendPlayerState | null>(null);
  const [error, setError] = useState("");
  const [selectedCard, setSelectedCard] = useState<FrontendCard | null>(null);
  const [readySubmitting, setReadySubmitting] = useState(false);
  const [voteSubmitting, setVoteSubmitting] = useState(false);

  // ── 连接 ──

  useEffect(() => {
    const socket = getSocket();

    socket.emit("rooms:list");

    socket.on("room:updated", (payload: FrontendRoom) => {
      if (payload.code === roomCode) setRoom(payload);
    });

    socket.on("game:state", (payload: FrontendPlayerState) => {
      if (payload.publicState?.roomCode === roomCode) {
        setState(payload);
        setReadySubmitting(false);
        setVoteSubmitting(false);
      }
    });

    socket.on("server:error", (message: string) => {
      setError(message);
      setReadySubmitting(false);
      setVoteSubmitting(false);
    });

    return () => {
      socket.off("room:updated");
      socket.off("game:state");
      socket.off("server:error");
    };
  }, [roomCode]);

  // ── 操作 ──

  const handleReady = () => {
    setError("");
    setReadySubmitting(true);
    getSocket().emit("game:ready", { roomCode });
  };

  const handlePlayCard = (card: FrontendCard) => {
    if (!state) return;
    const phase = state.publicState?.phase;
    if (!phase?.startsWith("investigation")) {
      setError("当前阶段不能行动");
      return;
    }
    // MVP: 不需要选目标，直接打出
    setSelectedCard(null);
    getSocket().emit("game:play", {
      roomCode,
      cardId: card.id,
      isFaceDown: false,
    });
  };

  const handleVote = (targetId: string) => {
    setVoteSubmitting(true);
    getSocket().emit("game:vote", { roomCode, targetPlayerId: targetId });
  };

  const startGame = () => {
    setError("");
    getSocket().emit("room:start", { roomCode });
  };

  // ── 渲染 ──

  const phase = state?.publicState?.phase ?? "lobby";
  const inBriefing = phase === "briefing";
  const inAction = phase.startsWith("investigation");
  const inDiscussion = phase.startsWith("discussion");
  const inResolution = phase === "resolution";
  const isReady = state?.readyPlayers?.includes(state?.selfPlayerId ?? "");
  const currentPlayer = state?.publicState?.players?.find(
    (p) => p.id === state?.selfPlayerId
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3", fontFamily: "system-ui, sans-serif" }}>
      {/* ── 顶部 HUD ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #30363d", background: "#161b22" }}>
        <div>
          <Link href="/" style={{ color: "#58a6ff", fontSize: 13, textDecoration: "none" }}>返回大厅</Link>
          <span style={{ margin: "0 8px", color: "#8b949e" }}>|</span>
          <strong>房间 {roomCode}</strong>
          {room && <span style={{ margin: "0 8px", color: "#8b949e" }}>· 房主 {room.hostName}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ background: "#1f6feb33", color: "#58a6ff", padding: "4px 10px", borderRadius: 4, fontSize: 13 }}>
            {phaseLabel(phase)}
          </span>
          {state && <span style={{ fontSize: 13, color: "#8b949e" }}>第 {state.publicState.round} 轮</span>}
          {state && (
            <span style={{ background: state.publicState.pressureTier >= 3 ? "#f8514922" : "#d4a57422", color: state.publicState.pressureTier >= 3 ? "#f85149" : "#d4a574", padding: "4px 10px", borderRadius: 4, fontSize: 13 }}>
              ⚡ {pressureLabel(state.publicState.pressureTier)}
            </span>
          )}
        </div>
      </header>

      {/* ── 主区域 ── */}
      <main style={{ display: "flex", padding: 20, gap: 20, maxWidth: 1400, margin: "0 auto" }}>

        {/* 左侧：角色面板 */}
        <aside style={{ width: 240, flexShrink: 0 }}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 16 }}>
            {state?.roleId ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#d4a574" }}>{state.roleName}</div>
                <div style={{ fontSize: 13, color: "#8b949e", marginTop: 4 }}>{state.roleOrg}</div>
                {state.attributes && (
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 12 }}>
                    <span>灵性 <b style={{ color: "#d4a574" }}>{state.attributes.aura}</b></span>
                    <span>洞察 <b style={{ color: "#d4a574" }}>{state.attributes.insight}</b></span>
                    <span>意志 <b style={{ color: "#d4a574" }}>{state.attributes.will}</b></span>
                    <span>体质 <b style={{ color: "#d4a574" }}>{state.attributes.physique}</b></span>
                    <span>诡诈 <b style={{ color: "#d4a574" }}>{state.attributes.cunning}</b></span>
                    <span>知识 <b style={{ color: "#d4a574" }}>{state.attributes.lore}</b></span>
                  </div>
                )}
                <div style={{ marginTop: 12, fontSize: 12, color: "#8b949e" }}>
                  灵性 {state.spirituality}/{state.maxSpirituality} · 污染 {currentPlayer?.corruption ?? 0}/10
                </div>
              </>
            ) : (
              <div style={{ color: "#8b949e", fontSize: 14 }}>等待游戏开始...</div>
            )}
          </div>

          {/* 私密线索 */}
          {(state?.privateClueIds?.length ?? 0) > 0 && (
            <div style={{ marginTop: 12, background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 13, color: "#d4a574", marginBottom: 8 }}>📋 你的私密发现</div>
              {state?.privateClueIds?.map((cid) => (
                <div key={cid} style={{ fontSize: 11, color: "#8b949e", padding: "4px 0", borderBottom: "1px solid #30363d" }}>
                  {cid.replace("clue_seed-public-", "").replace(/-/g, " ")}
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* 中间：主舞台 */}
        <section style={{ flex: 1 }}>
          {/* 简报阶段 */}
          {phase === "lobby" && (
            <div style={{ textAlign: "center", padding: 60 }}>
              <h1 style={{ fontSize: 28, color: "#d4a574" }}>贝克兰德的迷雾已经降临</h1>
              <p style={{ color: "#8b949e", marginTop: 16, maxWidth: 500, margin: "16px auto" }}>
                1352 年秋，贝克兰德东区。一周内数起异常死亡被秘密上报。你和几名身份各异的协助者被临时召集，要求在今夜查明真相。
              </p>
              {room && room.players.length >= 3 && room.players.find(p => p.isHost)?.name && (
                <button onClick={startGame} style={{ marginTop: 24, padding: "12px 32px", background: "#238636", color: "#fff", border: "none", borderRadius: 6, fontSize: 16, cursor: "pointer" }}>
                  开始游戏
                </button>
              )}
              {room && (
                <div style={{ marginTop: 20 }}>
                  {room.players.map((p) => (
                    <div key={p.id} style={{ color: "#8b949e", fontSize: 13, padding: 4 }}>{p.name}{p.isHost ? " (房主)" : ""}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 简报确认阶段 */}
          {inBriefing && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <h2 style={{ fontSize: 22, color: "#d4a574" }}>P0 案情简报</h2>
              <p style={{ color: "#8b949e", marginTop: 12 }}>阅读你的角色信息和私密隐情，准备就绪。</p>
              {!isReady ? (
                <button onClick={handleReady} disabled={readySubmitting}
                  style={{ marginTop: 20, padding: "10px 28px", background: "#1f6feb", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, cursor: "pointer" }}>
                  {readySubmitting ? "提交中..." : "准备就绪"}
                </button>
              ) : (
                <div style={{ color: "#3fb950", marginTop: 20 }}>✅ 已准备，等待其他玩家...</div>
              )}
              <div style={{ marginTop: 16, color: "#8b949e", fontSize: 13 }}>
                {state?.readyPlayers?.length ?? 0}/{state?.publicState?.players?.length ?? 0} 已准备
              </div>
            </div>
          )}

          {/* 行动阶段 */}
          {inAction && (
            <div>
              <div style={{ fontSize: 14, color: "#8b949e", marginBottom: 16 }}>
                {currentPlayer?.id === state?.publicState.activePlayerId ? "🎯 当前是你的行动回合" : "等待其他玩家行动..."}
              </div>
              {/* 玩家列表 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 20 }}>
                {state?.publicState?.players?.map((p) => (
                  <div key={p.id} style={{
                    background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 12,
                    opacity: p.hasActed ? 0.5 : 1,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "#8b949e" }}>{p.roleName} · {p.roleTitle}</div>
                    <div style={{ fontSize: 11, color: "#d4a574", marginTop: 4 }}>
                      灵 {p.spirituality}/{p.maxSpirituality} · 污 {p.corruption}/10
                    </div>
                    {p.hasActed && <div style={{ fontSize: 11, color: "#3fb950", marginTop: 4 }}>✅ 已行动</div>}
                    {state.publicState.readyPlayers?.length > 0 && <div style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>🃏 {p.handCount}张</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 讨论阶段 */}
          {inDiscussion && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <h2 style={{ fontSize: 20, color: "#d4a574" }}>案件讨论</h2>
              <p style={{ color: "#8b949e", marginTop: 8 }}>
                {state?.publicState?.discussionTopic ?? "根据当前发现，讨论并决定下一步行动。"}
              </p>
              <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {state?.publicState?.players?.map((p) => (
                  <button key={p.id} onClick={() => handleVote(p.id)} disabled={voteSubmitting}
                    style={{ padding: "8px 16px", background: "#1f6feb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                    相信 {p.roleName}
                  </button>
                ))}
                <button onClick={() => handleVote("advance")} disabled={voteSubmitting}
                  style={{ padding: "8px 16px", background: "#238636", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                  推进阶段
                </button>
              </div>
              {voteSubmitting && <div style={{ color: "#8b949e", marginTop: 12 }}>投票已提交...</div>}
            </div>
          )}

          {/* 收束阶段 */}
          {inResolution && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <h2 style={{ fontSize: 24, color: "#d4a574" }}>案件收束</h2>
              <p style={{ color: "#8b949e", marginTop: 16, maxWidth: 600, margin: "16px auto", lineHeight: 1.8 }}>
                {state?.publicState?.resolutionPath === "perfect"
                  ? "石碑被重新封印，旧案报告重见天日。真相抵达了该抵达的人。"
                  : state?.publicState?.resolutionPath === "compromise"
                  ? "事情被压住了，名字被保住了。但你们都知道，还有什么东西停在封签后面。"
                  : "崩坏不是结束，而是那句低语变得更安静、更不肯离开的开始。"}
              </p>
            </div>
          )}
        </section>

        {/* 右侧：公共线索板 */}
        <aside style={{ width: 240, flexShrink: 0 }}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 14, color: "#d4a574", marginBottom: 12 }}>📌 公共线索板</div>
            {(state?.publicState?.publicClueIds?.length ?? 0) === 0 ? (
              <div style={{ fontSize: 12, color: "#8b949e" }}>暂无公开线索</div>
            ) : (
              state?.publicState?.publicClueIds?.map((cid) => {
                const label = cid.replace("clue_seed-public-", "").replace(/-/g, " ");
                return (
                  <div key={cid} style={{ fontSize: 11, color: "#c9a96e", padding: "6px 0", borderBottom: "1px solid #30363d" }}>
                    📜 {label}
                  </div>
                );
              })
            )}
          </div>

          {/* 游戏日志 */}
          <div style={{ marginTop: 12, background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 16, maxHeight: 400, overflow: "auto" }}>
            <div style={{ fontSize: 13, color: "#d4a574", marginBottom: 8 }}>📝 调查日志</div>
            {(state?.publicState?.logs ?? []).slice(-15).map((log) => (
              <div key={log.id} style={{ fontSize: 11, color: "#8b949e", padding: "4px 0", borderBottom: "1px solid #1a1f2b" }}>
                {log.text}
              </div>
            ))}
          </div>
        </aside>
      </main>

      {/* ── 手牌区（仅行动阶段） ── */}
      {inAction && state?.privateHand && (
        <footer style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "#161b22", borderTop: "1px solid #30363d",
          padding: "12px 20px", display: "flex", gap: 12, justifyContent: "center",
        }}>
          {state.privateHand.map((card) => (
            <div
              key={card.id}
              onClick={() => {
                if (currentPlayer?.hasActed) {
                  setError("本轮已行动");
                  return;
                }
                setSelectedCard(card);
              }}
              style={{
                background: selectedCard?.id === card.id ? "#1f6feb22" : "#0d1117",
                border: `2px solid ${selectedCard?.id === card.id ? "#58a6ff" : "#30363d"}`,
                borderRadius: 8, padding: "10px 14px", cursor: "pointer",
                minWidth: 160, maxWidth: 200,
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>{card.name}</div>
              <div style={{ fontSize: 11, color: "#58a6ff", marginTop: 2 }}>{card.cost.spirituality} 灵性</div>
              <div style={{ fontSize: 11, color: "#8b949e", marginTop: 4, lineHeight: 1.4 }}>{card.description}</div>
            </div>
          ))}
          {selectedCard && !currentPlayer?.hasActed && (
            <button
              onClick={() => handlePlayCard(selectedCard)}
              style={{
                padding: "8px 20px", background: "#238636", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer",
                alignSelf: "center",
              }}
            >
              打出「{selectedCard.name}」
            </button>
          )}
          {currentPlayer?.hasActed && (
            <div style={{ alignSelf: "center", color: "#3fb950", fontSize: 14 }}>✅ 本轮已行动 — 等待下一轮</div>
          )}
        </footer>
      )}

      {/* ── 错误提示 ── */}
      {error && (
        <div style={{ position: "fixed", top: 12, right: 12, background: "#f8514922", border: "1px solid #f85149", color: "#f85149", padding: "8px 16px", borderRadius: 6, fontSize: 13, zIndex: 999 }}>
          {error}
          <button onClick={() => setError("")} style={{ marginLeft: 8, background: "none", border: "none", color: "#f85149", cursor: "pointer" }}>✕</button>
        </div>
      )}
    </div>
  );
}
