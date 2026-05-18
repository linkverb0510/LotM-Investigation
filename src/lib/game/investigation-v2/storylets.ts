import type { InvestigationStoryletSeed } from "./schema";

export const investigationV2StoryletSeeds: InvestigationStoryletSeed[] = [
  {
    id: "seed-public-briefing-east-district",
    scope: "public",
    phaseHint: "briefing",
    title: "东区案情简报",
    source: "authority-case-v2",
    triggerHint: "开局所有玩家进入案情简报时",
    textSeed:
      "一周内多起异常死亡被秘密上报。死者身份各异，却都在死前出现梦呓、祷告式低语与精神失衡。东区地下可能存在尚未被确认的第四纪异常遗留。",
  },
  {
    id: "seed-private-edwin-old-report",
    scope: "private",
    phaseHint: "briefing",
    title: "未送达的大主教",
    source: "authority-roles-v2",
    triggerHint: "资深值夜者开局私密信息",
    textSeed:
      "你翻出了旧教堂事件的值夜日志，边角仍写着那句批注：灵性残留检测报告未送至大主教。",
    affectedRoles: ["role-01-edwin"],
    relatedTruthMapIds: ["truth-yn0417"],
  },
  {
    id: "seed-private-lyle-pages",
    scope: "private",
    phaseHint: "briefing",
    title: "第三页与第七页",
    source: "authority-roles-v2",
    triggerHint: "灰雾魔术师开局私密信息",
    textSeed:
      "指令写得很短：确认残卷是否存在。若存在，只拿第三页与第七页，之后销毁，不进入任何正式记录。",
    affectedRoles: ["role-02-lyle"],
  },
  {
    id: "seed-private-austen-seal-order",
    scope: "private",
    phaseHint: "briefing",
    title: "2-113",
    source: "authority-case-v2",
    triggerHint: "代罚者军官开局私密命令",
    textSeed:
      "除了公开协助命令外，你还收到一条私下指令：若确认 2-113 在场，优先封存回收，不计其余。",
    affectedRoles: ["role-03-austen"],
    relatedTruthMapIds: ["truth-badge-priority"],
  },
  {
    id: "seed-private-cecilia-signature",
    scope: "private",
    phaseHint: "briefing",
    title: "签名日期",
    source: "authority-case-v2",
    triggerHint: "贵族心理医生开局浏览精神援助与慈善记录",
    textSeed:
      "几名证人的情绪结构异常一致。更糟的是，你在慈善项目运营记录上看见了亚瑟三天前的签名。",
    affectedRoles: ["role-04-cecilia"],
    relatedTruthMapIds: ["truth-charity-signature", "truth-shared-nightmare"],
  },
  {
    id: "seed-private-devlin-whisper",
    scope: "private",
    phaseHint: "briefing",
    title: "还没结束",
    source: "authority-roles-v2",
    triggerHint: "教会通灵师首次接触第一具尸体时",
    textSeed:
      "死者的残响之外，还有第二道低语贴着灵界边缘滑过：还没结束。",
    affectedRoles: ["role-05-devlin"],
    relatedTruthMapIds: ["truth-shared-nightmare"],
  },
  {
    id: "seed-private-elias-prayer-tamper",
    scope: "private",
    phaseHint: "briefing",
    title: "被改写的用法",
    source: "authority-roles-v2",
    triggerHint: "巫师审阅案卷与现场抄录时",
    textSeed:
      "你认出那段赫密斯语祷文被篡改过用法，而这种改写只在一份失败实验的封存摘录中出现过。",
    affectedRoles: ["role-06-elias"],
    relatedTruthMapIds: ["truth-tampered-prayer"],
  },
  {
    id: "seed-public-salt-spread",
    scope: "public",
    phaseHint: "investigation_up",
    title: "灰白圆弧",
    source: "authority-case-v2",
    triggerHint: "玩家首次探索地下室或接近核心地点时",
    textSeed:
      "潮湿地面上爬着一圈不完整的灰白盐痕，像是某个原本应该闭合却被强行打断的仪式圆环。",
    relatedTruthMapIds: ["truth-salt-arc"],
    check: {
      attribute: "insight",
      baseDifficulty: 10,
      coopAllowed: true,
      assistAttributes: ["lore"],
    },
    results: {
      revelation:
        "盐痕在你眼前展开的瞬间，你的洞察捕捉到了三重信息：灰白色的结晶不是盐——是石碑辐射在空气中析出的灵性残留物。圆弧的断裂点有被反复灼烧的旧痕，说明不止一次有人在这里尝试过激活仪式。更关键的——断裂的方向指向了教堂的东侧墙壁，那里有一处不起眼的暗门痕迹。",
      success:
        "你的观察确认了两件事：盐痕的灰白色不是自然矿物沉淀——它是某种灵性辐射的物理副产物。圆弧的不完整性暗示这是一个多段式的仪式——只完成了前面的阶段，后面的阶段从未被补全。",
      partial:
        "你能确定这些盐痕不是自然形成的——它们太整齐了，扩散方式也违反重力方向。但圆弧的完整结构超过了你在昏暗光线下能辨认的范围。你隐约觉得断裂处指向了教堂东侧，但无法确认。或许换个角度——或者换个人——能看得更清楚。",
      failure:
        "地下室的光线太暗了。你只能勉强辨认出地面上有某种灰白色的痕迹，像是水渍干了之后留下的轮廓——但你无法确定它是圆弧还是不规则的自然扩散。地下室里弥漫着一股奇怪的、像烧过的海盐一样的气味，让你在蹲下观察时感到一阵眩晕。",
      catastrophe:
        "你蹲下去检查地面的那一刻，一股不属于你的、像退潮时的腥咸海水一样的感知从地板下方涌了上来。你的灵性视野在瞬间被一层灰白色的薄雾蒙住了——那不是真实的光线，而是石碑辐射对你的感知产生了干扰。你没有看到盐痕的完整轮廓——反而产生了一种奇怪的错觉：它们在向外扩散，在慢慢靠近你的鞋底。污染+2。",
    },
  },
  {
    id: "seed-public-watchman-contradiction",
    scope: "public",
    phaseHint: "investigation_up",
    title: "多走的那段路",
    source: "authority-case-v2",
    triggerHint: "玩家审阅东区居民证词时",
    textSeed:
      "桥区巡夜人杰里米·霍奇的证词出现一处不易察觉的矛盾：他声称整夜在河岸街以南巡逻，却准确描述了教堂街北侧一扇铁门的锈蚀痕迹——那里距他声明的路线至少隔了三条街巷。而他本人并未意识到这个矛盾。",
    relatedTruthMapIds: ["truth-tampered-prayer"],
    check: {
      attribute: "insight",
      baseDifficulty: 14,
      coopAllowed: true,
      assistAttributes: ["lore", "aura"],
    },
    results: {
      revelation:
        "你反复比对霍奇的证词记录和他三个月前的巡逻报告。矛盾不只在路线——他的巡逻报告里对教堂北侧的描述是'夜间无异常'，但证词中却对那扇铁门的锈蚀做出了惊人的细节描述——门把手上的第三颗铆钉松了，门框底部有一道三英寸长的裂纹。这不是偶然经过的人能注意到的。霍奇一定在那里停留过——不是一次，是很多次。但他的大脑拒绝承认这一点。有人——或者有什么东西——在改写他对自己的记忆。",
      success:
        "矛盾比你最初看到的更深。霍奇在证词中描述铁门细节的语言节奏与其他部分不同——更慢，更犹豫，像是在复述一个他不确定是否亲眼见过的东西。他不是在撒谎——他是真的不确定自己为什么知道那扇铁门的细节。这意味着他的记忆被影响了，但影响不彻底——真相还留在意识的边缘。",
      partial:
        "你注意到矛盾，但无法确定它背后的原因。霍奇可能只是弄混了不同夜晚的巡逻路线——或者他确实经过了那里但不愿意承认。你需要更多信息来判断：是他的记忆出了错，还是有人在改排查他的行为轨迹。",
      failure:
        "证词记录的字迹在你眼前跳动——可能是值夜者的笔录写得太潦草，也可能是你在这一轮调查中已经消耗了太多注意力。你能看到矛盾，但无法深入分析它的成因。你只是把它标注了起来，希望之后有人能看出更多。",
      catastrophe:
        "你在比对霍奇的证词时突然产生了一种强烈的不安——不是来自证词本身，而是来自你自己。你意识到你正在对着一份记录反复推敲一个巡夜人的路线偏差，而你的注意力正被拉向教堂街的方向。你猛地放下了证词。那是一种被引导的感觉——你在不自觉地想要去那个方向。污染+2。你的分析被自己的反应打断了：你无法确定霍奇的矛盾是真实的还是你的感知已经被影响了。",
    },
  },
  {
    id: "seed-private-edwin-griffin-record",
    scope: "private",
    phaseHint: "investigation_up",
    title: "三年前的名字",
    source: "authority-case-v2",
    triggerHint: "艾德温调阅值夜者旧档时，查阅三年前低阶非凡者处理记录",
    textSeed:
      "值夜者旧档中有一份三年前的简短记录：一名低阶非凡者在东区桥区附近因'仪式实验失败导致灵性反噬'而失控死亡。登记用名为'G·索恩'，走隐者途径序列9窥秘人。尸体表面有微弱的灰白色结晶附着。记录未提及石碑——执笔值夜者显然不知道地下室里有什么。",
    affectedRoles: ["role-01-edwin"],
    relatedTruthMapIds: ["truth-yn0417", "truth-salt-arc"],
  },
  {
    id: "seed-public-nightmare-wave",
    scope: "public",
    phaseHint: "discussion_1",
    title: "相同的梦",
    source: "authority-case-v2",
    triggerHint: "第一轮调查后公开线索汇总",
    textSeed:
      "不止一个证人提到同样的噩梦：陌生语言、无意义却让人想继续听下去的祷文，以及教堂深处像在等待什么的空洞回声。",
    relatedTruthMapIds: ["truth-shared-nightmare"],
  },
  {
    id: "seed-reactive-edwin-devlin",
    scope: "relationship",
    phaseHint: "discussion_1",
    title: "不合时宜的偏袒",
    source: "authority-roles-v2",
    triggerHint: "戴芙琳被连续质疑或艾德温承受异常代价时",
    textSeed:
      "你们都以为自己还保持着专业距离，直到有人把问题问得太过直接，或是把他推得太近。",
    affectedRoles: ["role-01-edwin", "role-05-devlin"],
  },
  {
    id: "seed-reactive-lyle-elias",
    scope: "relationship",
    phaseHint: "discussion_1",
    title: "来源不明的知识",
    source: "authority-roles-v2",
    triggerHint: "魔术师模糊某件物品或页面来源，而巫师坚持追问",
    textSeed:
      "一个人知道得太多却不肯说完，另一个人看懂得太深而停不下来。你们谁也不信任谁。",
    affectedRoles: ["role-02-lyle", "role-06-elias"],
  },
  {
    id: "seed-public-missing-page",
    scope: "public",
    phaseHint: "investigation_up",
    title: "尸检缺页",
    source: "authority-case-v2",
    triggerHint: "玩家接触尸检报告或警署档案时",
    textSeed:
      "尸检记录最后一页不见了，只留下被灵性火焰舔过的焦黑边缘。",
    relatedTruthMapIds: ["truth-autopsy-missing-page"],
    check: {
      attribute: "insight",
      baseDifficulty: 12,
      coopAllowed: true,
      assistAttributes: ["lore", "aura"],
    },
    results: {
      revelation:
        "你不仅确认了缺页是被灵性火焰精准烧毁的——你还注意到一个关键细节：焦痕边缘的纸质残留上有一行用铅笔写的小字，笔迹与尸检报告正文不同。'盐类结晶与地下结构存在对应关系——建议进一步比对。'有人在烧掉这页之前，用铅笔补充了一句不应该出现在正式报告里的推断。你确定——销毁这页的人不是想掩盖尸检失误，而是想掩盖一个已经开始浮出水面的关联。",
      success:
        "缺页断口处的焦痕不是普通明火——是灵性火焰。它的特点是燃烧方向可控、不留灰烬、不会意外烧到相邻页面。这意味着撕走并销毁这页的人使用的是非凡手段——而且操作很熟练。这人知道自己在销毁什么。",
      partial:
        "焦痕边缘有轻微的手指油腻——说明有人直接用手撕下了这页，然后当场烧掉。你无法确认火焰的类型，但从焦痕的整齐程度来看——不像慌乱中做的事。那个人有时间。",
      failure:
        "档案室的光线很暗。你只能确认最后一页不见了，但焦痕的细节超出了你的辨识范围。旁边的一名警署记录员低声说了一句'那页上周还在的'，然后立刻闭了嘴。他看起来比你应该表现出来的更紧张。",
      catastrophe:
        "你伸手去碰焦痕边缘的那一刻，一股残留的灵性余烬从纸面上蹿到了你的指尖——烧掉这页的人在被撕下的瞬间，把自己的情绪也烧进去了。是一种冰冷的、目标明确的紧迫感。你猛地缩回手，但那种冰凉的感觉在你的指尖停留了很久。污染+2。你无法确定缺页的细节——那页上可能写了什么，但你现在的注意力被那股不属于你的情绪分散了。",
    },
  },
  {
    id: "seed-public-charity-route",
    scope: "public",
    phaseHint: "investigation_down",
    title: "被安排的路线",
    source: "authority-case-v2",
    triggerHint: "玩家拼出慈善点位与死者活动范围的交集时",
    textSeed:
      "物资分发点、临时室内活动场地、被频繁经过的街角，它们并不随机，而是像一张慢慢向地下收束的网。",
    relatedTruthMapIds: ["truth-charity-signature", "truth-tampered-prayer"],
  },
  {
    id: "seed-public-salt-expansion",
    scope: "public",
    phaseHint: "investigation_down",
    title: "生长的灰白",
    source: "authority-case-v2",
    triggerHint: "玩家在第二轮行动中回访地下室或教堂周边区域时",
    textSeed:
      "首次记录中标记为'不完整圆弧'的灰白色盐痕已显著扩张，沿墙基向两侧延伸约十二米。新盐痕呈根须状分叉，触感微温。无人干预的情况下，它在自行生长。现场封印物检测读数较首次记录上升了约三成。",
    relatedTruthMapIds: ["truth-salt-arc", "truth-artifacts-pointing"],
    check: {
      attribute: "aura",
      baseDifficulty: 14,
      coopAllowed: true,
      assistAttributes: ["will", "insight"],
    },
    results: {
      revelation:
        "你的灵性感知穿透了盐痕表面的晶体结构——你看到的不只是扩散，而是一种有方向的生长。根须状的盐晶在向地下延伸的过程中，每隔一段固定的距离就会形成一个微小的结节——这些结节对应的恰好是灵性引导标记的布置位置。盐痕不只是石碑的副产物，它是石碑辐射网络的地图。你能顺着这张地图找到每一个被标记的居民所在的位置。",
      success:
        "你的灵性感知确认了两件事：盐痕的扩散速度在加快——首次记录时它还在缓慢蔓延，现在每个小时都在向外推进。而且它的扩散不是随意生长：盐痕的根须分叉方向与灵性引导标记的分布隐约对应——有人在石碑周围布下了一张网，盐痕正在沿着网的纹路向外延伸。",
      partial:
        "你感受到了灵性波动的增强——封印物读数不会说谎。但盐痕释放的低频辐射干扰了你的精确定位。你能确认它在扩散，但无法精确判断扩散的方向是否具有人为引导的规律。你隐约觉得它的根须状分叉不是随机的——但证据还不够。",
      failure:
        "你试图用灵性感知追踪盐痕扩散的灵性频率——但石碑本身的辐射干扰太强了。你的灵性视野里看到的是一大片模糊的灰白光晕，无法分辨出具体的扩散方向和速率。你唯一能确认的是温度和读数——这两个数字都在上升。",
      catastrophe:
        "你的灵性感知在下潜的瞬间触到了石碑的核心辐射——一股强烈的精神同化脉冲沿着你的灵性连接反向涌入了你的意识。你短暂地失去了几秒钟的自主思考——等回过神来的时候，你发现自己在不由自主地用指尖在地面上画一个你不认识的图案。你猛地抽回了手。污染+2。你什么信息都没得到——但你感受到了石碑的'意图'：它在完成自己。不需要任何人帮忙。",
    },
  },
  {
    id: "seed-public-second-body",
    scope: "public",
    phaseHint: "investigation_down",
    title: "指尖朝下的祷告",
    source: "authority-case-v2",
    triggerHint: "第二轮行动期间，教会通报发现新尸体",
    textSeed:
      "第二名死者在教堂街以东约四百米的一处废弃仓库内被发现。死者双手被摆成双掌合十、指尖朝下的异常姿势——这不是任何现存正统教会的祷告手势。一名值夜者低声提及，这在值夜者培训教材附录中被标注为'第三纪元异端仪式'。",
    relatedTruthMapIds: ["truth-second-body-gesture", "truth-salt-arc"],
    check: {
      attribute: "aura",
      baseDifficulty: 14,
      coopAllowed: true,
      assistAttributes: ["insight", "will", "lore"],
    },
    results: {
      revelation:
        "你在死者的灵性残留中捕捉到了一个比死亡更早的痕迹——他生前最后几个小时的记忆碎片。那些碎片里没有恐惧，没有愤怒，只有一种奇怪的、反复出现的冲动：他一直在不自觉地做同一个手势。从早晨开始，他会在洗碗的时候、走路的时候、坐在椅子上的时候——突然停下，把双手合十，指尖朝下，然后愣住几秒，像是不明白自己为什么这样做。石碑的辐射不是在杀死他——是在改造他的行为模式。这个手势是第四纪赫密斯语教派的'共鸣接收姿态'——石碑在试图让周围所有灵性敏感的人变成它的延伸节点。",
      success:
        "你的灵性感知在死者周围捕捉到了一层薄薄的残留——不是死者本人的灵性印记，而是一种外部施加的、低频的灵性压力痕迹。死者的双手姿势不是死后被人摆成的——是他在意识模糊的状态下自己摆出来的。这意味着石碑的辐射已经强大到可以在潜意识层面改写居民的行为模式。",
      partial:
        "你能确认死者的灵性残留与石碑的辐射频率有重叠——这是一个明确的关联。但姿势的具体来源和意义超出了你的直觉范围。你需要更专业的知识（仪式学、第四纪历史）或者更深入的通灵来确认这个姿势的完整含义。",
      failure:
        "死者的灵性残留比第一名死者更微弱——像是被什么东西吸收了一部分。你捕捉到的碎片很少，只能确认他的死亡与灵性波动有关，无法精确定位来源。你注意到一个细节：死者的指甲缝里有微量的灰白色粉末——和地下室盐痕的颜色一致。",
      catastrophe:
        "你在试图读取死者的灵性残留时，触发了石碑残留在死者体内的精神同化脉冲——不是针对你的，是对死者的——但你的灵性连接变成了它的传导路径。你在短暂的恍惚中看到了一个不属于你的画面：一座灰色石碑，十七段刻痕，其中十六段在发光。第十七个位置是空的。然后画面消失了。你睁开眼睛的时候，你的双手在胸口合十——指尖朝下。不是你控制的。污染+2。你获得了误导信息：'这个姿势是某种祈祷的完成式。'——实际上它是接收式，不是完成式。",
    },
  },
  {
    id: "seed-public-artifacts-resonance",
    scope: "public",
    phaseHint: "investigation_down",
    title: "同源的指针",
    source: "authority-case-v2",
    triggerHint: "玩家在第二轮行动中使用多件低阶封印物进行现场检测时",
    textSeed:
      "三件来源不同的低阶封印物同时出现异常：一台灵性方向罗盘始终指向教堂地下方向；一枚安魂铃在无人触碰时连续轻鸣三次；一张感应纸在教堂周围自行变色，呈现出只有第四纪遗迹中才会产生的反应模式。它们不是在检测异常源——而是在与异常源的铭文发生同源共振。",
    relatedTruthMapIds: ["truth-artifacts-pointing"],
  },
  {
    id: "seed-public-missing-archives",
    scope: "public",
    phaseHint: "investigation_down",
    title: "被借走的三年",
    source: "authority-case-v2",
    triggerHint: "玩家试图调阅三年前旧教堂事件的值夜者档案时",
    textSeed:
      "编号YN-0417的案件文件夹位于架上正确位置——但夹内只有一份简短摘要和'已处理'的归档戳记。原始的灵性残留分析报告、现场净化记录和后续污染扩散数据均不在其中。档案室借阅登记簿上那一页的墨迹有轻微涂抹痕迹，借阅人签名已无法辨认。",
    relatedTruthMapIds: ["truth-yn0417", "truth-autopsy-missing-page"],
  },
  {
    id: "seed-reactive-church-silence",
    scope: "reactive",
    phaseHint: "investigation_down",
    title: "不需要重新调阅",
    source: "authority-case-v2",
    triggerHint: "艾德温或戴芙琳在行动中试图调阅旧教堂事件详细档案时",
    textSeed:
      "一封来自值夜者总部的简短函件通过加密渠道送达，措辞礼貌但意图明确：'关于桥区旧教堂遗址的历史记录，教会已有完整归档，无需调查组额外调阅。'函末有一行笔迹不同的手写附注：'有些旧记录如果被重新翻出来，对谁都没有好处。'",
    affectedRoles: ["role-01-edwin", "role-05-devlin"],
    relatedTruthMapIds: ["truth-yn0417"],
  },
  {
    id: "seed-reactive-austen-directive",
    scope: "reactive",
    phaseHint: "investigation_down",
    title: "不必等待",
    source: "authority-case-v2",
    triggerHint: "案件调查接近需要进入地下室或接触石碑本身的关键节点时",
    textSeed:
      "代罚者总部通过单独加密渠道向奥斯顿发送了一条补充指令：'如确认目标物件为编号2-113，立即执行封存，不必等待黑夜女神教会方面的意见。'在收到指令后的下一次集体行动中，奥斯顿突然要求封锁教堂街北侧的一段区域，与他此前配合调查的姿态形成明显反差。",
    affectedRoles: ["role-03-austen"],
    relatedTruthMapIds: ["truth-badge-priority", "truth-artifacts-pointing"],
  },
  {
    id: "seed-private-cecilia-childhood",
    scope: "private",
    phaseHint: "investigation_down",
    title: "慢一点",
    source: "authority-roles-v2",
    triggerHint: "当证据指向亚瑟确实涉及案件——慈善项目签名时间线被公开、或灵性引导标记与慈善点位重合被发现时",
    textSeed:
      "你七岁那年第一次在家族宴会上公开致辞前紧张得快哭了。亚瑟那时候十六岁，蹲在你面前，用只有你能听到的声音说：'慢一点，别怕。你就看着最远处那盏灯，一个字一个字说。'现在你手中的证据告诉你，那个在侧门后面蹲下来的人在过去三年里利用慈善项目将数十名居民变成了一个仪式网络的活体节点。你的表兄和幕后推手是同一个人。",
    affectedRoles: ["role-04-cecilia"],
    relatedTruthMapIds: ["truth-charity-signature", "truth-tampered-prayer"],
  },
  {
    id: "seed-private-elias-fathers-notebook",
    scope: "private",
    phaseHint: "investigation_down",
    title: "停不下来的好奇心",
    source: "authority-roles-v2",
    triggerHint: "伊莱亚斯深入分析祷文结构、即将触碰石碑核心仪式逻辑时",
    textSeed:
      "你十六岁那年翻开了父亲书架最高层那本被锁住的笔记。笔记上记录的是一个学者在试图理解一件不应该被理解的器物时，逐步被器物的逻辑吸引、最终开始用器物的思维方式来思考的完整过程。最后一页写着：'危险的不是知识本身，而是你对知识的好奇心比你想象中更难停下来。'你现在距离石碑核心仅一步之遥。",
    affectedRoles: ["role-06-elias"],
    relatedTruthMapIds: ["truth-tampered-prayer"],
  },
  {
    id: "seed-public-seal-dispute",
    scope: "public",
    phaseHint: "discussion_2",
    title: "谁的封印物",
    source: "authority-case-v2",
    triggerHint: "调查组确认需要封存石碑、两教会对封存方式产生分歧时",
    textSeed:
      "封存方案讨论陷入僵局。代罚者坚持使用风暴教会标准程序将石碑转移至代罚者保管设施，值夜者主张两教会联合封存原地监管。一名代罚者军官在争论中失口说了一句：'我们的编号在先，我们有优先权。'这句话让在场所有人都沉默了——'我们的编号'意味着风暴教会早在黑夜教会不知情的情况下就完成了对石碑的独立编目。",
    relatedTruthMapIds: ["truth-badge-priority"],
  },
  {
    id: "seed-public-case-meeting-2",
    scope: "public",
    phaseHint: "discussion_2",
    title: "谁还能靠近核心",
    source: "authority-case-v2",
    triggerHint: "第二轮讨论开始时",
    textSeed:
      "现在的问题已不再是谁更可疑，而是谁还有资格触碰核心、谁必须被隔离、谁要为最终处置负责。",
  },
  {
    id: "seed-ending-perfect",
    scope: "ending",
    phaseHint: "resolution",
    title: "真相抵达了该抵达的人",
    source: "authority-case-v2",
    triggerHint: "完美收束结局",
    textSeed:
      "石碑被重新封印，旧案报告重见天日。没有谁真正得到奖赏，但这一次，真相至少没有再被顺手封回抽屉里。",
  },
  {
    id: "seed-ending-compromise",
    scope: "ending",
    phaseHint: "resolution",
    title: "体面是最昂贵的沉默",
    source: "authority-case-v2",
    triggerHint: "妥协收束结局",
    textSeed:
      "事情被压住了，名字被保住了，街区暂时也安静了下来。但你们都知道，还有什么东西停在封签后面，没有真正结束。",
  },
  {
    id: "seed-ending-collapse",
    scope: "ending",
    phaseHint: "resolution",
    title: "还没结束",
    source: "authority-case-v2",
    triggerHint: "崩坏收束结局",
    textSeed:
      "崩坏不是结束，而是那句低语变得更安静、更广泛、更不肯离开的开始。",
  },
  {
    id: "seed-ending-edwin-perfect",
    scope: "ending",
    phaseHint: "resolution",
    title: "已处理",
    source: "authority-case-v2",
    triggerHint: "完美收束结局达成时，艾德温的个人结局",
    textSeed:
      "三年的旧案终于被翻了出来。你那份灵性残留分析报告被重新阅读、正式归档。你没有升职，没有表彰。你只是终于在值夜日志上写下了一句迟到了三年的话：'已处理。'这一次，这两个字是真的。",
    affectedRoles: ["role-01-edwin"],
    relatedTruthMapIds: ["truth-yn0417"],
  },
  {
    id: "seed-ending-lyle-perfect",
    scope: "ending",
    phaseHint: "resolution",
    title: "多出的九页",
    source: "authority-case-v2",
    triggerHint: "完美收束结局达成时，莱尔的个人结局",
    textSeed:
      "残卷的关键两页被销毁，任务完成。但你在销毁之前做了一个委派者不知道的决定——你逐页阅读了其余九页并将它们默记在脑中。这些内容不具备实际激活石碑的功能，但也许有一天能帮到某个需要理解真相的人。",
    affectedRoles: ["role-02-lyle"],
    relatedTruthMapIds: ["truth-tampered-prayer"],
  },
  {
    id: "seed-ending-austen-perfect",
    scope: "ending",
    phaseHint: "resolution",
    title: "船还没翻",
    source: "authority-case-v2",
    triggerHint: "完美收束结局达成时，奥斯顿的个人结局",
    textSeed:
      "石碑被封存了。不是被风暴教会单独封存——是两教会联合执行的高级别封印。你在封存过程中选择了配合而非抢先。你的教会不会高兴——你违背了'不必等待'的指令。但你确认了一件事：船还没翻。你站在船翻之前砸碎了危险。",
    affectedRoles: ["role-03-austen"],
    relatedTruthMapIds: ["truth-badge-priority"],
  },
  {
    id: "seed-ending-cecilia-perfect",
    scope: "ending",
    phaseHint: "resolution",
    title: "没有慢一点的余地",
    source: "authority-case-v2",
    triggerHint: "完美收束结局达成时，塞西莉亚的个人结局",
    textSeed:
      "你在讨论中说出了你应该说的话。霍尔文家族的名字会和亚瑟一起出现在值夜者的正式报告中。这意味着两百年的家族声誉全都没了。亚瑟被逮捕的时候没有挣扎，只是用一种你从未见过的平静看着你——好像在说：你做了正确的选择。但正确和正确之间有区别。",
    affectedRoles: ["role-04-cecilia"],
    relatedTruthMapIds: ["truth-charity-signature"],
  },
  {
    id: "seed-ending-devlin-perfect",
    scope: "ending",
    phaseHint: "resolution",
    title: "回声散尽",
    source: "authority-case-v2",
    triggerHint: "完美收束结局达成时，戴芙琳的个人结局",
    textSeed:
      "灵界中那道低语消失了。'还没结束'在最后一个夜晚回荡了三次，然后安静了。你在封存行动中充当了灵性定位的核心——你的残响引导封印团队找到了石碑辐射最密集的节点。灵界归于安静。而这安静第一次不是空洞，而是完成。",
    affectedRoles: ["role-05-devlin"],
    relatedTruthMapIds: ["truth-shared-nightmare"],
  },
  {
    id: "seed-ending-elias-perfect",
    scope: "ending",
    phaseHint: "resolution",
    title: "合上的笔记",
    source: "authority-case-v2",
    triggerHint: "完美收束结局达成时，伊莱亚斯的个人结局",
    textSeed:
      "你没有读到最后一页。在石碑核心仪式逻辑面前你停了下来——不是因为害怕，而是因为你在封存的最后关头充当了仪式分析的核心环节，已有的信息足够了。案件结束后你把父亲的笔记重新锁回了书架。这一次是你自己上的锁。",
    affectedRoles: ["role-06-elias"],
    relatedTruthMapIds: ["truth-tampered-prayer"],
  },
  {
    id: "seed-ending-cecilia-compromise",
    scope: "ending",
    phaseHint: "resolution",
    title: "体面的版本",
    source: "authority-case-v2",
    triggerHint: "妥协收束结局达成时，塞西莉亚的个人结局",
    textSeed:
      "案件的官方结论里没有霍尔文家族的名字。亚瑟没有被公开逮捕，被'秘密转移至值夜者安全设施接受评估'。官方报告的措辞非常体面：'东区异常灵性事件已得到妥善处置。'你在社交圈里听到的版本更干净。你不知道这是谁的安排。但你比任何人都更快地注意到了这些措辞的来源——因为你就是看人最准的那一个。",
    affectedRoles: ["role-04-cecilia"],
    relatedTruthMapIds: ["truth-charity-signature"],
  },
  {
    id: "seed-ending-elias-collapse",
    scope: "ending",
    phaseHint: "resolution",
    title: "最后一页",
    source: "authority-case-v2",
    triggerHint: "崩坏收束结局达成时，伊莱亚斯的个人结局",
    textSeed:
      "你读了最后一页。石碑的核心仪式逻辑比你想象的更完整、更精密、更——美。你读完之后沉默了很久，然后发现一个问题：你脑中关于石碑的理解和亚瑟脑中的理解已经不完全一样了。亚瑟的理解是被'被授意感'扭曲的。你的理解是被知识本身扭曲的。区别微乎其微。",
    affectedRoles: ["role-06-elias"],
    relatedTruthMapIds: ["truth-tampered-prayer"],
  },
];
