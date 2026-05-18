import type {
  Attribute,
  CheckConfig,
  CheckOutcome,
  DiceResultTier,
  CharacterAttributes,
  CharacterSpecialty,
} from "./schema";
import { getAttribute, getSpecialties } from "./attributes";

// ── 随机掷骰 ──

/** 掷 D20（1-20 均匀分布） */
export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

// ── 难度修正 ──

/** 难度修正因子输入 */
export interface DifficultyModifiers {
  nearArtifact?: boolean;
  pressureTier?: number;
  characterCorruption?: number;
  hasRelatedItem?: boolean;
  priorSuccess?: boolean;
  coopAssist?: number;
  specialtyDifficultyMod?: number;
}

/** 根据环境修正因子计算最终难度 */
export function calcDifficulty(
  baseDifficulty: number,
  modifiers: DifficultyModifiers = {}
): number {
  let d = baseDifficulty;

  // 石碑周边灵性辐射干扰
  if (modifiers.nearArtifact) d += 2;

  // 压力等级修正
  const tier = modifiers.pressureTier ?? 0;
  if (tier >= 4) d += 4;
  else if (tier >= 3) d += 2;

  // 角色自身污染干扰
  if ((modifiers.characterCorruption ?? 0) >= 4) d += 2;

  // 持有相关物品——降低难度
  if (modifiers.hasRelatedItem) d -= 2;

  // 累积效应——已有角色成功调查同一目标
  if (modifiers.priorSuccess) d -= 2;

  // 合作辅助
  if (modifiers.coopAssist) d -= modifiers.coopAssist;

  // 专长难度修正（如破门者 -2、仪式学者 -2、死者之声 -2）
  if (modifiers.specialtyDifficultyMod) d += modifiers.specialtyDifficultyMod;

  // 上下限夹定
  return Math.max(5, Math.min(25, d));
}

// ── 档位判定 ──

/**
 * 根据 D20 点数、属性值、最终难度判定五档结果。
 *
 * 天启: D20=20 或 结果 ≥ 难度+8
 * 成功: 结果 ≥ 难度
 * 勉强: 结果 ≥ 难度-3
 * 失败: 结果 ≥ 难度-6
 * 灾厄: D20=1 或 结果 < 难度-6
 */
export function resolveTier(
  d20Roll: number,
  attributeValue: number,
  difficulty: number
): DiceResultTier {
  const finalResult = d20Roll + attributeValue;

  // 自然20 = 天启（除非难度极高导致总结果仍很低——但这种情况极少）
  if (d20Roll === 20) return "revelation";
  // 自然1 = 灾厄
  if (d20Roll === 1) return "catastrophe";

  if (finalResult >= difficulty + 8) return "revelation";
  if (finalResult >= difficulty) return "success";
  if (finalResult >= difficulty - 3) return "partial";
  if (finalResult >= difficulty - 6) return "failure";

  return "catastrophe";
}

// ── 结算结果构建 ──

/**
 * 跑团检定结算的主入口。
 *
 * @param config      Storylet 携带的检定配置
 * @param roleId      执行检定的角色 ID
 * @param modifiers   环境/状态修正因子
 * @returns           完整的检定结算结果
 */
export function resolveCheck(
  config: CheckConfig,
  roleId: string,
  modifiers: DifficultyModifiers = {}
): CheckOutcome {
  const attrValue = getAttribute(roleId, config.attribute);
  const difficulty = applySpecialtyDifficulty(config, roleId, modifiers);

  const d20Roll = rollD20();
  const finalResult = d20Roll + attrValue;
  const tier = resolveTier(d20Roll, attrValue, difficulty);

  return {
    tier,
    d20Roll,
    finalResult,
    difficulty,
    resolvedText: "", // 由调用方填入
    cluesGained: tier === "revelation" ? 2 : tier === "success" ? 1 : 0,
    corruptionDelta:
      tier === "catastrophe" ? 2 : tier === "failure" ? 1 : 0,
    spiritCost:
      tier === "partial" ? 2 : tier === "catastrophe" ? 2 : 1,
  };
}

// ── 专长对难度的修正 ──

function applySpecialtyDifficulty(
  config: CheckConfig,
  roleId: string,
  base: DifficultyModifiers
): number {
  const specs = getSpecialties(roleId);
  let mod = base.specialtyDifficultyMod ?? 0;

  for (const spec of specs) {
    switch (spec.id) {
      // 奥斯顿：破门者 → 强制突入时体质需求 -2
      case "austen-door-breaker":
        if (config.attribute === "physique") mod -= 2;
        break;
      // 戴芙琳：死者之声 → 通灵类灵性检定难度 -2
      case "devlin-dead-voice":
        if (config.attribute === "aura") mod -= 2;
        break;
      // 伊莱亚斯：仪式学者 → 仪式类知识检定难度 -2
      case "elias-ritual-scholar":
        if (config.attribute === "lore") mod -= 2;
        break;
    }
  }

  return calcDifficulty(config.baseDifficulty, { ...base, specialtyDifficultyMod: mod });
}

// ── 专长触发判定（需要在结算时调用） ──

/** 检查是否有可触发的专长并返回触发提示 */
export function checkSpecialtyTriggers(
  roleId: string,
  outcome: CheckOutcome,
  config: CheckConfig
): Array<{ specialty: CharacterSpecialty; canTrigger: boolean; reason: string }> {
  const specs = getSpecialties(roleId);
  const triggers: Array<{ specialty: CharacterSpecialty; canTrigger: boolean; reason: string }> = [];

  const attrValue = getAttribute(roleId, config.attribute);

  for (const spec of specs) {
    switch (spec.id) {
      // 艾德温：旧案之眼 → 失败时仍获得模糊信息
      case "edwin-old-case-eye":
        triggers.push({
          specialty: spec,
          canTrigger: outcome.tier === "failure",
          reason: "你从旧案的经验中捕捉到了一丝模糊的相似性",
        });
        break;

      // 艾德温：梦魇凝视 → 梦魇追溯失败可选重掷
      case "edwin-nightmare-gaze":
        triggers.push({
          specialty: spec,
          canTrigger: config.attribute === "will" && outcome.tier !== "revelation",
          reason: "你可以在梦境中再深入一层",
        });
        break;

      // 莱尔：灰雾直觉 → 差 ≤2 时可选重掷
      case "lyle-fog-intuition":
        const diff = outcome.difficulty - outcome.finalResult;
        triggers.push({
          specialty: spec,
          canTrigger: diff > 0 && diff <= 2,
          reason: "灰雾在你指尖凝聚——再试一次？",
        });
        break;

      // 塞西莉亚：看穿人心 → 洞察大成功额外隐情
      case "cecilia-heart-reader":
        triggers.push({
          specialty: spec,
          canTrigger: outcome.tier === "revelation" && config.attribute === "insight",
          reason: "你在他情绪的边缘看到了一道他从未对任何人展示的裂痕",
        });
        break;

      // 戴芙琳：灵界漫游 → 意志失败可深入一层
      case "devlin-spirit-roam":
        triggers.push({
          specialty: spec,
          canTrigger: config.attribute === "will" && (outcome.tier === "failure" || outcome.tier === "partial"),
          reason: "灵界更深处有更清晰的声音——但代价是什么？",
        });
        break;

      // 伊莱亚斯：禁忌条目 → 知识大成功额外知识 + 污染
      case "elias-forbidden-entry":
        triggers.push({
          specialty: spec,
          canTrigger: outcome.tier === "revelation" && config.attribute === "lore",
          reason: "你读到了一个你不应该知道的事实。它现在住进了你的记忆里。",
        });
        break;
    }
  }

  return triggers;
}

// ── 序列化（调试/日志用） ──

/** 中文属性名 */
export const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  aura: "灵性",
  insight: "洞察",
  will: "意志",
  physique: "体质",
  cunning: "诡诈",
  lore: "知识",
};

/** 中文档位名 */
export const TIER_LABELS: Record<DiceResultTier, string> = {
  revelation: "天启",
  success: "成功",
  partial: "勉强",
  failure: "失败",
  catastrophe: "灾厄",
};

/** 生成掷骰日志文本 */
export function formatCheckLog(outcome: CheckOutcome, config: CheckConfig, roleName: string): string {
  return [
    `🎲 ${roleName} · ${ATTRIBUTE_LABELS[config.attribute]}检定`,
    `D20=${outcome.d20Roll} + ${ATTRIBUTE_LABELS[config.attribute]}${outcome.finalResult - outcome.d20Roll} = ${outcome.finalResult}`,
    `vs 难度${outcome.difficulty} → ${TIER_LABELS[outcome.tier]}`,
  ].join("  ");
}
