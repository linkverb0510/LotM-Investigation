import type { CharacterAttributes, CharacterSpecialty } from "./schema";

// ── 六角色属性表 ──

export const CHARACTER_ATTRIBUTES: Record<string, CharacterAttributes> = {
  "role-01-edwin": {
    aura: 6,
    insight: 4,
    will: 5,
    physique: 3,
    cunning: 2,
    lore: 3,
  },
  "role-02-lyle": {
    aura: 5,
    insight: 3,
    will: 2,
    physique: 2,
    cunning: 6,
    lore: 2,
  },
  "role-03-austen": {
    aura: 5,
    insight: 2,
    will: 4,
    physique: 6,
    cunning: 1,
    lore: 1,
  },
  "role-04-cecilia": {
    aura: 5,
    insight: 6,
    will: 3,
    physique: 1,
    cunning: 3,
    lore: 3,
  },
  "role-05-devlin": {
    aura: 6,
    insight: 4,
    will: 4,
    physique: 2,
    cunning: 1,
    lore: 2,
  },
  "role-06-elias": {
    aura: 5,
    insight: 5,
    will: 3,
    physique: 2,
    cunning: 1,
    lore: 6,
  },
};

/** 获取指定角色的属性值，若角色ID不存在则返回默认值 */
export function getAttributes(roleId: string): CharacterAttributes {
  return (
    CHARACTER_ATTRIBUTES[roleId] ?? {
      aura: 3,
      insight: 3,
      will: 3,
      physique: 3,
      cunning: 3,
      lore: 3,
    }
  );
}

/** 获取指定角色的指定属性值 */
export function getAttribute(roleId: string, attr: keyof CharacterAttributes): number {
  return getAttributes(roleId)[attr];
}

// ── 角色专长表 ──

export const CHARACTER_SPECIALTIES: Record<string, CharacterSpecialty[]> = {
  "role-01-edwin": [
    {
      id: "edwin-old-case-eye",
      name: "旧案之眼",
      description:
        "调查与旧案相似的线索时，即使检定失败也能获得模糊信息——你不会完全空手而归。",
      triggerHint: "检定失败但目标与旧案关联时自动触发",
    },
    {
      id: "edwin-nightmare-gaze",
      name: "梦魇凝视",
      description:
        "进行梦境追溯时，可以重掷一次检定——但第二次深入梦境的疲劳代价是双倍的。",
      triggerHint: "梦境追溯检定失败时，可以选择是否重掷",
    },
  ],
  "role-02-lyle": [
    {
      id: "lyle-fog-intuition",
      name: "灰雾直觉",
      description:
        "当检定结果距离成功仅差 2 以内时，消耗 1 灵性可以重掷一次。",
      triggerHint: "检定结果差 ≤2 时，提示是否消耗灵性重掷",
    },
    {
      id: "lyle-paper-double",
      name: "纸人替身",
      description:
        "首次大失败时，将后果转移为自己的假痕迹——本人毫发无损，但队友可能被误导。",
      triggerHint: "本局首次大失败时自动触发",
    },
  ],
  "role-03-austen": [
    {
      id: "austen-storm-ahead",
      name: "风暴在前",
      description:
        "体质检定结果始终 +1——但非体质检定大失败时，额外触发一次组织冲突事件。",
      triggerHint: "体质检定自动生效；非体质大失败时触发组织冲突",
    },
    {
      id: "austen-door-breaker",
      name: "破门者",
      description:
        "执行强制突入类行动时，体质需求降低 2——没有他打不开的门。",
      triggerHint: "强制突入行动时难度自动 -2",
    },
  ],
  "role-04-cecilia": [
    {
      id: "cecilia-heart-reader",
      name: "看穿人心",
      description:
        "洞察检定大成功时，额外获得目标的一项隐情提示——你能看到别人看不到的裂痕。",
      triggerHint: "洞察检定大成功时自动触发",
    },
    {
      id: "cecilia-social-mirror",
      name: "社交之镜",
      description:
        "讨论阶段中，可以公开声明某人「刚才在说谎」。若声明正确，获得 1 点信任。若错误——你失去了你自己的可信度。",
      triggerHint: "讨论阶段主动使用，消耗一次发言权重",
    },
  ],
  "role-05-devlin": [
    {
      id: "devlin-dead-voice",
      name: "死者之声",
      description:
        "进行通灵相关的灵性检定时，石碑辐射对你的干扰较小——难度降低 2。",
      triggerHint: "通灵类灵性检定时自动生效",
    },
    {
      id: "devlin-spirit-roam",
      name: "灵界漫游",
      description:
        "意志检定失败后，可以选择「深入一层」再掷一次——成功则获得更深层信息，失败则污染 +3。灵界不会无偿给予。",
      triggerHint: "意志检定失败时，提示是否深入一层",
    },
  ],
  "role-06-elias": [
    {
      id: "elias-ritual-scholar",
      name: "仪式学者",
      description:
        "识别仪式结构、解读赫密斯语文本的知识检定时，难度降低 2——他对这些文字比对他自己的手背还熟悉。",
      triggerHint: "仪式/赫密斯语知识检定时自动生效",
    },
    {
      id: "elias-forbidden-entry",
      name: "禁忌条目",
      description:
        "知识检定大成功时，额外读到一个他「本不该知道」的事实——获得深层信息，但承受知识反噬（污染 +2）。有些东西读到了就忘不掉。",
      triggerHint: "知识检定大成功时自动触发",
    },
  ],
};

/** 获取指定角色的专长列表 */
export function getSpecialties(roleId: string): CharacterSpecialty[] {
  return CHARACTER_SPECIALTIES[roleId] ?? [];
}
