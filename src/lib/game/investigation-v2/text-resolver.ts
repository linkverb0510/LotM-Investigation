import type { TriggerContext } from "./schema";
import type { GameState } from "./game-state";

// ── 数字转中文 ──

const CHINESE_NUMERALS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

function toChineseNumeral(n: number): string {
  if (n <= 10) return CHINESE_NUMERALS[n] ?? String(n);
  if (n < 20) return "十" + (n % 10 === 0 ? "" : CHINESE_NUMERALS[n % 10]);
  return String(n); // 超过范围的直接用数字
}

// ── 变量解析映射表 ──

/** 已知变量路径 → 解析函数（返回替换字符串或 undefined 表示未匹配） */
type VariableResolver = (
  gameState: GameState,
  ctx: TriggerContext
) => string | undefined;

const VARIABLE_RESOLVERS: Record<string, VariableResolver> = {
  "trigger.role_name": (_, ctx) => ctx.triggeringRoleName,
  "trigger.role_title": (_, ctx) => ctx.triggeringRoleTitle,
  "trigger.role_org": (_, ctx) => ctx.triggeringRoleOrg,
  "location.name": (_, ctx) => ctx.triggeringLocation,
  "count.deaths": (s) => toChineseNumeral(s.get("deathCount") as number),
  "count.nightmare_blocks": (s) => toChineseNumeral(s.get("nightmareBlockCount") as number),
  "salt.spread_distance": (s) => `${s.get("saltSpreadDistance")}米`,
  "time.hours": (s) => `${s.get("hoursElapsed")}小时`,
};

// ── 条件判定 ──

function evaluateCondition(
  condition: string,
  gameState: GameState,
  ctx: TriggerContext
): boolean {
  const negated = condition.startsWith("!");
  const key = negated ? condition.slice(1) : condition;

  let result: boolean;

  switch (key) {
    // 触发者身份判断
    case "trigger_is_edwin":
      result = ctx.triggeringRoleId === "role-01-edwin";
      break;
    case "trigger_is_lyle":
      result = ctx.triggeringRoleId === "role-02-lyle";
      break;
    case "trigger_is_austen":
      result = ctx.triggeringRoleId === "role-03-austen";
      break;
    case "trigger_is_cecilia":
      result = ctx.triggeringRoleId === "role-04-cecilia";
      break;
    case "trigger_is_devlin":
      result = ctx.triggeringRoleId === "role-05-devlin";
      break;
    case "trigger_is_elias":
      result = ctx.triggeringRoleId === "role-06-elias";
      break;

    // 布尔状态标记
    case "has_visited_basement":
    case "clue_salt_found":
    case "clue_autopsy_missing_found":
    case "clue_witness_contradiction_found":
    case "clue_second_body_found":
    case "clue_artifact_resonance_found":
    case "clue_archive_missing_found":
    case "trigger_has_autopsy_experience":
      result = gameState.isFlagged(key);
      break;

    // 计数比较（格式：visit_count>1）
    default:
      // 尝试解析计数比较
      const compareMatch = key.match(/^(\w+)(>|<|>=|<=|==)(\d+)$/);
      if (compareMatch) {
        const [, stateKey, op, threshold] = compareMatch;
        const value = Number(gameState.get(stateKey)) || 0;
        const numThreshold = Number(threshold);
        switch (op) {
          case ">": result = value > numThreshold; break;
          case "<": result = value < numThreshold; break;
          case ">=": result = value >= numThreshold; break;
          case "<=": result = value <= numThreshold; break;
          case "==": result = value === numThreshold; break;
          default: result = false;
        }
      } else {
        result = false;
      }
  }

  return negated ? !result : result;
}

// ── 主解析函数 ──

/**
 * 解析 Storylet 文本中的占位符。
 * 先处理 {if:condition}...{/if} 条件块，再替换 {variable.path} 变量。
 * 当前版本不支持条件块嵌套（MVP 范围）。
 */
export function resolveText(
  textSeed: string,
  gameState: GameState,
  triggerContext: TriggerContext
): string {
  let result = textSeed;

  // Step 1: 条件块解析（{if:cond}...{/if} 和 {if:!cond}...{/if}）
  result = resolveConditionalBlocks(result, gameState, triggerContext);

  // Step 2: 变量替换（{variable.path}）
  result = resolveVariables(result, gameState, triggerContext);

  return result;
}

// ── 内部实现 ──

/** 条件块正则：匹配 {if:...}...{/if} */
const COND_BLOCK_RE = /\{if:(!?\w+(?:>\d+)?(?:<\d+)?(?:>=\d+)?(?:<=\d+)?(?:==\d+)?)\}([\s\S]*?)\{\/if\}/g;

function resolveConditionalBlocks(
  text: string,
  gameState: GameState,
  ctx: TriggerContext
): string {
  return text.replace(COND_BLOCK_RE, (_match, condition: string, body: string) => {
    const satisfied = evaluateCondition(condition.trim(), gameState, ctx);
    return satisfied ? body : "";
  });
}

/** 变量占位符正则：匹配 {xxx.yyy} 形式的变量 */
const VAR_RE = /\{([a-z_]+\.[a-z_]+)\}/g;

function resolveVariables(
  text: string,
  gameState: GameState,
  ctx: TriggerContext
): string {
  return text.replace(VAR_RE, (_match, varPath: string) => {
    const resolver = VARIABLE_RESOLVERS[varPath];
    if (resolver) {
      const value = resolver(gameState, ctx);
      if (value !== undefined) return value;
    }
    // 未匹配的变量保留原样
    return `{${varPath}}`;
  });
}
