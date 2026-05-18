# 剧情架构与流程图：P1-P5 搜证与生存

> **核心机制**：混合推进（轮次定场景 + 阈值触事件）
> **公共敌人**：失控的通灵者 (Sequence 7)

## 1. 阶段流程图 (Flowchart)

```mermaid
graph TD
    Start[对局开始：停尸房集结] --> P1
    
    subgraph P1_P2_Mist [P1-P2: 迷雾搜集]
        P1[P1: 验尸 / 初步调查] --> P1_Check{线索检查}
        P1_Check -- 线索 < 2 --> Deadlock[死寂的僵局: 难度增加]
        P1_Check -- 线索 >= 2 --> Echo[灵界回响: 获得关键线索]
        Deadlock --> P2
        Echo --> P2
        P2[P2: 尸体异变 / 压力初显] --> Boss_Check_1
    end

    Boss_Check_1{Boss 威胁检查}
    Boss_Check_1 -- < 40% --> Safe_Transit[平稳转移]
    Boss_Check_1 -- >= 40% --> Crisis_Transit[危险转移: 全员污染 +5]
    
    Safe_Transit --> P3
    Crisis_Transit --> P3

    subgraph P3_P5_Conspiracy [P3-P5: 阴谋暗流]
        P3[P3: 转移至煤气厂 / 仪式开启] --> Env_Pressure[环境压力自然增长]
        P4[P4: 理智临界点 / 阵营分化检定] --> Neutral_Check{中立玩家行为检查}
        
        Neutral_Check -- 净化/救人多 --> Investigator[倾向守序]
        Neutral_Check -- 污染高/自私 --> Polluted[倾向邪恶/失控]
        
        P4 --> Boss_Check_2{Boss 威胁检查}
        Boss_Check_2 -- >= 80% --> Crisis_Burst[危机爆发: 亡者凝视!]
        Boss_Check_2 -- < 80% --> P5
        
        Crisis_Burst --> P5
        
        P5[P5: 最终搜证 / 决战前夕] --> EndCheck
    end
    
    EndCheck[P5 结束] --> Showdown[进入 P6 最终决战阶段]
```

## 2. 关键分支说明

### 分支 A：中立玩家的演化 (P4 阶段)
*   **触发时机**：P4 轮次结束时。
*   **判定逻辑**：
    *   **守序倾向**：使用“净化/护盾”卡牌次数 $\ge$ 3 次，且当前污染 $< 40\%$。
        *   *结果*：`faction` 变更为 `investigator`，获得“人性”Buff（灵性上限 +1）。
    *   **邪恶倾向**：当前污染 $\ge 60\%$，或使用了“仪式”类卡牌。
        *   *结果*：`faction` 变更为 `polluted`，获得“神性”Buff（仪式推进效率翻倍）。
    *   **边缘状态**：若不满足以上条件，保持 `unknown`，但在 P5 阶段受到的 Boss 伤害翻倍（由于意志薄弱）。

### 分支 B：Boss 危机爆发 (P3-P5)
*   **触发条件**：`Boss.threatLevel` 在 P3 结束时 $\ge 80\%$。
*   **效果**：
    1.  **亡者凝视**：所有玩家污染度 $+10$。
    2.  **线索失效**：本轮打出的“调查”牌获得的线索减半（因为 Boss 干扰了灵界）。
    3.  **剧情提示**：“失控的通灵者发现了你们，它发出了刺耳的尖啸，停尸房的灯光瞬间熄灭……”

## 3. 阵营与剧情对应
*   **调查者 (守序)**：剧情上表现为试图封印 Boss，保护贝克兰德。
*   **渗透者 (邪恶)**：剧情上表现为试图引导 Boss 的力量，完成仪式。
*   **失控边缘者 (中立->邪恶)**：剧情上表现为被 Boss 吸引，最终成为 Boss 降临的容器。
