import type { GameStateVariables } from "./schema";

// ── 默认初始状态 ──

const DEFAULT_STATE: GameStateVariables = {
  deathCount: 0,
  nightmareBlockCount: 0,
  saltSpreadDistance: 0,
  hoursElapsed: 0,
  orgConflictLevel: 0,
  truthConnectionCount: 0,
};

// ── 状态管理类 ──

/** 游戏运行时状态管理——供 text-resolver、golden-path 和 Storylet 触发判定使用 */
export class GameState {
  private variables: GameStateVariables;
  private listeners: Array<(key: string, value: number | boolean | string) => void>;

  constructor(initial?: Partial<GameStateVariables>) {
    this.variables = { ...DEFAULT_STATE, ...initial };
    this.listeners = [];
  }

  // ── 通用读写 ──

  get(key: string): number | boolean | string | undefined {
    return this.variables[key];
  }

  set(key: string, value: number | boolean | string): void {
    this.variables[key] = value;
    this.notify(key, value);
  }

  /** 数值递增（仅当目标为 number 类型时有效） */
  increment(key: string, delta = 1): void {
    const current = this.variables[key];
    if (typeof current === "number") {
      this.variables[key] = current + delta;
      this.notify(key, this.variables[key]);
    }
  }

  /** 获取完整快照 */
  snapshot(): GameStateVariables {
    return { ...this.variables };
  }

  // ── 便利方法：布尔标记 ──

  flag(clueId: string): void {
    this.set(clueId, true);
  }

  isFlagged(key: string): boolean {
    return this.variables[key] === true;
  }

  // ── 便利方法：案件特定标记 ──

  // 线索发现标记
  markClueFound(clueId: string): void {
    this.flag(`clue_${clueId}`);
    this.increment("truthConnectionCount");
  }

  // 死者计数
  addDeath(): void {
    this.increment("deathCount");
  }

  // 噩梦扩散街区计数
  setNightmareBlocks(count: number): void {
    this.set("nightmareBlockCount", count);
  }

  // 盐痕扩散距离（米）
  setSaltSpread(distance: number): void {
    this.set("saltSpreadDistance", distance);
  }

  // 组织冲突度（0-3）
  raiseOrgConflict(): void {
    this.increment("orgConflictLevel");
  }

  // ── 监听通知 ──

  /** 注册状态变化监听器（供 golden-path 等模块订阅） */
  onChange(listener: (key: string, value: number | boolean | string) => void): void {
    this.listeners.push(listener);
  }

  /** 重置所有状态 */
  reset(): void {
    this.variables = { ...DEFAULT_STATE };
  }

  private notify(key: string, value: number | boolean | string): void {
    for (const listener of this.listeners) {
      listener(key, value);
    }
  }
}
