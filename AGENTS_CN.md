# YGOPro 脚本编写工作流 — Agent 指南

**权衡：** 这些指南优先保证准确性而非速度。不要猜测——必须验证源码。

## 1. 核心原则

### 先思考再编码
- **不要假设。不要隐藏困惑。明确展示权衡。**
- 每个 API、常量、函数签名都必须来自 `ygopro/script/*.lua`、`ygopro/ocgcore/*.cpp` 或 `ygopro/gframe/*`。
- 本项目使用 YGOPro 官方版本，不是 Project Ignis / EDOPro。不要使用其他分支的 API。
- 如果不确定，在 `ygopro/script/` 搜索类似效果——这是正常工作流程，不是困惑的表现。

### 简单优先
- **用最少代码解决问题。不要推测性编码。**
- 匹配 `ygopro/script/` 中的现有脚本风格。
- 不要为不可能的场景写错误处理。不要不必要的抽象。

### 精准修改
- **只改必须改的。只清理自己的混乱。**
- 不要"改进"相邻代码，除非被要求。
- 如果发现无关问题，提出来——不要默默修复。

### 目标驱动执行
- **定义成功标准。循环直到验证通过。**
- 脚本通过红字检查 + 所有测试通过 = 完成。
- 实现前声明验证步骤。

---

## 2. 项目结构

### 目录地图

| 目录 | 用途 | 何时读取 |
|------|------|----------|
| `workspace/` | 用户工作区，包含目标 `.cdb` 和脚本 | 始终 |
| `workspace/**/script/` | 卡片脚本：`workspace/foo/bar/script/c{code}.lua` | 编写脚本时 |
| `ygopro/cards.cdb` | 官方卡池——搜索相似效果、测试卡 | 查找参考时 |
| `ygopro/script/` | 官方脚本、`utility.lua`、`procedure.lua`、`constant.lua` | 验证 API 时 |
| `ygopro/ocgcore/` | C++ 核心——Lua API、常量、事件、脚本加载 | 确认行为时 |
| `ygopro/gframe/` | 客户端交互——MSG/response 关系 | E2E 测试时 |
| `ref/ygopro-cdb-encode/` | `.cdb` 读写工具参考 | 数据库操作时 |
| `ref/ygopro-jstest/` | 测试驱动参考 | 编写测试时 |
| `ref/ygopro-msg-encode/` | MSG/CTOS/STOC 编解码和 response 参考 | E2E 测试时 |
| `ref/koishipro-core.js/` | OCGCore JS 封装参考 | 理解核心时 |
| `src/create-test.ts` | 测试入口——自动附加 `ygopro/cards.cdb` 和 `ygopro/script/` | 编写测试时 |
| `src/create-coverage.ts` | Lua 行覆盖率入口 | 覆盖率报告 |
| `src/current-messages.ts` | 消息断言助手 | E2E 断言 |
| `tests/sample/standalone.spec.ts` | E2E 测试结构示例 | 编写测试时 |

**警告：** `ygopro/` 和 `ref/` 是上游参考目录。除非明确要求，不要修改。

### 参考源码规则
- **永远不要**用 `node_modules/` 作为源码参考。改读 `ref/`。
- `node_modules/` 只用于安装依赖和运行命令。
- 当堆栈跟踪指向 `node_modules/` 时，可以用文件名/函数名定位，但确认实现仍需查看 `ref/`。
- 结论/测试中的引用必须来自 `ref/`、`ygopro/` 或本项目——不是 `node_modules/`。
- `.codex` 文件是 Codex CLI 的产物。不要清理、格式化或修改，除非被要求。

---

## 3. 设置与准备

### 初始设置
```bash
npm ci  # 安装依赖（如果 node_modules/ 不存在）
```

### 编写脚本前
```bash
npm run prepare:ygopro  # 更新 ygopro/ 和子模块
npm run prepare:ref     # 更新 ref/ 参考仓库
```
在处理新卡片前运行这些——目录可能已过期。

---

## 4. 卡片识别

### 查找目标卡片
```bash
rg --files workspace -g '*.cdb'  # 查找 workspace 中所有 .cdb 文件
```

### 查询卡片数据
**必须**通过 Node.js/TypeScript 使用 `ygopro-cdb-encode`。永远不要手写 SQLite 或猜测字段。

**必须验证的字段：**
- `code` — 卡片 ID
- `name` — 卡片名称
- `desc` — 效果文本
- `alias` — 原始卡片 ID（如果不是变体则为 0）
- `type` — 卡片类型标志
- `setcode` — 字段/系列代码
- `category` — 效果类别

### 何时不写脚本
跳过 `script/c{code}.lua` 的情况：
1. **异画复用卡：** `alias != 0`，workspace 中存在 `code == alias` 的原始版本，且差值 < 20
2. **非灵摆通常怪兽：** `type & 0x10 != 0` 且 `type & 0x1000000 == 0`

所有其他卡片（效果卡、魔法卡、陷阱卡、灵摆通常怪兽）都需要脚本。

---

## 5. 效果文本分析

### 关键术语——中英对照

| 中文术语 | 英文等效 | 脚本含义 |
|----------|----------|----------|
| 召唤成功的场合 | When successfully summoned | `SetCode(EVENT_SUMMON_SUCCESS)` |
| 被破坏的场合 | When destroyed | `SetCode(EVENT_DESTROYED)` |
| 攻击宣言时 | When attack declared | `SetCode(EVENT_ATTACK_ANNOUNCE)` |
| 对方的主要阶段 | During opponent's Main Phase | `SetHintTiming(TIMING_MAIN_END)` |
| 从手卡发动 | Activate from hand | `SetRange(LOCATION_HAND)` |
| 以...为对象才能发动 | Target to activate | `EFFECT_FLAG_CARD_TARGET` |
| 场上有「xxx」存在的场合才能发动 | Can activate if "xxx" on field | `condition` 检查 |
| 选1张卡 | Select 1 card | `Duel.SelectTarget` 或 `Duel.SelectMatchingCard` |
| 那之后 | After that | `operation` 中的顺序处理 |
| 送入墓地 | Send to Graveyard | `CATEGORY_TOGRAVE` |
| 从卡组加入手卡 | Add from Deck to hand | `CATEGORY_SEARCH` |
| 特殊召唤 | Special Summon | `CATEGORY_SPECIAL_SUMMON` |
| 破坏 | Destroy | `CATEGORY_DESTROY` |
| 1回合1次 | Once per turn | `SetCountLimit(1, id)` |
| 这个卡名的效果1回合只能使用1次 | This card's effects can only be used once per turn | 所有效果使用 `SetCountLimit(1, id)` |

### 解析效果文本

**编写脚本前，将每个效果拆分为：**

1. **发动时机** → `SetCode(EVENT_XXX)` + `SetType(EFFECT_TYPE_*)`
   - 触发类："当 X 发生时" → `EVENT_XXX`
   - 自由连锁："可以发动" → `EVENT_FREE_CHAIN`
   - 速攻效果：需要 `EFFECT_TYPE_QUICK_O/F` + `SetHintTiming(...)`

2. **条件** → `condition` 函数
   - 效果发动时必须为真的条件（不是时机事件）
   - 例："自己场上有 X" 是条件；"当 X 被召唤时" 是时机

3. **代价** → `cost` 函数
   - 发动时必须支付的代价
   - `chk==0`：检查是否能支付
   - `chk~=0`：实际支付

4. **对象** → `target` 函数
   - 发动时必须选择/取对象的内容
   - `chk==0`：检查是否存在有效对象
   - `chk~=0`：选择对象 + `Duel.SetOperationInfo(...)`

5. **处理** → `operation` 函数
   - 连锁处理后实际发生的事情
   - 永远不要把处理逻辑放在 `target` 中

### 取对象 vs 非取对象选择

**取对象效果**（为对象）：
- 设置 `EFFECT_FLAG_CARD_TARGET`
- `target` 使用 `Duel.IsExistingTarget()` (chk==0) 和 `Duel.SelectTarget()` (chk~=0)
- `operation` 通过 `Duel.GetFirstTarget()` + `IsRelateToEffect(e)` 取回对象

**非取对象效果**（选）：
- 不设置 `EFFECT_FLAG_CARD_TARGET`
- `target` 使用 `Duel.IsExistingMatchingCard()` (chk==0)
- `operation` 使用 `Duel.SelectMatchingCard()` + `Duel.HintSelection(g)`（当玩家选择重要时）

**参考脚本：**
- `ygopro/script/c18239909.lua` — 先取对象后非取对象选择
- `ygopro/script/c39531794.lua`、`c59011257.lua` — `SetCardTarget` 示例（罕见用法）

---

## 6. 脚本编写流程

### 分步流程

1. **分析效果文本** → 拆分为时机、条件、代价、对象、处理
   - 与 `ygopro/cards.cdb` 中类似卡片及其脚本验证

2. **使用 `ygopro-cdb-encode` 搜索类似官方卡片**
   - 优先选择第 9 期之后的卡片（文本包含 `①：`）
   - 第 9 期前的文本可能误导——需用脚本验证

3. **学习参考脚本** `ygopro/script/c{code}.lua`
   - 将文本模式映射到实际的 `SetCode()`、`condition`、`cost`、`target`、`operation`

4. **验证 API 签名**，对照：
   - `ygopro/script/utility.lua`
   - `ygopro/script/procedure.lua`
   - `ygopro/script/constant.lua`
   - `ygopro/ocgcore/libduel.cpp`
   - `ygopro/ocgcore/libcard.cpp`
   - `ygopro/ocgcore/libeffect.cpp`

5. **编写脚本**，遵循官方模式

6. **红字检查** → 必须通过

7. **编写测试** → 单元 + E2E

8. **运行测试** → 必须通过

### 关键规则

#### `SetOperationInfo` — 正确的类别
- `CATEGORY_SEARCH` — 从卡组加入手卡
- `CATEGORY_TOGRAVE` — 送入墓地
- `CATEGORY_SPECIAL_SUMMON` — 特殊召唤
- `CATEGORY_DESTROY` — 破坏
- 缺失或错误的类别会破坏连锁检测

#### `SetCountLimit` — 次数代码
- "每个效果1回合1次"：效果 1 = `id`，效果 2 = `id+o`，效果 3 = `id+2*o`
- "1回合只能有1次使用其中任意1个"：所有效果使用同一个 `id`
- 相同触发时点的克隆效果共享一个次数代码
- 非 9 位连续卡号：使用 `id`、`id+100`、`id+200` 避免冲突
- 使用自定义模式前检查 workspace 惯例
- `EFFECT_COUNT_CODE_OATH`、`EFFECT_COUNT_CODE_DUEL` — 使用前在 ocgcore 验证

#### `description` — 起动/诱发/速攻效果必须设置
- `SetType` 包含 `EFFECT_TYPE_IGNITION`、`EFFECT_TYPE_TRIGGER_O`、`EFFECT_TYPE_TRIGGER_F`、`EFFECT_TYPE_QUICK_O`、`EFFECT_TYPE_QUICK_F` → 必须设置 `description`
- 通常写法 `e:SetDescription(aux.Stringid(id, n))`
- 检查 `Clone()` 出来的效果是否继承正确的 description

#### `aux.Stringid` — 与 `.cdb` 同步
- `aux.Stringid(id, 0)` → `texts.str1`
- `aux.Stringid(id, 1)` → `texts.str2`
- 使用 `ygopro-cdb-encode` 编辑 `.cdb`，永远不要手编

---

## 7. 红字检查

```bash
npm run check:redtext -- <cdb>[:id,id...] [...]
```

**示例：**
```bash
npm run check:redtext -- workspace/33741/33741.cdb:33741001
npm run check:redtext -- workspace/33741/33741.cdb
npm run check:redtext -- workspace/foo/a.cdb:11111111,22222222
```

**规则：**
- 必须至少一个参数
- 不写 `:id,id...` → 检查 `.cdb` 中所有卡片
- 写了 ID → 验证它们存在于 `.cdb`
- 脚本目录 = `path.dirname(cdb)/script`
- 每张卡会被加入卡组并推进一次
- **必须通过。** 修复脚本直到通过。

---

## 8. 测试要求

### 测试结构
- 每张卡一个 `.spec.ts`
- 路径映射：`workspace/foo/bar/baz.cdb` → `tests/workspace/foo/bar/baz/c{code}.spec.ts`
- Fixtures 放在 `tests/workspace/.../fixtures/`（不是顶层 `tests/fixtures/`）
- **必须：** 每个文件包含单元 + E2E 测试

### Lua 覆盖率
```typescript
import { resolve } from 'path';
import { createCoverage, createTest } from '../../src';

describe('...', () => {
  const scriptDir = resolve(__dirname, '../../../workspace/foo/bar/script');
  const coverageRegistry = createCoverage({ scriptDir });

  it('...', async () => {
    await createTest({ cdb, scriptPath: scriptDir }, (ctx) => {
      ctx.addCard(...).advance(...).state(...);
      coverageRegistry.addFrom(ctx);
    });
  });
});
```

**规则：**
- `scriptDir` 必填——必须与 `createTest({ scriptPath })` 匹配
- `createCoverage()` 自动注册 `afterAll`——不要手动添加
- 每个 `it` 中每个 duel 结束后调用 `coverageRegistry.addFrom(ctx)`
- `missing executable lines` = 待补充测试的 TODO 清单
- 不要为了提高覆盖率写没有断言的流程

### 单元测试
- 使用 `createTest({ cdb, scriptPath }, cb)`
- 测试纯逻辑：`filter`、`condition`、`value`、`cost`/`target` 的 `chk==0`
- **永远不要**传 `nil` 给 `e`——通过 `Effect.CreateEffect(c)` 构造
- 布尔函数必须覆盖 `true` 和 `false` 两种结果
- `ctx.evaluate()` 中**禁止**：`Duel.Select*`、`operation`、状态变更

### E2E 测试
- 参考：`tests/sample/standalone.spec.ts`
- 覆盖所有效果、分支和失败路径
- 验证融合/同调/超量/连接召唤手续
- 测试次数限制（1回合1次、共享限制）
- 验证连锁检测（灰流丽 `14558127`、神之警告 `84749824`、屋敷童 `73642296`、星尘龙 `44508094`）

### 消息断言
助手函数在 `src/current-messages.ts`：

```typescript
expectCurrentMessage(ctx, MsgClass, assertMessage?)  // 单条消息
expectCurrentMessages(ctx, ...MsgClasses)              // 多条消息
expectCurrentMessageMatching(ctx, MsgClass, expected)  // 匹配字段
expectCurrentHint(ctx, expected)                       // 提示专用
```

**规则：**
- `YGOProMsgHint`、`YGOProMsgCardHint`、`YGOProMsgPlayerHint` 必须检查具体字段
- LP 消息：检查 `value`/`cost`/`lp` + `player`
- `currentMessages` 只包含自上次 `state()` 回调以来的消息
- 在关键操作后的第一个 `state()` 中断言

### Advancor 用法
参考：`ref/ygopro-jstest/` 和 `ref/koishipro-core.js/src/advancors/`

| Advancor | 用途 |
|----------|------|
| `advance(...)` | 处理决斗直到需要 response 的 MSG |
| `state(MsgClass, cb)` | 断言当前 MSG 类型 |
| `SlientAdvancor()` | 自动回应所有（跳过可选连锁） |
| `NoEffectAdvancor()` | 仅在无连锁时回应 |
| `SummonPlaceAdvancor()` | 处理位置/表示形式选择 |
| `SelectCardAdvancor(...filters)` | 按过滤器自动选择卡片 |
| `StaticAdvancor(items)` | 预定义回应 |
| `MapAdvancor(...)` / `MapAdvancorHandler(Msg, cb)` | MSG 类型分发 |
| `LimitAdvancor(...)` / `OnceAdvancor(...)` | 限制回应次数 |
| `PlayerViewAdvancor(player, advancor)` | 玩家特定回应 |

**关键：** 从 `state()` 回调返回回应！`summon()`、`activate()`、`select()` 都返回 response 字节。

### 常见 E2E 模式
```typescript
// 1. 跳到主要阶段
advance(SlientAdvancor())

// 2. 断言可以发动/召唤
state(YGOProMsgSelectIdleCmd, (msg) => {
  expect(card.canActivate()).toBe(true);
  return card.activate();
})

// 3. 处理位置 + 无连锁
advance(SummonPlaceAdvancor(), NoEffectAdvancor())

// 4. 关键选择——必须先断言候选
state(YGOProMsgSelectCard, (msg) => {
  expect(msg.selectableCards).toContainEqual(expect.objectContaining({ code: 12345 }));
  return card.select();
})
```

---

## 9. 最终验证

标记完成前：

```bash
npm run check:redtext -- <target.cdb>:<code>
npm test -- <mapped-test-path>
npm run lint  # 编辑 .spec.ts 后
```

**全部必须通过。** 迭代直到绿色。

---

## 快速参考

### 效果类型映射
| 中文效果类型 | 常量 | 典型用途 |
|--------------|------|----------|
| 起动效果 | `EFFECT_TYPE_IGNITION` | 类似通常魔法的怪兽效果 |
| 诱发效果 | `EFFECT_TYPE_TRIGGER_O` | 可选的诱发效果 |
| 必发诱发效果 | `EFFECT_TYPE_TRIGGER_F` | 必发的诱发效果 |
| 速攻效果 | `EFFECT_TYPE_QUICK_O` | 速攻效果（对方回合） |
| 必发速攻效果 | `EFFECT_TYPE_QUICK_F` | 必发的速攻效果 |
| 永续效果 | `EFFECT_TYPE_SINGLE` | 永续效果 |
| 场地效果 | `EFFECT_TYPE_FIELD` | 类似场地魔法的效果 |

### 常见事件代码
| 事件 | 含义 |
|------|------|
| `EVENT_FREE_CHAIN` | 任意时点 |
| `EVENT_SUMMON_SUCCESS` | 成功召唤 |
| `EVENT_SPSUMMON_SUCCESS` | 成功特殊召唤 |
| `EVENT_DESTROYED` | 被破坏 |
| `EVENT_ATTACK_ANNOUNCE` | 攻击宣言 |
| `EVENT_DAMAGE_STEP_START` | 伤害步骤开始 |
| `EVENT_TO_GRAVE` | 送入墓地 |
| `EVENT_LEAVE_FIELD` | 离开场上 |

### 常见 API
| API | 用途 |
|-----|------|
| `Duel.IsExistingMatchingCard(f, tp, loc1, loc2, min, ...)` | 检查卡片是否存在 |
| `Duel.SelectMatchingCard(tp, f, loc1, loc2, min, max, ...)` | 选择卡片 |
| `Duel.IsExistingTarget(f, tp, loc1, loc2, min, ...)` | 检查对象是否存在 |
| `Duel.SelectTarget(tp, f, loc1, loc2, min, max, ...)` | 选择对象 |
| `Duel.SetOperationInfo(0, CATEGORY_*, g, count, loc, ...)` | 设置连锁信息 |
| `Duel.GetFirstTarget()` | 获取选择的对象 |
| `tc:IsRelateToEffect(e)` | 检查对象是否仍相关 |
| `Duel.HintSelection(g)` | 提示玩家选择 |
| `Duel.NegateEffect(ev)` | 无效连锁效果 |
| `Duel.SpecialSummon(c, sumtype, tp, tp, ...)` | 特殊召唤卡片 |
| `Duel.Destroy(c, reason)` | 破坏卡片 |
| `Duel.SendtoDeck(c, tp, seq, reason)` | 回到卡组 |
| `Duel.Remove(c, pos, reason)` | 除外 |
| `Duel.Draw(tp, count, reason)` | 抽卡 |
| `Duel.Recover(tp, count, reason)` | 回复 LP |
| `Duel.Damage(tp, count, reason)` | 造成伤害 |

---

**这些指南生效的标准：** 脚本准确、测试全面、验证自动化而非手动。
