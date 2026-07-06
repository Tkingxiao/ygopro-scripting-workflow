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
| 从自己的额外卡组把1只表侧表示的灵摆怪兽特殊召唤 | Special Summon 1 face-up Pendulum Monster from your Extra Deck | 额外卡组灵摆怪兽的区域放置规则适用（见 §6） |
| 灵摆区 | Pendulum Zone | `LOCATION_PZONE` (0x200) — 魔陷区 seq 0（左）和 seq 4（右）各一个 |
| 灵摆刻度 | Pendulum Scale | `c:GetLeftScale()` / `c:GetRightScale()` |
| 灵摆召唤 | Pendulum Summon | `SUMMON_TYPE_PENDULUM` (0x4a000000) |
| 额外卡组的灵摆怪兽 | Extra Deck Pendulum Monster | `TYPE_PENDULUM` (0x1000000) + `LOCATION_EXTRA` + 表侧表示 |
| 连接箭头 | Link Marker | `LINK_MARKER_*` 常量 — 定义连接怪兽所连接的区域 |

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

#### 额外卡组灵摆怪兽的区域放置规则
从额外卡组特殊召唤灵摆怪兽（灵摆召唤或卡片效果）时，该怪兽**只能**放置在**连接怪兽所连接的区域**（额外怪兽区域或被连接怪兽指向的主怪兽区域）。如果没有有效区域，该怪兽**送入墓地**。

**适用情况：**
- 额外卡组表侧表示灵摆怪兽的灵摆召唤
- 卡片效果从额外卡组特殊召唤，文本包含"从自己的额外卡组把1只表侧表示的灵摆怪兽特殊召唤"

**区域布局（从操控者视角）：**
- MZone seq 0–4：主怪兽区域（列 0–4）
- MZone seq 5：额外怪兽区域左侧（列 1）
- MZone seq 6：额外怪兽区域右侧（列 3）

**区域检查关键 API：**
- `c:GetLinkedZone(tp)` — 返回 `c` 连接的区域位掩码（对玩家 `tp`）
- `Duel.GetLinkedZone(tp)` — 返回场上所有连接怪兽为玩家 `tp` 连接的区域
- `Auxiliary.GetMultiLinkedZone(tp)` — 返回被 2+ 个连接怪兽连接的区域
- `Duel.GetLocationCount(tp, LOCATION_MZONE)` — 可用的主怪兽区域
- `Duel.GetLocationCount(tp, LOCATION_MZONE, g)` — 解放 `g` 后检查可用区域
- `LOCATION_REASON_TOFIELD = 0x1` — `GetLocationCount` 的默认原因（场上放置）
- `c:IsInExtraMZone()` — 检查卡片是否在额外怪兽区域
- `c:IsInMainMZone()` — 检查卡片是否在主怪兽区域

**区域位掩码常量：**
- `0x1`–`0x1f`：主怪兽区域 seq 0–4（列 0–4）
- `0x20`：额外怪兽区域 seq 5（左侧，列 1）
- `0x40`：额外怪兽区域 seq 6（右侧，列 3）
- `0x7f`：所有怪兽区域

**`Duel.SelectField` 的 filter 参数约定：** `filter` 参数是**排除掩码** — 位为 1 的区域被排除在选择之外。要仅从连接区域选择，使用 `~zone`（反转连接区域位掩码）。例如：`zone = 0x20`（EMZ 左），则 `~zone & 0x7f` 选择所有其他区域。

**额外卡组灵摆怪兽放置的脚本模式：**
```lua
-- 在 target/operation 中，放置额外卡组灵摆怪兽时：
local zone = Duel.GetLinkedZone(tp)
if zone == 0 then
    -- 没有有效区域 — 怪兽送墓
    Duel.SendtoGrave(c, REASON_RULE)
else
    -- 从连接区域中选择
    Duel.Hint(HINT_SELECTMSG, tp, HINTMSG_SPSUMMON)
    local seq = Duel.SelectField(tp, 1, LOCATION_MZONE, 0, ~zone)
    Duel.SpecialSummon(c, 0, tp, tp, false, false, POS_FACEUP, seq)
end
```

**参考：** `ygopro/ocgcore/field.cpp`（`field::pendulum_summon`）、`ygopro/ocgcore/operations.cpp`、`ygopro/script/utility.lua`（`Auxiliary.GetMultiLinkedZone`）

#### 灵摆区机制
灵摆区是魔陷区的一部分：
- `LOCATION_PZONE = 0x200` — 每个玩家两个区域：seq 0（左）和 seq 4（右）
- 灵摆怪兽放置在灵摆区时，视为**永续魔法**（不是怪兽）
- 灵摆刻度：`c:GetLeftScale()` 和 `c:GetRightScale()`
- 灵摆怪兽可以同时存在于怪兽区和灵摆区（灵摆区的灵摆怪兽视为魔法卡）

**灵摆刻度与放置关键 API：**
- `c:IsPendulumMonster()` — 检查是否为灵摆怪兽
- `c:IsPendulumSetable()` — 检查灵摆怪兽是否可以放置到灵摆区
- `c:SetPendulum()` — 将灵摆怪兽放置到灵摆区（视为永续魔法）
- `c:GetLeftScale()` — 获取左灵摆刻度值
- `c:GetRightScale()` — 获取右灵摆刻度值
- `Duel.GetPendulumCount(tp)` — 获取玩家灵摆区的灵摆怪兽数量

#### 连接怪兽的区域连接
连接怪兽通过连接箭头定义所连接的区域。这些区域决定了额外卡组灵摆怪兽可以放置的位置。

**连接箭头常量**（来自 `constant.lua`）：
| 常量 | 方向 | 位掩码 |
|------|------|--------|
| `LINK_MARKER_BOTTOM_LEFT` | ↙ | `0x001` |
| `LINK_MARKER_BOTTOM` | ↓ | `0x002` |
| `LINK_MARKER_BOTTOM_RIGHT` | ↘ | `0x004` |
| `LINK_MARKER_LEFT` | ← | `0x008` |
| `LINK_MARKER_RIGHT` | → | `0x020` |
| `LINK_MARKER_TOP_LEFT` | ↖ | `0x040` |
| `LINK_MARKER_TOP` | ↑ | `0x080` |
| `LINK_MARKER_TOP_RIGHT` | ↗ | `0x100` |

**区域连接关系：**
- 连接怪兽的箭头定义了它"指向"的区域（其连接的区域）
- `c:GetLinkedZone(tp)` 返回 `c` 为玩家 `tp` 连接的区域位掩码
- 额外卡组灵摆怪兽**只能**放置在连接怪兽指向的区域
- 如果场上没有连接怪兽，或没有可用的连接区域，额外卡组灵摆怪兽无法特殊召唤，送入墓地

**相关区域封锁效果：**
- `EFFECT_USE_EXTRA_MZONE` (261) — 封锁额外怪兽区域
- `EFFECT_USE_EXTRA_SZONE` (262) — 封锁魔陷区
- `EFFECT_MAX_MZONE` (263) — 限制可用怪兽区域数
- `EFFECT_MAX_SZONE` (264) — 限制可用魔陷区数
- `EFFECT_MUST_USE_MZONE` (265) — 强制使用特定怪兽区域

#### 灵摆召唤类型与手续
灵摆召唤是内置的召唤手续，不是卡片效果：
- `SUMMON_TYPE_PENDULUM = 0x4a000000` — 用于 `Card.IsSummonType()` 检查
- `EFFECT_SPSUMMON_PROC_G = 320` — 灵摆召唤手续效果
- `EFFECT_EXTRA_PENDULUM_SUMMON = 360` — 额外灵摆召唤（额外的灵摆召唤次数）
- `EVENT_SPSUMMON_SUCCESS_G_P = 1117` — 灵摆召唤成功事件（仅永续效果）

**灵摆怪兽类型标志：**
- `TYPE_PENDULUM = 0x1000000` — 灵摆怪兽类型位
- 检查：`c:IsType(TYPE_PENDULUM)` 或 `c:GetOriginalType() & TYPE_PENDULUM ~= 0`

#### 灵摆相关重定向效果
灵摆怪兽离场时，根据其状态可能去往不同区域：
- `EFFECT_TO_GRAVE_REDIRECT` (63) — 从墓地重定向（如额外卡组表侧灵摆怪兽进入灵摆区）
- `EFFECT_TO_DECK_REDIRECT` (62) — 从卡组重定向
- `EFFECT_LEAVE_FIELD_REDIRECT` (60) — 离场时重定向
- `EFFECT_TO_HAND_REDIRECT` (61) — 回手牌时重定向
- `EFFECT_REMOVE_REDIRECT` (64) — 从除外重定向
- `EFFECT_BATTLE_DESTROY_REDIRECT` (204) — 战斗破坏时重定向
- `EFFECT_TO_GRAVE_REDIRECT_CB` (313) — 条件重定向（如宝玉兽）

**重要：** 当额外卡组的表侧表示灵摆怪兽将被送去墓地时，它会被放置到灵摆区（除非灵摆区已满）。这是"额外卡组灵摆怪兽 → 灵摆区"重定向的核心规则。

#### 灵摆相关事件
| 事件 | 含义 |
|------|------|
| `EVENT_SPSUMMON_SUCCESS_G_P = 1117` | 灵摆召唤成功（仅永续效果） |
| `EVENT_SPSUMMON_PROC_G = 320` | 灵摆召唤手续 |

#### 脚本编写陷阱与规则

##### `REASON_RULE` 不触发诱发效果
`Duel.SendtoGrave(c, REASON_RULE)` 不会触发 `EVENT_DESTROYED` 或 `EVENT_TO_GRAVE` 的效果。仅在核心规则自身移动卡片时使用（如额外卡组灵摆怪兽无可用区域）。

##### 里侧表示卡片的取对象限制
取对象效果（`EFFECT_FLAG_CARD_TARGET`）通常不能选择里侧表示卡片，除非效果文本明确写明"里侧表示的卡"。在取对象过滤器中添加 `c:IsFaceup()`。

##### 非取对象选择需要 `HintSelection`
在 `operation` 中 `Duel.SelectMatchingCard()` 之后，必须调用 `Duel.HintSelection(g)` 记录选择。不调用的话，某些卡片不会被记录为"被选择"。

##### 同名卡全局发动限制
"同名卡1回合只能发动1次"需要使用 `Duel.GetCustomActivityCount(id, tp, ACTIVITY_ACTIVATE)` — 它检查整个决斗历史，不仅限于场上。

##### 取对象效果的关联检查
在 `operation` 中处理取对象时，必须检查 `tc:IsRelateToEffect(e)`。如果对象在连锁处理中被移动，`IsRelateToEffect` 返回 `false`，不应再操作该对象。

##### 顺序处理（"那之后"）
"那之后"表示第一个操作必须完全执行完毕后，才能执行第二个操作。先检查第一个操作的结果（如 `g:FilterCount(Card.IsLocation, nil, LOCATION_GRAVE) > 0`），再继续。

##### 伤害步骤中的发动限制
伤害步骤中，通常只有以下效果可以发动：
- 攻守变动效果
- 反击陷阱
- 明确写明"伤害步骤"的效果
- 包含变更表示形式的效果

使用 `EFFECT_FLAG_DAMAGE_STEP` 允许在伤害步骤发动，或在 `condition` 中用 `Duel.IsDamageStep()` 限制。

##### `EFFECT_TYPE_FIELD` 与触发事件的组合
场地效果使用 `EFFECT_TYPE_FIELD` 时，如需在特定事件触发，须同时设置 `EFFECT_TYPE_FIELD` 和 `EFFECT_TYPE_TRIGGER_O/F`。例：`e1:SetType(EFFECT_TYPE_FIELD + EFFECT_TYPE_TRIGGER_O)`。

##### 额外卡组灵摆怪兽为公开信息
额外卡组的表侧表示灵摆怪兽是公开信息，对方可以查看。脚本中通过 `LOCATION_EXTRA` 配合 `Card.IsFaceup()` 过滤。

##### `aux.TRUE` / `aux.FALSE` 便捷过滤器
`utility.lua` 提供了快速匹配所有卡片的过滤器：`aux.TRUE`（匹配所有）和 `aux.FALSE`（匹配无）。

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
| `Duel.SpecialSummon(c, sumtype, tp, tp, nocheck, nolimit, pos, seq)` | 特殊召唤卡片（含区域放置） |
| `Duel.Destroy(c, reason)` | 破坏卡片 |
| `Duel.SendtoDeck(c, tp, seq, reason)` | 回到卡组 |
| `Duel.Remove(c, pos, reason)` | 除外 |
| `Duel.Draw(tp, count, reason)` | 抽卡 |
| `Duel.Recover(tp, count, reason)` | 回复 LP |
| `Duel.Damage(tp, count, reason)` | 造成伤害 |
| `Card:GetLinkedZone(tp)` | 此连接怪兽连接的区域 |
| `Duel.GetLinkedZone(tp)` | 场上所有连接怪兽为该玩家连接的区域 |
| `Card:IsInExtraMZone()` | 检查是否在额外怪兽区域 |
| `Card:IsInMainMZone()` | 检查是否在主怪兽区域 |
| `Duel.SelectField(tp, count, loc1, loc2, filter)` | 选择场地区域 |
| `Card:IsPendulumMonster()` | 检查是否为灵摆怪兽 |
| `Card:IsPendulumSetable()` | 检查是否可以放置到灵摆区 |
| `Card:SetPendulum()` | 放置到灵摆区 |
| `Card:GetLeftScale()` | 获取左灵摆刻度 |
| `Card:GetRightScale()` | 获取右灵摆刻度 |
| `Card:IsCanAddCounter(counter, count)` | 检查是否可以放置指示物 |
| `Duel.GetPendulumCount(tp)` | 获取灵摆区的灵摆怪兽数量 |
| `Duel.GetLocationCount(tp, loc)` | 可用区域数 |
| `Duel.GetCustomActivityCount(id, tp, act)` | 活动计数器检查 |
| `c:IsCanBeSpecialSummoned(e, sumtype, tp, nocheck, nolimit, pos)` | 检查是否可以特殊召唤 |
| `c:IsCanTurnSet()` | 检查是否可以变为里侧表示 |
| `c:IsFaceup()` | 检查是否表侧表示 |
| `c:IsFacedown()` | 检查是否里侧表示 |

---

**这些指南生效的标准：** 脚本准确、测试全面、验证自动化而非手动。
