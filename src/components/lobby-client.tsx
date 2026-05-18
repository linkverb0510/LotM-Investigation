"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getSocket } from "@/lib/server/socket-client";
import type { RoomSummary } from "@/lib/game/types";

function getPhaseLabel(phase: RoomSummary["phase"]): string {
  const labels: Record<RoomSummary["phase"], string> = {
    lobby: "等待集结",
    briefing: "集结阶段",
    investigation_up: "调查上半场",
    discussion_1: "第一次讨论",
    investigation_down: "调查下半场",
    discussion_2: "第二次讨论",
    showdown: "最终对决",
    finished: "已结算"
  };

  return labels[phase];
}

export function LobbyClient() {
  const router = useRouter();
  const [hostName, setHostName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [error, setError] = useState("");
  const [joinedRoomCode, setJoinedRoomCode] = useState("");

  useEffect(() => {
    const socket = getSocket();

    socket.emit("rooms:list");
    socket.on("rooms:list", (payload: RoomSummary[]) => setRooms(payload));
    socket.on("room:entered", (payload: { code: string }) => {
      setJoinedRoomCode(payload.code);
      router.push(`/rooms/${payload.code}`);
    });
    socket.on("room:updated", (payload: RoomSummary) => {
      socket.emit("rooms:list");
    });
    socket.on("server:error", (message: string) => setError(message));

    return () => {
      socket.off("rooms:list");
      socket.off("room:entered");
      socket.off("room:updated");
      socket.off("server:error");
    };
  }, [router]);

  const createRoom = (): void => {
    setError("");
    const fallbackName = hostName.trim() || "灰雾主持人";
    getSocket().emit("room:create", { hostName: fallbackName });
  };

  const joinRoom = (): void => {
    setError("");

    if (!roomCode.trim()) {
      setError("请输入房间号。");
      return;
    }

    getSocket().emit("room:join", {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: playerName.trim() || "无名值夜者"
    });
  };

  return (
    <div className="page-shell stack">
      <section className="hero-card grid two-col">
        <div className="stack" style={{ justifyContent: "space-between" }}>
          <div className="stack">
            <span className="hero-badge">深蓝雾都 / 蒸汽秘仪 / 房间对局</span>
            <div className="stack" style={{ gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: "3.2rem", lineHeight: 1.05 }}>
                Mystery Card Club
              </h1>
              <p className="muted" style={{ margin: 0, lineHeight: 1.8 }}>
                贝克兰德的雾霾遮掩了真相。你与朋友将在同一张牌桌上扮演值夜者、密修会成员或被污染者，
                在神秘学卡牌、阵营信息和公开讨论之间寻找真正的敌人。
              </p>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <div className="info-card">
              <div className="muted small-text">推荐人数</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>3 - 6 人</div>
            </div>
            <div className="info-card">
              <div className="muted small-text">对局定位</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>社交推理</div>
            </div>
            <div className="info-card">
              <div className="muted small-text">主要机制</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>暗牌 / 讨论 / 资源博弈</div>
            </div>
            <div className="info-card">
              <div className="muted small-text">状态模型</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>灵性 / 污染 / 仪式进度</div>
            </div>
          </div>
        </div>

        <div className="panel stack" style={{ background: "rgba(8, 13, 28, 0.94)" }}>
          <h2 className="section-title">进入牌局</h2>

          <div className="stack">
            <label className="small-text muted">创建房间昵称</label>
            <input
              value={hostName}
              onChange={(event) => setHostName(event.target.value)}
              placeholder="例如：灰雾主持人"
            />
            <button onClick={createRoom}>创建新房间</button>
          </div>

          <div className="stack">
            <label className="small-text muted">加入房间昵称</label>
            <input
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="例如：第七值夜者"
            />
          </div>

          <div className="stack">
            <label className="small-text muted">房间号</label>
            <div className="inline" style={{ alignItems: "stretch" }}>
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                placeholder="输入四位房间码"
              />
              <button onClick={joinRoom}>加入房间</button>
            </div>
          </div>

          {error ? (
            <div className="info-card" style={{ background: "var(--danger-bg)", borderColor: "rgba(255, 107, 107, 0.28)" }}>
              <strong className="danger-text">加入失败</strong>
              <p style={{ margin: "6px 0 0" }}>{error}</p>
            </div>
          ) : null}

          {joinedRoomCode ? (
            <div className="info-card" style={{ background: "var(--warn-bg)" }}>
              <strong className="warning-text">正在进入房间 {joinedRoomCode}</strong>
              <p style={{ margin: "6px 0 0" }}>
                如果房间仍处于 `lobby`，你将看到“等待房主开始”的提示；房主开始后会自动切入 P0 剧情集结界面。
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid three-col">
        <div className="panel stack">
          <h2 className="section-title">玩法导向</h2>
          <p className="muted" style={{ margin: 0, lineHeight: 1.8 }}>
            游戏的乐趣不来自复杂公式，而来自“资源有限时该不该出手”“谁在偷偷推进仪式”“谁在故意引导讨论”。
            前端界面因此优先突出阶段、资源和公共信息，而不是把所有细节塞进一个列表里。
          </p>
        </div>

        <div className="panel stack">
          <h2 className="section-title">当前版本关注点</h2>
          <p className="muted" style={{ margin: 0, lineHeight: 1.8 }}>
            现在的前端已经开始围绕灵性、污染度、线索与仪式进度来组织信息。
            这意味着玩家能更容易看懂“自己能不能行动、局势是否危险、谁值得怀疑”。
          </p>
        </div>

        <div className="panel stack">
          <h2 className="section-title">在线房间</h2>
          <div className="room-list">
            {rooms.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                暂无活跃房间。你可以先创建一局，邀请朋友进入灰雾。
              </p>
            ) : null}

            {rooms.map((room) => (
              <div className="room-row" key={room.code}>
                <div className="stack" style={{ gap: 4 }}>
                  <strong style={{ fontSize: "1.1rem", color: "#f5dfab" }}>{room.code}</strong>
                  <div className="muted small-text">
                    房主：{room.hostName} · {room.playerCount} 人
                  </div>
                  <span className="pill">{getPhaseLabel(room.phase)}</span>
                </div>

                <Link href={`/rooms/${room.code}`}>
                  <button>进入</button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
