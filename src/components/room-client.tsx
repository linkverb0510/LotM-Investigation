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
  hasActed: boolean;
  corruption: number;
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
  roundLocations: Record<string, string[]>;
}

interface FrontendPlayerState {
  publicState: FrontendPublicState;
  privateHand: FrontendCard[];
  privateClueIds: string[];
  privateClueTexts: Array<{ id: string; title: string; text: string }>;
  roleId: string;
  roleName: string;
  roleOrg: string;
  attributes: Record<string, number> | null;
  spirituality: number;
  maxSpirituality: number;
  corruption: number;
  agendaCompleted: boolean;
  firstLook: string;
  agendaGoal: string;
  agendaResult: string;
  selfPlayerId: string;
  inventory: Array<{ id: string; name: string; type: string }>;
  readyPlayers: string[];
  lastOutcome?: {
    playerId: string;
    storyletTitle: string;
    publicRollSummary: string;
    privateNarrative: string;
    newPublicClueIds: string[];
    checkOutcome: { tier: string; d20Roll: number; finalResult: number; difficulty: number };
  } | null;
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

// ── 调查目标 ──

interface TargetInfo { id: string; name: string; hint: string; }

const TARGETS_UP: TargetInfo[] = [
  { id: "basement", name: "教堂地下室", hint: "灰白盐痕的源头 · 石碑所在" },
  { id: "morgue", name: "临时停尸房", hint: "死者的遗言 · 尸检记录" },
  { id: "archives", name: "值夜者档案室", hint: "被借走的旧案记录" },
  { id: "church_perimeter", name: "教堂周边街区", hint: "巡夜人证词矛盾点" },
  { id: "spirit_realm", name: "灵界边缘", hint: "不散的残响" },
];

const TARGETS_DOWN: TargetInfo[] = [
  ...TARGETS_UP,
  { id: "charity_office", name: "慈善项目办公室", hint: "亚瑟的签名 · 被安排的路线" },
];

// ── 线索 ID → 标题映射 ──

const CLUE_LABELS: Record<string, { title: string; desc: string }> = {
  "clue_seed-public-salt-spread": { title: "灰白盐痕", desc: "地下室地面的不完整仪式圆弧" },
  "clue_seed-public-missing-page": { title: "尸检缺页", desc: "被灵性火焰销毁的最后一页" },
  "clue_seed-public-watchman-contradiction": { title: "证词矛盾", desc: "巡夜人无意识偏离巡逻路线" },
  "clue_seed-public-salt-expansion": { title: "盐痕扩散", desc: "灰白结晶在自行向外生长" },
  "clue_seed-public-second-body": { title: "第二名死者", desc: "非教会的异常祷告手势" },
  "clue_seed-public-artifacts-resonance": { title: "封印物同源", desc: "三件封印物同时指向教堂地下" },
  "clue_seed-public-missing-archives": { title: "旧案档案空缺", desc: "三年前的文件被人借走从未归还" },
  "clue_seed-public-nightmare-wave": { title: "共同噩梦", desc: "居民做着相同的梦" },
  "clue_seed-public-charity-route": { title: "被安排的路线", desc: "慈善点位像一张向地下收束的网" },
};

function getClueLabel(cid: string): string {
  return CLUE_LABELS[cid]?.title ?? cid.replace("clue_seed-public-", "").replace(/-/g, " ");
}

function getClueDesc(cid: string): string {
  return CLUE_LABELS[cid]?.desc ?? "";
}

// ── 卡牌类别 → 颜色+图标 ──

const CARD_STYLE: Record<string, { color: string; icon: string; bg: string }> = {
  "搜证": { color: "#d4a574", icon: "🔍", bg: "#d4a57415" },
  "净化": { color: "#58a6ff", icon: "💙", bg: "#58a6ff15" },
  "压制": { color: "#f85149", icon: "⚔️", bg: "#f8514915" },
  "接触": { color: "#3fb950", icon: "🤝", bg: "#3fb95015" },
  "掩饰": { color: "#bc8c4c", icon: "🃏", bg: "#bc8c4c15" },
  "调度": { color: "#8b5cf6", icon: "📋", bg: "#8b5cf615" },
  "封印物": { color: "#d29922", icon: "⚠️", bg: "#d2992215" },
};

function getCardStyle(card: any): { color: string; icon: string; bg: string } {
  for (const [key, style] of Object.entries(CARD_STYLE)) {
    if ((card.category || "").includes(key)) return style;
    if ((card.description || "").includes(key)) return style;
  }
  return { color: "#8b949e", icon: "🃏", bg: "#8b949e15" };
}

// ═══════════════════════════════════════
//  主组件
// ═══════════════════════════════════════

export function RoomClient({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<FrontendRoom | null>(null);
  const [state, setState] = useState<FrontendPlayerState | null>(null);
  const [error, setError] = useState("");
  const [selectedCard, setSelectedCard] = useState<FrontendCard | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [readySubmitting, setReadySubmitting] = useState(false);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [diceModal, setDiceModal] = useState<FrontendPlayerState["lastOutcome"] | null>(null);
  const [lastShownOutcome, setLastShownOutcome] = useState("");
  const [abilityResult, setAbilityResult] = useState<string | null>(null);
  const [perceptionText, setPerceptionText] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; senderName: string; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");

  const roleId = state?.roleId ?? "";

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

    socket.on("game:ability_result", (payload: { resultText: string }) => {
      setAbilityResult(payload.resultText);
    });

    socket.on("game:ability_perceived", (payload: { text: string }) => {
      setPerceptionText(payload.text);
    });

    socket.on("room:chat", (msg: { id: string; senderName: string; text: string }) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("room:updated");
      socket.off("game:state");
      socket.off("server:error");
      socket.off("game:ability_result");
      socket.off("game:ability_perceived");
      socket.off("room:chat");
    };
  }, [roomCode]);

  // 检测新的 lastOutcome 并弹出骰子结果
  useEffect(() => {
    if (state?.lastOutcome && state.lastOutcome.privateNarrative !== lastShownOutcome) {
      setDiceModal(state.lastOutcome);
      setLastShownOutcome(state.lastOutcome.privateNarrative);
    }
  }, [state?.lastOutcome]);

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
    if (!selectedTargetId) {
      setError("请先选择调查目标");
      return;
    }
    setSelectedCard(null);
    setSelectedTargetId(null);
    getSocket().emit("game:play", {
      roomCode,
      cardId: card.id,
      isFaceDown: false,
      targetPlayerId: selectedTargetId,
    });
  };

  const handleVote = (targetId: string) => {
    setVoteSubmitting(true);
    getSocket().emit("game:vote", { roomCode, targetPlayerId: targetId });
  };

  const handleAbility = (abilityId: string, targetPlayerId: string) => {
    getSocket().emit("game:ability", { roomCode, abilityId, targetPlayerId });
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    getSocket().emit("game:chat", { roomCode, text: chatInput.trim() });
    setChatInput("");
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
          {(state?.privateClueTexts?.length ?? 0) > 0 && (
            <div style={{ marginTop: 12, background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 13, color: "#d4a574", marginBottom: 8 }}>📋 私密发现</div>
              {state?.privateClueTexts?.map((ct) => (
                <div key={ct.id} style={{ fontSize: 11, color: "#c9d1d9", padding: "6px 0", borderBottom: "1px solid #30363d", lineHeight: 1.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#d4a574", fontWeight: 600 }}>{ct.title}</span>
                    <button
                      onClick={() => getSocket().emit("game:share_clue", { roomCode, clueId: ct.id })}
                      style={{ background: "#23863622", border: "1px solid #23863644", color: "#3fb950", borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer" }}
                    >
                      📢 公开
                    </button>
                  </div>
                  <div style={{ color: "#8b949e", marginTop: 2 }}>{ct.text.length > 80 ? ct.text.slice(0, 80) + "..." : ct.text}</div>
                </div>
              ))}
            </div>
          )}

          {(state?.inventory?.length ?? 0) > 0 && (
            <div style={{ marginTop: 12, background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 13, color: "#d4a574", marginBottom: 8 }}>🎒 证物背包</div>
              {state?.inventory?.map((item) => (
                <div key={item.id} style={{ fontSize: 11, color: "#d4a574", padding: "3px 0" }}>
                  📎 {item.name}
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

              {/* 角色第一眼 */}
              {state?.firstLook && (
                <div style={{
                  maxWidth: 600, margin: "20px auto", padding: 20,
                  background: "#161b22", border: "1px solid #30363d", borderRadius: 10,
                  textAlign: "left", lineHeight: 1.9, fontSize: 14, color: "#c9d1d9",
                }}>
                  {state.firstLook}
                </div>
              )}

              {/* 个人议程 */}
              {state?.agendaGoal && (
                <div style={{
                  maxWidth: 600, margin: "16px auto", padding: 16,
                  background: "#d4a57411", border: "1px solid #d4a57444", borderRadius: 10,
                  textAlign: "left", lineHeight: 1.7, fontSize: 13, color: "#d4a574",
                }}>
                  <span style={{ fontWeight: 600 }}>🎯 个人目标：</span>{state.agendaGoal}
                </div>
              )}

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
                {currentPlayer?.id === state?.publicState.activePlayerId
                  ? selectedTargetId ? "🃏 选择行动卡" : "🎯 选择调查目标"
                  : "⏳ 等待其他玩家行动..."}
              </div>

              {/* 调查目标网格 */}
              {!selectedTargetId && currentPlayer?.id === state?.publicState.activePlayerId && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
                  {(phase === "investigation_up" ? TARGETS_UP : TARGETS_DOWN).map((t) => {
                    const coopCount = (state?.publicState?.roundLocations?.[t.id]?.length ?? 0);
                    const hasCoop = coopCount > 0;
                    return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTargetId(t.id)}
                      style={{
                        background: hasCoop ? "#d4a57411" : "#161b22",
                        border: `2px solid ${hasCoop ? "#d4a57466" : "#30363d"}`,
                        borderRadius: 10, padding: 16, cursor: "pointer",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#d4a574"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = hasCoop ? "#d4a57466" : "#30363d"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#d4a574" }}>{t.name}</span>
                        {hasCoop && (
                          <span style={{ fontSize: 11, color: "#3fb950", background: "#23863622", padding: "2px 6px", borderRadius: 4 }}>
                            🤝 {coopCount}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#8b949e", marginTop: 6 }}>{t.hint}</div>
                    </div>
                    );
                  })}
                </div>
              )}

              {/* 已选目标提示 */}
              {selectedTargetId && (
                <div style={{ marginBottom: 20, padding: "8px 16px", background: "#d4a57411", border: "1px solid #d4a57444", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ color: "#d4a574", fontSize: 13 }}>
                      🎯 选中：{TARGETS_UP.find(t => t.id === selectedTargetId)?.name ?? selectedTargetId}
                    </span>
                    {(state?.publicState?.roundLocations?.[selectedTargetId]?.length ?? 0) > 0 && (
                      <span style={{ color: "#3fb950", fontSize: 12, marginLeft: 12 }}>
                        🤝 {state?.publicState?.roundLocations?.[selectedTargetId]
                          ?.map((pid) => state.publicState.players.find((p) => p.id === pid)?.roleName)
                          .filter(Boolean)
                          .join("、")} 已在此调查
                      </span>
                    )}
                  </div>
                  <button onClick={() => setSelectedTargetId(null)} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: 13 }}>
                    重新选择
                  </button>
                </div>
              )}

              {/* 玩家列表 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 20 }}>
                {state?.publicState?.players?.map((p) => (
                  <div key={p.id} style={{
                    background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: 12,
                    opacity: p.hasActed ? 0.5 : 1,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "#8b949e" }}>{p.roleName} · {p.roleTitle}</div>
                    {p.hasActed && <div style={{ fontSize: 11, color: "#3fb950", marginTop: 4 }}>✅ 已行动</div>}
                    {!p.hasActed && <div style={{ fontSize: 11, color: "#8b949e", marginTop: 4 }}>⏳ 行动中</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 讨论阶段 */}
          {inDiscussion && (
            <div style={{ padding: 20 }}>
              <h2 style={{ fontSize: 20, color: "#d4a574", textAlign: "center" }}>案件讨论</h2>

              {/* 聊天区域 */}
              <div style={{
                maxWidth: 700, margin: "16px auto", background: "#161b22", border: "1px solid #30363d",
                borderRadius: 10, height: 260, overflow: "auto", padding: 12,
              }}>
                {chatMessages.length === 0 && (
                  <div style={{ color: "#484f58", fontSize: 13, textAlign: "center", padding: 40 }}>
                    暂无发言——你是第一个打破沉默的人吗？
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <div key={msg.id} style={{ padding: "4px 0", borderBottom: "1px solid #1a1f2b" }}>
                    <span style={{ color: "#d4a574", fontSize: 12, fontWeight: 600 }}>{msg.senderName}: </span>
                    <span style={{ color: "#c9d1d9", fontSize: 13 }}>{msg.text}</span>
                  </div>
                ))}
              </div>

              {/* 聊天输入 */}
              <div style={{ maxWidth: 700, margin: "8px auto", display: "flex", gap: 8 }}>
                <input
                  style={{
                    flex: 1, background: "#0d1117", border: "1px solid #30363d", color: "#c9d1d9",
                    padding: "8px 12px", borderRadius: 6, fontSize: 13, outline: "none",
                  }}
                  placeholder="分享你的发现..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                />
                <button
                  onClick={sendChat}
                  style={{ padding: "8px 16px", background: "#238636", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
                >
                  发送
                </button>
              </div>

              {/* 途径能力 */}
              {roleId === "role-04-cecilia" && (
                <div style={{ marginTop: 16 }}>
                  <span style={{ color: "#8b949e", fontSize: 12 }}>🔍 观众途径 · 情绪窥探：</span>
                  {state?.publicState?.players?.filter(p => p.id !== state.selfPlayerId).map((p) => (
                    <button key={p.id} onClick={() => handleAbility("cecilia-empathy-read", p.id)}
                      style={{ margin: 4, padding: "4px 12px", background: "#d4a57422", color: "#d4a574", border: "1px solid #d4a57444", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                      读取 {p.roleName}
                    </button>
                  ))}
                </div>
              )}
              {roleId === "role-01-edwin" && (
                <div style={{ marginTop: 16 }}>
                  <span style={{ color: "#8b949e", fontSize: 12 }}>🌙 不眠者途径 · 梦境触碰：</span>
                  {state?.publicState?.players?.filter(p => p.id !== state.selfPlayerId).map((p) => (
                    <button key={p.id} onClick={() => handleAbility("edwin-dream-touch", p.id)}
                      style={{ margin: 4, padding: "4px 12px", background: "#58a6ff22", color: "#58a6ff", border: "1px solid #58a6ff44", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                      触碰 {p.roleName}
                    </button>
                  ))}
                </div>
              )}
              {roleId === "role-06-elias" && (
                <div style={{ marginTop: 16 }}>
                  <span style={{ color: "#8b949e", fontSize: 12 }}>👁️ 窥秘人途径 · 灵体观察：</span>
                  {state?.publicState?.players?.filter(p => p.id !== state.selfPlayerId).map((p) => (
                    <button key={p.id} onClick={() => handleAbility("elias-aura-scan", p.id)}
                      style={{ margin: 4, padding: "4px 12px", background: "#d2992222", color: "#d29922", border: "1px solid #d2992244", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                      观察 {p.roleName}
                    </button>
                  ))}
                </div>
              )}
              {roleId === "role-02-lyle" && (
                <div style={{ marginTop: 16 }}>
                  <span style={{ color: "#8b949e", fontSize: 12 }}>🃏 占卜家途径 · 痕迹鉴定：</span>
                  {state?.publicState?.players?.filter(p => p.id !== state.selfPlayerId).map((p) => (
                    <button key={p.id} onClick={() => handleAbility("lyle-trace-detect", p.id)}
                      style={{ margin: 4, padding: "4px 12px", background: "#bc8c4c22", color: "#bc8c4c", border: "1px solid #bc8c4c44", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                      鉴定 {p.roleName}
                    </button>
                  ))}
                </div>
              )}
              {roleId === "role-03-austen" && (
                <div style={{ marginTop: 16 }}>
                  <span style={{ color: "#8b949e", fontSize: 12 }}>⚓ 水手途径 · 威胁评估：</span>
                  {state?.publicState?.players?.filter(p => p.id !== state.selfPlayerId).map((p) => (
                    <button key={p.id} onClick={() => handleAbility("austen-threat-assess", p.id)}
                      style={{ margin: 4, padding: "4px 12px", background: "#58a6ff22", color: "#58a6ff", border: "1px solid #58a6ff44", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                      评估 {p.roleName}
                    </button>
                  ))}
                </div>
              )}
              {roleId === "role-05-devlin" && (
                <div style={{ marginTop: 16 }}>
                  <span style={{ color: "#8b949e", fontSize: 12 }}>💀 收尸人途径 · 灵界共鸣：</span>
                  {state?.publicState?.players?.filter(p => p.id !== state.selfPlayerId).map((p) => (
                    <button key={p.id} onClick={() => handleAbility("devlin-spirit-resonance", p.id)}
                      style={{ margin: 4, padding: "4px 12px", background: "#8b5cf622", color: "#8b5cf6", border: "1px solid #8b5cf644", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                      共鸣 {p.roleName}
                    </button>
                  ))}
                </div>
              )}
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

              {state?.publicState?.resolutionPath ? (
                <div>
                  <p style={{ color: "#8b949e", marginTop: 16, maxWidth: 600, margin: "16px auto", lineHeight: 1.8 }}>
                    {state.publicState.resolutionPath === "perfect"
                      ? "石碑被重新封印，旧案报告重见天日。真相抵达了该抵达的人。"
                      : state.publicState.resolutionPath === "compromise"
                      ? "事情被压住了，名字被保住了。但你们都知道，还有什么东西停在封签后面。"
                      : "崩坏不是结束，而是那句低语变得更安静、更不肯离开的开始。"}
                  </p>
                  {state?.agendaResult && (
                    <div style={{ maxWidth: 600, margin: "20px auto", padding: 16, background: "#d4a57411", border: "1px solid #d4a57444", borderRadius: 10, textAlign: "left", lineHeight: 1.8, fontSize: 13, color: "#d4a574" }}>
                      <span style={{ fontWeight: 600 }}>{state.agendaCompleted ? "✅ 目标达成" : "❌ 目标未达成"}</span>
                      <div style={{ marginTop: 8, color: "#c9d1d9" }}>{state.agendaResult}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p style={{ color: "#8b949e", marginTop: 16, maxWidth: 500, margin: "16px auto" }}>
                    调查已进入最后阶段。局势不可逆转。你和其他调查员必须做出最终决定——如何处置这块石碑？
                  </p>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
                    <button onClick={() => handleVote("seal")}
                      style={{ padding: "12px 24px", background: "#1f6feb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, maxWidth: 200 }}>
                      🔒 封印石碑<br /><span style={{ fontSize: 11, opacity: 0.7 }}>联合执行高阶封印程序</span>
                    </button>
                    <button onClick={() => handleVote("reveal")}
                      style={{ padding: "12px 24px", background: "#d4a574", color: "#0d1117", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, maxWidth: 200 }}>
                      📖 揭露真相<br /><span style={{ fontSize: 11, opacity: 0.7 }}>公开旧案报告与亚瑟的关联</span>
                    </button>
                    <button onClick={() => handleVote("compromise")}
                      style={{ padding: "12px 24px", background: "#30363d", color: "#8b949e", border: "1px solid #484f58", borderRadius: 8, cursor: "pointer", fontSize: 14, maxWidth: 200 }}>
                      🤝 妥协封存<br /><span style={{ fontSize: 11, opacity: 0.7 }}>控制局面，暂不公开全部真相</span>
                    </button>
                  </div>
                </div>
              )}
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
              state?.publicState?.publicClueIds?.map((cid) => (
                <div key={cid} style={{ fontSize: 11, padding: "6px 0", borderBottom: "1px solid #30363d" }}>
                  <div style={{ color: "#d4a574", fontWeight: 600 }}>📜 {getClueLabel(cid)}</div>
                  <div style={{ color: "#8b949e", marginTop: 2 }}>{getClueDesc(cid)}</div>
                </div>
              ))
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

      {/* ── 手牌区（仅行动阶段 + 已选目标） ── */}
      {inAction && selectedTargetId && state?.privateHand && (
        <footer style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "#161b22", borderTop: "1px solid #30363d",
          padding: "12px 20px", display: "flex", gap: 12, justifyContent: "center",
        }}>
          {state.privateHand.map((card) => {
            const style = getCardStyle(card);
            const isSelected = selectedCard?.id === card.id;
            return (
              <div
                key={card.id}
                onClick={() => {
                  if (currentPlayer?.hasActed) { setError("本轮已行动"); return; }
                  setSelectedCard(card);
                }}
                style={{
                  background: isSelected ? "#1f6feb22" : style.bg,
                  border: `2px solid ${isSelected ? "#58a6ff" : style.color + "44"}`,
                  borderLeft: `4px solid ${style.color}`,
                  borderRadius: 8, padding: "10px 14px", cursor: "pointer",
                  minWidth: 160, maxWidth: 200,
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>{style.icon} {card.name}</div>
                <div style={{ fontSize: 11, color: style.color, marginTop: 2 }}>{card.cost.spirituality} 灵性</div>
                <div style={{ fontSize: 11, color: "#8b949e", marginTop: 4, lineHeight: 1.4 }}>{card.description}</div>
              </div>
            );
          })}
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

      {/* ── 骰子结果弹窗 ── */}
      {diceModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setDiceModal(null)}
        >
          <div
            style={{
              background: "#161b22", border: "1px solid #30363d", borderRadius: 14,
              padding: 28, maxWidth: 500, width: "90%", textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: "#8b949e", fontSize: 13, marginBottom: 8 }}>{diceModal.storyletTitle}</div>
            <div style={{
              fontSize: 36, fontWeight: 800, margin: "12px 0",
              color: diceModal.checkOutcome.tier === "revelation" ? "#d4a574" :
                     diceModal.checkOutcome.tier === "success" ? "#3fb950" :
                     diceModal.checkOutcome.tier === "partial" ? "#d29922" :
                     diceModal.checkOutcome.tier === "catastrophe" ? "#f85149" : "#8b949e",
            }}>
              🎲 {diceModal.checkOutcome.d20Roll}
            </div>
            <div style={{ fontSize: 14, color: "#c9d1d9", marginBottom: 8 }}>
              D20={diceModal.checkOutcome.d20Roll} + 属性 → {diceModal.checkOutcome.finalResult} vs 难度{diceModal.checkOutcome.difficulty}
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700, marginBottom: 16,
              color: diceModal.checkOutcome.tier === "revelation" ? "#d4a574" :
                     diceModal.checkOutcome.tier === "success" ? "#3fb950" :
                     diceModal.checkOutcome.tier === "catastrophe" ? "#f85149" : "#d29922",
            }}>
              {diceModal.checkOutcome.tier === "revelation" ? "✨ 天启" :
               diceModal.checkOutcome.tier === "success" ? "✅ 成功" :
               diceModal.checkOutcome.tier === "partial" ? "⚡ 勉强" :
               diceModal.checkOutcome.tier === "catastrophe" ? "💀 灾厄" : "❌ 失败"}
            </div>
            <div style={{ textAlign: "left", lineHeight: 1.8, fontSize: 13, color: "#c9d1d9", maxHeight: 200, overflow: "auto", padding: "0 4px" }}>
              {diceModal.privateNarrative}
            </div>
            {diceModal.newPublicClueIds.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: "#3fb950" }}>📌 新公共线索已添加到线索板</div>
            )}
            <button
              onClick={() => setDiceModal(null)}
              style={{ marginTop: 20, padding: "8px 24px", background: "#30363d", color: "#c9d1d9", border: "1px solid #484f58", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* ── 途径能力结果弹窗 ── */}
      {abilityResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setAbilityResult(null)}>
          <div style={{ background: "#161b22", border: "1px solid #d4a57444", borderRadius: 14, padding: 24, maxWidth: 450, width: "90%" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ color: "#d4a574", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🔍 探查结果</div>
            <div style={{ color: "#c9d1d9", fontSize: 13, lineHeight: 1.8 }}>{abilityResult}</div>
            <button onClick={() => setAbilityResult(null)}
              style={{ marginTop: 16, padding: "8px 24px", background: "#30363d", color: "#c9d1d9", border: "1px solid #484f58", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>关闭</button>
          </div>
        </div>
      )}

      {/* ── 被动感知弹窗 ── */}
      {perceptionText && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setPerceptionText(null)}>
          <div style={{ background: "#161b22", border: "1px solid #58a6ff44", borderRadius: 14, padding: 24, maxWidth: 450, width: "90%" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ color: "#58a6ff", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🌙 被动感知</div>
            <div style={{ color: "#c9d1d9", fontSize: 13, lineHeight: 1.8 }}>{perceptionText}</div>
            <div style={{ color: "#8b949e", fontSize: 11, marginTop: 12 }}>你不知道是谁在窥探——但你知道有人在看着你。</div>
            <button onClick={() => setPerceptionText(null)}
              style={{ marginTop: 16, padding: "8px 24px", background: "#30363d", color: "#c9d1d9", border: "1px solid #484f58", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>关闭</button>
          </div>
        </div>
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
