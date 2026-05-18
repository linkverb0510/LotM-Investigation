import type { BossState, PendingStoryChoice } from "./types";
import { CARDS, ROLES } from "./investigation-v2/adapter";

export const BOSS_ANOMALY: BossState = {
  id: "boss_spirit_medium",
  name: "错译祷碑",
  description:
    "第四纪遗留的赫密斯语仪式遗物，长期休眠后被误触唤醒。它不只是异常物，更是仍在等待完成的仪式闭环。",
  threatLevel: 20,
  weaknessRevealed: false,
  nextSkillName: "灵性引导扩散（全场污染 +5）",
};

export const STORY_EVENTS: Record<string, PendingStoryChoice> = {
  "06_evolution_p4": {
    id: "06_evolution_p4",
    targetPlayerId: "",
    roleId: "06-unstable-one",
    phase: "p4",
    title: "理智的崩塌",
    context:
      "失控的通灵者发出的尖啸穿透了灵界。你感觉到体内的“梦魇”正在苏醒，血管里的非凡特性像活物一样蠕动。\n\n资深值夜者递过一瓶散发着苦味的“安宁药剂”，眼神里有一丝哀求：“拉住我，别松手。”\n\n但深渊里的低语在轻笑：“何必挣扎？喝下那苦水，你要忍受剧痛；而加入我们，你将无痛地成为神明。”",
    options: [
      {
        id: "choice_anchor",
        label: "抓住锚点 (守序)",
        description: "我是值夜者，哪怕在噩梦里也是。",
        resultFaction: "investigator",
        effectText:
          "你一把夺过药剂一饮而尽。剧痛如刀割般贯穿全身，但眼神中的灰雾终于散去。你找回了人性，但也锁死了灵性。",
        buffs: { corruptionDelta: -20, maxSpiritualityDelta: 2 },
      },
      {
        id: "choice_abyss",
        label: "放任沉沦 (邪恶)",
        description: "人性……太痛苦了。",
        resultFaction: "polluted",
        effectText:
          "你颤抖着推开了药剂瓶。痛苦瞬间消失，取而代之的是掌控一切的错觉。你看着队友，就像看着一群死人。",
        buffs: { corruptionDelta: 15, spiritDelta: 5 },
      },
    ],
  },
};

export { CARDS, ROLES };
export { ROLE_BRIDGE_MAP } from "./investigation-v2/adapter";
