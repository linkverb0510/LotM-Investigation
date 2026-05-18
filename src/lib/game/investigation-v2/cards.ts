import type { InvestigationCardSeed } from "./schema";

export const investigationV2CardSeeds: InvestigationCardSeed[] = [
  {
    id: "role-01-watch-record",
    roleId: "role-01-edwin",
    name: "守夜记录",
    category: "搜证/调度",
    costText: "1灵性",
    rulesText:
      "调阅值夜者旧档，获得1条线索，确认案件压力偏向；若有旧案相似标签，可额外查看半公开痕迹。",
    why: "把梦魇的旧案经验和值夜者程序知识落实为调查动作。",
  },
  {
    id: "role-01-requiem",
    roleId: "role-01-edwin",
    name: "安魂祷词",
    category: "净化",
    costText: "1灵性",
    rulesText:
      "安抚目标，污染下降一档，缓和一条公共异常；若目标本轮被怀疑，还获得一层“理智锚定”。",
    why: "强调稳场而不是战斗输出。",
  },
  {
    id: "role-01-watch",
    roleId: "role-01-edwin",
    name: "暗红色怀表",
    category: "封印物",
    costText: "2灵性",
    rulesText:
      "本轮免疫第一次异常代价；若为执行者，可暂缓一次强制公开。代价：回合末承受轻度精神疲劳判定。",
    why: "表现老值夜者用危险工具争取窗口，而不是无代价护盾。",
  },
  {
    id: "role-02-flame-step",
    roleId: "role-02-lyle",
    name: "火焰跳跃",
    category: "接触/机动",
    costText: "1灵性",
    rulesText:
      "趁混乱接近不便触碰的地点/物件，获得1条私密线索；或将手牌与牌库顶交换，并让本轮一条行为描述更难被确认。",
    why: "把魔术师的位移和偷偷接触落实到调查模式。",
  },
  {
    id: "role-02-transfer",
    roleId: "role-02-lyle",
    name: "伤害转移",
    category: "反制/掩饰",
    costText: "2灵性",
    rulesText:
      "获得“转移”标记至下回合。首次承受额外代价时，可将后果部分转嫁给另一角色并伪装为“误会”。若目标为关系包角色，易触发关系裂痕。",
    why: "强化魔术师的灰色求生与关系代价。",
  },
  {
    id: "role-02-paper-double",
    roleId: "role-02-lyle",
    name: "纸人替身",
    category: "保命/伪装",
    costText: "0灵性+弃2手牌",
    rulesText:
      "本轮首次被搜查/查验/指认时，行动落空，执行者只获得你故意留的假信息。若持有相关隐情，可将假信息引向合理解释方向。",
    why: "保留占卜家系“替身”风味，同时服务调查而非战斗。",
  },
  {
    id: "role-03-scene-sweep",
    roleId: "role-03-austen",
    name: "现场勘查",
    category: "搜证",
    costText: "1灵性",
    rulesText:
      "快速扫过现场，获得1条线索；若已触发公共异常，额外确认偏向人为/仪式/物件。",
    why: "战斗型角色也要能提供线索，但通过执行式搜证体现。",
  },
  {
    id: "role-03-thunder",
    roleId: "role-03-austen",
    name: "雷霆震慑",
    category: "压制",
    costText: "2灵性",
    rulesText:
      "强行中断目标对地点/物件/私密接触的操作，令其在下轮讨论中更难回避说明；若目标已被多数人重点关注，额外获得半公开痕迹。",
    why: "把风暴系的战斗性改写成强制介入与会议后果。",
  },
  {
    id: "role-03-storm-badge",
    roleId: "role-03-austen",
    name: "风暴教会徽记",
    category: "调度",
    costText: "1灵性",
    rulesText:
      "调用教会执行权限，立刻推动轻度封锁/陪同/交接，不必等讨论结论。代价：组织立场更明显，后续易触发“越权处置”争议。",
    why: "体现组织权限本身也是玩法资源和风险。",
  },
  {
    id: "role-04-emotion-review",
    roleId: "role-04-cecilia",
    name: "情绪复盘",
    category: "搜证/接触",
    costText: "1灵性",
    rulesText:
      "接触证人、幸存者或队友，判断其描述中的情绪断裂点，获得1条与证词真假相关的线索。",
    why: "让观众系在讨论前就能生产内容，而不只在会场上发言。",
  },
  {
    id: "role-04-calm-induction",
    roleId: "role-04-cecilia",
    name: "平静诱导",
    category: "调度/掩饰",
    costText: "1灵性",
    rulesText:
      "缓和目标的紧张状态，使其本轮更容易公开说明；若目标正在隐藏某件事，也可能提前露出破绽。",
    why: "兼具安抚和逼问的社交控制风味。",
  },
  {
    id: "role-04-mirror-question",
    roleId: "role-04-cecilia",
    name: "镜面追问",
    category: "讨论/接触",
    costText: "2灵性",
    rulesText:
      "在讨论阶段对一名角色施加高压追问。若其前后说法出现明显偏差，立即获得一条与其行为动机相关的判断提示。",
    why: "直接服务案件会议。",
  },
  {
    id: "role-05-ghost-clinic",
    roleId: "role-05-devlin",
    name: "亡者问诊",
    category: "搜证/接触",
    costText: "1灵性",
    rulesText:
      "与死者残响建立短暂联系，查看隐藏信息或确认角色异常是否与案件有关。若已出现被改写/撕裂的记录，额外捕捉“死者没说完的方向提示”。",
    why: "把通灵者的核心价值固定为尸体与灵界情报。",
  },
  {
    id: "role-05-preservative",
    roleId: "role-05-devlin",
    name: "防腐药剂",
    category: "净化",
    costText: "1灵性",
    rulesText:
      "缓和目标污染症状一档。若目标继续危险接触，后果延后爆发而非消失——适合争取窗口，不解决问题。",
    why: "强调净化不是万能回血，而是延期与取舍。",
  },
  {
    id: "role-05-notebook",
    roleId: "role-05-devlin",
    name: "通灵者手记",
    category: "调度/搜证",
    costText: "2灵性",
    rulesText:
      "翻阅前辈手记与死灵记录，回收一张调查/净化类手牌，额外获得尸体处理记录提示。若已接触至少两条旧案线索，触发私人记忆反应。",
    why: "把旧案回响嵌进规则层。",
  },
  {
    id: "role-06-gray-notes",
    roleId: "role-06-elias",
    name: "灰页笔记",
    category: "搜证/调度",
    costText: "1灵性",
    rulesText:
      "翻检笔记与摘录，获得1条与仪式/物件/异常结构有关的线索；若有被争议的关键物件，确认更像核心部件还是假核心。",
    why: "这是巫师的基础知识推进器。",
  },
  {
    id: "role-06-reverse-analysis",
    roleId: "role-06-elias",
    name: "逆向拆解",
    category: "接触/搜证",
    costText: "2灵性",
    rulesText:
      "选择异常结构/祷文/危险物件，尝试逆向推导构成逻辑。成功直接打开高价值线索；代价为知识反噬判定，可能获额外污染或触发幻觉类事件。",
    why: "把知识推进与代价绑定在一起，符合 LOTM 气质。",
  },
  {
    id: "role-06-silent-seal",
    roleId: "role-06-elias",
    name: "静默封签",
    category: "封印物/净化",
    costText: "2灵性",
    rulesText:
      "临时封签压住异常物品/仪式节点，本轮内失去最危险效果。不等于解决，只争取窗口；若对象非核心，可能被真正的源头误导。",
    why: "让知识角色也能参与收束，但不是一键解决问题。",
  },
];
