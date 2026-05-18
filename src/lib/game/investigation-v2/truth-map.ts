import type { TruthMapEntry } from "./schema";

export const investigationV2TruthMap: TruthMapEntry[] = [
  {
    id: "truth-autopsy-missing-page",
    clueLabel: "尸检报告缺页",
    surfaceClue: "最后一页被灵性火焰销毁。",
    truthExplanation:
      "亚瑟销毁了尸检报告中关于盐类结晶与石碑辐射关联的分析，以延缓教会识别石碑辐射特征。",
    relatedCharacters: ["亚瑟·霍尔文", "戴芙琳·西蒙"],
    relatedOrgs: ["霍尔文家族", "黑夜女神教会"],
    relatedLocations: ["临时停尸房", "东区慈善项目"],
  },
  {
    id: "truth-salt-arc",
    clueLabel: "地窖盐痕",
    surfaceClue: "现场出现不完整的灰白色盐化圆弧。",
    truthExplanation:
      "这是亚瑟只用前五段祷文进行不完整激活后的物理副产物，圆弧不完整是因为缺少后续祷文配合。",
    relatedCharacters: ["亚瑟·霍尔文", "伊莱亚斯·温特"],
    relatedOrgs: ["极光会污染链", "摩斯苦修会"],
    relatedLocations: ["地下礼拜堂", "东区旧教堂"],
  },
  {
    id: "truth-shared-nightmare",
    clueLabel: "共同噩梦",
    surfaceClue: "居民做着相似的梦，梦里伴随陌生语言的吟诵。",
    truthExplanation:
      "这是错译祷碑低功率精神同化场的表现；梦中的语言是赫密斯语祷文的无意识渗透。",
    relatedCharacters: ["戴芙琳·西蒙", "塞西莉亚·霍尔文"],
    relatedOrgs: ["黑夜女神教会", "极光会污染链"],
    relatedLocations: ["东区街区", "地下礼拜堂"],
  },
  {
    id: "truth-tampered-prayer",
    clueLabel: "被篡改的赫密斯语祷文",
    surfaceClue: "案卷边角和街区角落出现用途被改写的祷文残段。",
    truthExplanation:
      "亚瑟将原本向外投射的祷文改写成向内引导的灵性引导标记，使居民逐渐成为石碑辐射网络的节点。",
    relatedCharacters: ["亚瑟·霍尔文", "伊莱亚斯·温特", "格里芬·索恩"],
    relatedOrgs: ["摩斯苦修会", "极光会污染链"],
    relatedLocations: ["东区街道", "慈善项目分发点", "地下礼拜堂"],
  },
  {
    id: "truth-charity-signature",
    clueLabel: "慈善项目签名",
    surfaceClue: "第一起死亡前三天，亚瑟的签名出现在教堂周边物资安排记录上。",
    truthExplanation:
      "那是亚瑟最后一次更新灵性引导节点布置的时间点，慈善项目被当作合法外壳来调度高灵性敏感居民。",
    relatedCharacters: ["亚瑟·霍尔文", "塞西莉亚·霍尔文"],
    relatedOrgs: ["霍尔文家族", "黑夜女神教会"],
    relatedLocations: ["东区慈善项目", "教堂周边分发点"],
  },
  {
    id: "truth-yn0417",
    clueLabel: "旧案报告 YN-0417",
    surfaceClue: "三年前的电子档案在当前调查启动前被删除。",
    truthExplanation:
      "加尔文·塞特或其授权人删除记录，是为了避免调查组通过旧案追查到黑夜女神教会的归档鉴定失误。",
    relatedCharacters: ["艾德温·莫里斯", "加尔文·塞特"],
    relatedOrgs: ["黑夜女神教会"],
    relatedLocations: ["值夜者档案间", "东区旧教堂"],
  },
  {
    id: "truth-second-body-gesture",
    clueLabel: "第二名死者的非教会祷告手势",
    surfaceClue: "死者双手以不属于任何正神教会的姿态交叠。",
    truthExplanation:
      "这是第四纪教派‘共鸣接收姿态’的无意识体现，说明石碑辐射已在潜意识层面改写动作模式。",
    relatedCharacters: ["戴芙琳·西蒙", "伊莱亚斯·温特"],
    relatedOrgs: ["第四纪赫密斯语教派"],
    relatedLocations: ["案发现场", "地下礼拜堂"],
  },
  {
    id: "truth-badge-priority",
    clueLabel: "2-113 封存优先级",
    surfaceClue: "代罚者私下命令要求高危封印物优先回收。",
    truthExplanation:
      "风暴教会早已独立探测到地下异常源，并将错译祷碑编目为至少 2 级封印物，但未与黑夜女神教会共享信息。",
    relatedCharacters: ["奥斯顿·雷文斯"],
    relatedOrgs: ["风暴之主教会", "黑夜女神教会"],
    relatedLocations: ["东区地下异常区"],
  },
  {
    id: "truth-artifacts-pointing",
    clueLabel: "封印物异常指向",
    surfaceClue: "多件来源不同的低阶封印物同时指向教堂地下室方向。",
    truthExplanation:
      "石碑的赫密斯语铭文系统与现存封印物的鉴定系统共享赫密斯语基础，石碑加速态产生的灵性频率与封印物内部鉴定铭文产生同源共振，导致封印物集体指向同一灵性源。",
    relatedCharacters: ["奥斯顿·雷文斯", "伊莱亚斯·温特", "艾德温·莫里斯"],
    relatedOrgs: ["风暴之主教会", "黑夜女神教会"],
    relatedLocations: ["东区桥区教堂地下室", "石碑埋设点"],
  },
];
