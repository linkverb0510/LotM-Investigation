import type { InvestigationRoleDefinition } from "./schema";
import { investigationV2CardSeeds } from "./cards";

const cardsByRole = (roleId: string) =>
  investigationV2CardSeeds.filter((card) => card.roleId === roleId);

export const investigationV2Roles: InvestigationRoleDefinition[] = [
  {
    id: "role-01-edwin",
    publicName: "资深值夜者",
    realName: "艾德温·莫里斯",
    title: "值夜者老手",
    organization: "黑夜女神教会 · 值夜者",
    pathway: "不眠者途径",
    sequence: "序列7 梦魇",
    publicRole: "现场稳定、梦境搜证、秩序维护",
    investigationRole: "稳场 / 护人 / 旧案判断",
    discussionRole: "用资历、程序知识与旧案经验建立可信度并推动稳妥判断。",
    difficulty: "3 / 5",
    startStats: { maxSpirituality: 6, startCorruption: 1, startClues: 1, startHand: 3 },
    trait:
      "每轮结束时，若本轮有人承受了异常代价，你获得1点灵性；若是你亲手稳定了局面，还可额外确认风险偏向人物/地点/物件。",
    signatureCards: cardsByRole("role-01-edwin"),
    privateConcern: "不愿再重复旧教堂事件里“明知有问题却压案”的错误。",
    riskOrCost: "越擅长稳场越容易为秩序延后真相；与旧案相似时会本能先压再查。",
    sensitiveTopics: [
      "东区旧教堂灵性污染事件的后续",
      "你是不是又想先保秩序",
      "戴芙琳被推到危险位置",
    ],
    storyletHooks: {
      openingPrivate:
        "出发前翻出了旧教堂事件的值夜日志。那页边角有你自己写的批注：“灵性残留检测报告未送至大主教。”",
      midgameReactive: "线索与旧案相似时获额外提示，但更难支持高风险突破。",
      discussionRelation: "戴芙琳被连续质疑时，发言会失去克制。",
      endingAftertaste: "正确收束后，你知道这次做了三年前没做的事。",
    },
    backgroundSummary:
      "东区出身的老值夜者，亲历旧教堂污染案并见过报告被压下的全过程；如今再度被召回，面对的是一场曾经没有被真正结束的旧事。",
    sourceDocId: "authority-roles-v2",
  },
  {
    id: "role-02-lyle",
    publicName: "灰雾魔术师",
    realName: "莱尔·杜瓦尔",
    title: "神秘学联络人",
    organization: "不公开（接受某个隐秘组织的非正式委派）",
    pathway: "占卜家途径",
    sequence: "序列7 魔术师",
    publicRole: "神秘学协助、隐秘接触、异常痕迹处理",
    investigationRole: "诡诈搜证 / 接触突破 / 真假痕迹操纵",
    discussionRole: "用不完整但关键的信息改变叙事方向，同时逼出别人更多内容。",
    difficulty: "4 / 5",
    startStats: { maxSpirituality: 5, startCorruption: 1, startClues: 1, startHand: 3 },
    trait:
      "每轮第一次成为搜查/质询/追踪目标时，可将关注转移给同区域另一角色，或让追踪只得到模糊结果。",
    signatureCards: cardsByRole("role-02-lyle"),
    privateConcern:
      "确保现场的一份第四纪仪式残卷不进入任何教会的正式记录，尤其是第三页与第七页。",
    riskOrCost:
      "不把真话说完会迅速失去信任；越接触危险知识越难分辨自己是在完成任务还是在享受操控。",
    sensitiveTopics: ["你的指令到底是谁给的", "仪式残卷的去向", "你知道得太刚好"],
    storyletHooks: {
      openingPrivate:
        "指令只有一句话：若现场存在第四纪赫密斯语仪式残卷，收集第三页和第七页后销毁，不进入任何正式记录。",
      midgameReactive: "连续引导他人绕开某地点/物品时获额外提示，但旁人更容易觉得你别有用心。",
      discussionRelation:
        "巫师或心理医生质疑你的信息层次时，被迫在交出部分来源和继续模糊之间选择。",
      endingAftertaste: "任务完成后，你会销毁所有与指令有关的痕迹，然后等待下一次联络。",
    },
    backgroundSummary:
      "地下非凡者圈中的情报和物件中介，长期以魔术师身份处理“不该进正规手续”的东西；这次被派来盯住残卷本身，而不是案件的正义结果。",
    sourceDocId: "authority-roles-v2",
  },
  {
    id: "role-03-austen",
    publicName: "代罚者军官",
    realName: "奥斯顿·雷文斯",
    title: "代罚者执事",
    organization: "风暴之主教会 · 代罚者",
    pathway: "水手途径",
    sequence: "序列7 航海家",
    publicRole: "封锁现场、护送目标、强制中断危险行为",
    investigationRole: "强制介入 / 风险控制 / 高压执行",
    discussionRole: "把案件会议结论转换成现场行动，指出现在不做什么会来不及。",
    difficulty: "3 / 5",
    startStats: { maxSpirituality: 5, startCorruption: 1, startClues: 0, startHand: 3 },
    trait:
      "高压状态下，压制/封锁类行动获额外效果；若有人违反集体措施，行动结算后获补充说明权。",
    signatureCards: cardsByRole("role-03-austen"),
    privateConcern: "若局势失控，优先确保高危封印物不被无关人员接触。",
    riskOrCost: "过于相信先封锁后解释；误判时伤害比其他人更直接，也更容易越权。",
    sensitiveTopics: ["你只是想靠教会权力压过去", "过去执行失误", "刚放行的人立刻造成更大异常"],
    storyletHooks: {
      openingPrivate:
        "你收到两份命令：公开命令要求协助调查；私下命令要求在确认高危封印物后优先回收。",
      midgameReactive: "若有人违抗集体措施或擅自接近危险源，你更容易获得合法压制机会。",
      discussionRelation:
        "当值夜者要求继续调查、而你判断应该封锁时，双方的组织分歧会直接摆上桌面。",
      endingAftertaste: "若判断正确，你会成为把风暴带进来又把风暴压住的人；若误判，责任也会最直接。",
    },
    backgroundSummary:
      "出身海边底层的代罚者执行者，习惯先压住最危险的变量；在贝克兰德，他开始意识到命令和正确未必是同一件事。",
    sourceDocId: "authority-roles-v2",
  },
  {
    id: "role-04-cecilia",
    publicName: "贵族心理医生",
    realName: "塞西莉亚·霍尔文",
    title: "贵族心理医生",
    organization: "霍尔文家族 / 与教会合作的精神援助网络",
    pathway: "观众途径",
    sequence: "序列7 心理医生",
    publicRole: "精神安抚、证人评估、贵族与教会之间的社交协调",
    investigationRole: "情绪读取 / 证词拆解 / 会议控场",
    discussionRole: "解释谁在表演、谁在压抑、谁的证词像被整理过，而不是只贴标签。",
    difficulty: "4 / 5",
    startStats: { maxSpirituality: 5, startCorruption: 1, startClues: 1, startHand: 3 },
    trait:
      "每轮讨论开始时可标记一名角色的情绪倾向；若其发言与标签明显冲突，讨论结束时获半公开判断提示。",
    signatureCards: cardsByRole("role-04-cecilia"),
    privateConcern: "表兄亚瑟·霍尔文与东区慈善项目的关联正在逼近真相中心。",
    riskOrCost: "太擅长把人当解析对象，可能低估真正的超凡失控；过度控场会被视为操纵集体。",
    sensitiveTopics: [
      "霍尔文家族资助记录",
      "慈善项目内部运作",
      "为什么你对这个人的情绪判断比别人都细",
    ],
    storyletHooks: {
      openingPrivate:
        "精神援助评估报告里，几名互不相识证人的情绪结构异常一致；慈善项目记录上又出现了亚瑟三天前的签名。",
      midgameReactive: "你越是准确读出别人的情绪，越容易听见自己不想承认的答案。",
      discussionRelation: "当别人开始怀疑霍尔文家族时，你的每一句辩解都会被放大检视。",
      endingAftertaste: "真相揭开后，你要决定保住的是家族的体面，还是自己还能照镜子的资格。",
    },
    backgroundSummary:
      "贝克兰德体面贵族圈中的心理顾问，长于阅读情绪与引导叙事；这次案件第一次把她的家族关系和职业判断撕扯到同一张桌子上。",
    sourceDocId: "authority-roles-v2",
  },
  {
    id: "role-05-devlin",
    publicName: "教会通灵师",
    realName: "戴芙琳·西蒙",
    title: "值夜者通灵专员",
    organization: "黑夜女神教会 · 值夜者体系",
    pathway: "收尸人途径",
    sequence: "序列7 通灵者",
    publicRole: "尸体处理、灵界追索、污染诊断",
    investigationRole: "尸体情报 / 灵性残响 / 风险净化",
    discussionRole: "把尸体、现场与灵界残响之间是否自洽说清楚。",
    difficulty: "4 / 5",
    startStats: { maxSpirituality: 6, startCorruption: 2, startClues: 1, startHand: 3 },
    trait:
      "每轮可额外查看一条被遗落的线索/牌/痕迹；若与尸体或灵体接触有关，可额外确认其更接近真实案情还是人为干扰。",
    signatureCards: cardsByRole("role-05-devlin"),
    privateConcern:
      "在意艾德温还能撑多久；同时始终无法放下旧教堂事件中那个最终死去的十七岁学徒。",
    riskOrCost:
      "接触灵界越深越容易把残响情绪和自身判断混同；想同时保真相和保艾德温时容易失衡。",
    sensitiveTopics: ["把死者当案子的材料", "因私人情感偏袒同伴", "那个没救下的学徒"],
    storyletHooks: {
      openingPrivate:
        "第一具尸体旁听见不属于死者的第二道低语，重复一句话：“还没结束。”",
      midgameReactive: "艾德温承受异常代价时更容易触发过度保护关系事件。",
      discussionRelation:
        "有人质疑艾德温而你的残响线索恰好能为他解释时，面临说得太多会暴露自己情绪的困境。",
      endingAftertaste: "代价沉重时，你的结局感更像‘有人被写进记录，有人只留在回声里’。",
    },
    backgroundSummary:
      "值夜者体系中的通灵专员，长期处理东区异常死亡与灵界残响；旧教堂事件留下的愧疚和与艾德温的隐性关系，使她成为最容易被‘还没结束’击中的人。",
    sourceDocId: "authority-roles-v2",
  },
  {
    id: "role-06-elias",
    publicName: "神秘学顾问（巫师）",
    realName: "伊莱亚斯·温特",
    title: "独立神秘学顾问",
    organization: "独立研究者（曾通过摩斯苦修会获得窥秘人途径魔药配方）",
    pathway: "窥秘人途径",
    sequence: "序列7 巫师",
    publicRole: "仪式解析、异常物件辨识、神秘学结构分析",
    investigationRole: "知识搜证 / 仪式学判断 / 高风险真相推进",
    discussionRole: "给出结构解释，指出什么是假核心、什么是真异常。",
    difficulty: "4 / 5",
    startStats: { maxSpirituality: 5, startCorruption: 2, startClues: 1, startHand: 3 },
    trait:
      "首次接触仪式/封印物/异常残留时，额外判断接近真实核心/误导结构/二次加工；进一步深读会换来污染与认知压力。",
    signatureCards: cardsByRole("role-06-elias"),
    privateConcern: "知识不落到错误的手里，但也无法否认自己正被真相本身吸引。",
    riskOrCost: "越接近核心越容易精神反噬；对结构的兴趣可能在最不该靠近时把你推得更近。",
    sensitiveTopics: [
      "私下研究过被封存的禁忌材料",
      "关键物件判断被公开纠正",
      "你对危险知识的好奇已超出职业需要",
    ],
    storyletHooks: {
      openingPrivate:
        "案卷边角发现了一段被故意涂改了用法的赫密斯语祷文；这种篡改方式只在一份十二年前的失败实验摘录里被记录过。",
      midgameReactive: "连续两次深读异常结构后更快逼近真相，但更易触发认知失衡。",
      discussionRelation: "魔术师刻意模糊某件物品来历时，你会强烈想追着不放。",
      endingAftertaste: "正确判断核心后，你会变成‘看见得太多的人’；错误则会让求知欲本身被写成偏航原因。",
    },
    backgroundSummary:
      "出身伦堡神秘学环境的独立顾问，通过摩斯苦修会外围获得窥秘人途径配方；他能看懂危险结构，也最容易被那种结构吸进去。",
    sourceDocId: "authority-roles-v2",
  },
];
