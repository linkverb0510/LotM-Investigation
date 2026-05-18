# P1 问题解决计划：架构与体验优化

> **目标**：修复架构缺陷、提升玩家体验、为扩展打好基础
> **优先级**：高（P0 完成后启动）
> **预计工时**：4-6 小时（含测试）

---

## 一、P1-1: Socket 错误处理完善

### 问题
`engine.ts` 多处 `throw new Error`，需确认 `socket-events.ts` 正确 catch 并返回客户端。

### 实施步骤
1. 审查 `socket-events.ts` 中所有调用引擎函数的路径
2. 统一错误处理模式：
   ```ts
   try {
     const newState = submitTurnAction(currentState, action);
     socket.emit("gameStateUpdate", serializePublicState(newState, socket.id));
   } catch (err) {
     socket.emit("actionError", { message: (err as Error).message });
   }
   ```
3. 前端在 `room-client.tsx` 中监听 `actionError` 事件并展示 toast
4. 添加超时处理：玩家 60 秒未出牌自动跳过

---

## 二、P1-2: 身份鉴权

### 问题
无验证机制，任何人知道 playerId 即可冒充。

### 方案
使用加入房间时生成的短期 token 进行验证。

### 实施步骤
1. `room-store.createRoom` 时为每个玩家生成 `joinToken`
2. 玩家加入时携带 `joinToken`，服务端验证
3. Socket 连接时绑定 `playerId + joinToken` 对
4. 后续所有操作校验 socket 与 playerId 的绑定关系

---

## 三、P1-3: Prisma 房间持久化

### 问题
内存存储，服务端重启数据全丢。

### 实施步骤
1. 创建 `prisma/schema.prisma`：
   - `Room` 模型（code, hostId, status, createdAt）
   - `GameSnapshot` 模型（roomId, gameState JSON, round）
   - `PlayerSession` 模型（roomId, playerId, name, joinToken）
2. 实现 `room-store` 的双写逻辑：
   - 内存缓存（当前行为）+ 定期持久化到 SQLite
   - 关键操作（房间创建、游戏结束）立即写入
3. 服务端重启时从 SQLite 恢复活跃房间

---

## 四、P1-4: 讨论阶段推理机制

### 问题
当前讨论阶段仅"投票确认继续"，无推理发言。

### MVP 方案
不实现复杂聊天室，而是增加"投票指认"机制：

1. **P2 讨论·一**：每人可投一张"怀疑票"给某玩家
   - 票数最高者被标记为"高嫌疑"（仅视觉提示，不影响游戏逻辑）
2. **P4 讨论·二**：每人可选择"公开指控"或"保持沉默"
   - 指控需消耗线索，指控成功（被指控者是污染源）则调查者获得优势

### 实施步骤
1. 在 `engine.ts` 新增 `submitAccusation` 函数
2. `resolveRound` 中统计指控结果
3. 前端添加指控 UI（玩家列表旁的小按钮）

---

## 五、P1-5: 中立角色体验补充

### 问题
`06-unstable-one` 在 P1-P3 期间无特殊机制。

### 方案
增加"理智侵蚀"被动效果：

| 轮次 | 效果 |
|------|------|
| P1 | 提示"你听到来自灰雾的低语..."（仅自己可见的日志） |
| P2 | 线索获取时额外 +1（双刃剑：信息多但更可疑） |
| P3 | 污染度自动 +5（内在侵蚀） |

### 实施步骤
1. 在 `resolveRound` 开头检查 `edgePlayer` 存在性
2. 根据当前 plotPhase 应用侵蚀效果
3. 在日志中添加专属提示（仅对自己可见，通过 `serializePublicState` 过滤）

---

## 六、验收标准

- [ ] 所有引擎错误都能被前端正确捕获并展示
- [ ] 加入房间需要有效 joinToken
- [ ] 服务端重启后活跃房间可恢复
- [ ] 讨论阶段有"怀疑投票"功能
- [ ] 不稳定者在 P1-P3 有专属体验

---

## 七、风险与替代方案

| 风险 | 缓解 |
|------|------|
| Prisma 迁移复杂 | 先用简单 JSON 文件序列化作为过渡 |
| 讨论机制增加复杂度 | MVP 阶段只做简单投票，后续加聊天室 |
| 鉴权影响本地开发 | 开发环境可跳过 token 校验（环境变量控制） |
