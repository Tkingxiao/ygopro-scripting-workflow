# 项目协作说明

## 项目目标

这个项目用于自动编写 YGOPro 官方版本的卡片脚本，让后续执行者能准确地为工作区内的 `.cdb` 卡片补齐 `script/c{code}.lua` 和测试。

核心原则：

- 不凭印象写脚本。每个 API、常量、函数签名都要以本仓库里的 `ygopro/script/*.lua`、`ygopro/ocgcore/*.cpp`、`ygopro/gframe/*` 为准。
- 本项目使用的是 YGOPro 官方版本，不是 Project Ignis / EDOPro。不要套用只存在于其他分支里的 API 或写法。
- 优先模仿 `ygopro/script/` 中相同或相似效果的官方脚本段落，保持风格一致。
- 允许对 `ygopro/script/` 做大范围关键字搜索；这是寻找官方相似效果的正常步骤，不要因为命中很多就改成凭印象写。
- 卡片脚本统一使用 `local s,id,o=GetID()` 开头。

## 目录地图

- `workspace/`: 用户工作区。目标 `.cdb`、图片和待写脚本通常在这里。
- `workspace/**/script/`: 目标卡片脚本目录。对 `workspace/foo/bar/baz.cdb`，脚本放在 `workspace/foo/bar/script/c{code}.lua`。
- `ygopro/cards.cdb`: 官方卡池，可作为测试用卡来源，也用于搜索相似效果。
- `ygopro/script/`: 官方脚本和公共 Lua 文件，重点读 `utility.lua`、`procedure.lua`、`constant.lua`。
- `ygopro/ocgcore/`: 内核 C++ 实现，确认 Lua API、常量、类别、事件和脚本加载行为时读这里。
- `ygopro/gframe/`: 客户端交互实现，写 e2e 时用来确认 MSG 与 response 的关系。
- `ref/ygopro-cdb-encode/`: `.cdb` 读写查询工具参考。
- `ref/ygopro-jstest/`: 测试驱动工具参考。
- `ref/ygopro-msg-encode/`: MSG/CTOS/STOC 编解码和 response 参考。
- `ref/koishipro-core.js/`: OCGCore JS 封装参考。
- `src/create-test.ts`: 本项目测试入口，自动附加 `ygopro/cards.cdb` 和 `ygopro/script/`。
- `src/check-redtext.ts`: 红字检查命令实现。
- `tests/sample/standalone.spec.ts`: e2e 测试结构范例。

`ygopro/` 和 `ref/` 是准备命令维护的上游参考目录，除非用户明确要求，不要修改它们。

## 参考源码规则

- 不要把 `node_modules/` 当作源码参考，不要用 `rg`、`sed`、`cat` 等命令去读 `node_modules/` 下的包实现。
- `node_modules/` 只用于安装依赖和运行命令。需要确认依赖库行为时，读取 `ref/` 下对应仓库：
  - `ygopro-cdb-encode` 看 `ref/ygopro-cdb-encode/`
  - `ygopro-jstest` 看 `ref/ygopro-jstest/`
  - `ygopro-msg-encode` 看 `ref/ygopro-msg-encode/`
  - `koishipro-core.js` 看 `ref/koishipro-core.js/`
- 如果测试输出的 stack trace 指向 `node_modules/`，可以利用报错里的文件名/函数名定位问题，但进一步确认实现仍然去 `ref/` 对应源码看。
- 写结论或测试说明时，也引用 `ref/`、`ygopro/` 或本项目源码，不引用 `node_modules/`。
- Codex CLI 可能留下 `.codex` 运行痕迹文件。看到它时不要清理、格式化或当作任务相关改动处理，除非用户明确要求。

## 准备工作

1. 如果没有 `node_modules/`，先运行：

   ```bash
   npm ci
   ```

2. 开始写卡片脚本前运行：

   ```bash
   npm run prepare:ygopro
   npm run prepare:ref
   ```

   这些目录可能已经过期，准备命令会更新 `ygopro/`、子模块和 `ref/` 下的参考仓库。

## 定位目标卡

用户通常会给出某个 `.cdb` 的某张卡，或一次给多张卡。

1. 先在 `workspace/` 里找目标 `.cdb`。如果用户没有指定 `.cdb`，搜索全部工作区数据库：

   ```bash
   rg --files workspace -g '*.cdb'
   ```

2. `.cdb` 操作必须使用 `ygopro-cdb-encode`，用 Node.js/TypeScript 脚本读取和查询。不要手写 SQLite 字符串去改库，也不要用肉眼猜字段。

3. 查卡时至少确认：

   - `code`
   - `name`
   - `desc`
   - `alias`
   - `type`
   - `setcode`
   - `category`

4. 确定需要写脚本后，目标文件是目标 `.cdb` 同级目录下的 `script/c{code}.lua`。

## 什么时候不写脚本

满足以下任一情况时，不写 `script/c{code}.lua`：

- 目标卡是异画复用卡：`alias != 0`，本 workspace 存在 `code == alias` 的原始版本卡，且 `code` 与 `alias` 相差小于 20。此时只为原始版本卡维护 `script/c{alias}.lua`。
- 目标卡是非灵摆通常怪兽：`type & TYPE_NORMAL (0x10) != 0`，且 `type & TYPE_PENDULUM (0x1000000) == 0`。

不满足以上条件的效果卡、魔法卡、陷阱卡，以及灵摆通常怪兽，都按效果文本写脚本。

## 编写脚本流程

1. 读取目标卡效果文本，按游戏王规则拆出每个效果的发动条件、代价、对象、处理、限制和分类。
2. 用 `ygopro-cdb-encode` 在 `ygopro/cards.cdb` 中按效果关键字、字段或类别搜索相似官方卡。
3. 打开相似卡的 `ygopro/script/c{code}.lua`，尽量模仿官方写法的对应段落。
4. 对每个 Lua API、常量、utility/procedure 调用，回到本仓库确认签名：

   - `ygopro/script/utility.lua`
   - `ygopro/script/procedure.lua`
   - `ygopro/script/constant.lua`
   - `ygopro/ocgcore/libduel.cpp`
   - `ygopro/ocgcore/libcard.cpp`
   - `ygopro/ocgcore/libeffect.cpp`
   - 需要客户端交互时读 `ygopro/gframe/`

5. `target` 中正确使用 `Duel.SetOperationInfo`。检索、送墓、从墓地加入手牌、特殊召唤、破坏等效果必须保留正确 `CATEGORY_*`、目标组和数量，否则常见连锁检测会失真。
6. `SetCountLimit` 的 count code 要按官方文本含义写，涉及自定义 count code 时先在 `ygopro/cards.cdb` 搜同类文本并打开对应官方脚本确认。

   - “这个卡名的①②的效果1回合各能使用1次”这类每个编号效果分别计次：第一个效果用 `id`，第二个用 `id+o`，第三个用 `id+2*o`，后续依此类推。优先模仿参考官方脚本的写法。
   - 例外：如果目标 `.cdb` 里的卡号是连续分配的，且卡号不是 9 位数，不要用 `id+o`、`id+2*o` 这类偏移；改用 `id`、`id+100`、`id+200` 等足够避开相邻卡号的自定义 count code。
   - 写上述例外前先检查同一个 workspace 里已有脚本的习惯；如果已有其他卡已经使用一套固定 count code 写法，优先尊重当前 workspace 的既有习惯，可以忽略短连续卡号这条例外。
   - “这个卡名的①②的效果1回合只能有1次使用其中任意1个”这类多个编号效果共享次数：相关效果全部用同一个 `id`。
   - 同一个编号效果复制多个触发时点（例如召唤成功和特殊召唤成功的 clone）仍然共享同一个 count code，不要因为 clone 额外加 `id+o`。
   - 如果官方相似脚本使用 `EFFECT_COUNT_CODE_OATH`、`EFFECT_COUNT_CODE_DUEL` 等额外 count flag，必须照 ocgcore/官方脚本的签名和语义确认后再写，不要凭印象拼常量。

7. 所有 `SetType` 包含 `EFFECT_TYPE_IGNITION`、`EFFECT_TYPE_TRIGGER_O`、`EFFECT_TYPE_TRIGGER_F`、`EFFECT_TYPE_QUICK_O`、`EFFECT_TYPE_QUICK_F` 的效果都必须设置 `description`。通常写法是 `e:SetDescription(aux.Stringid(id,n))`；如果是 `Clone()` 出来的另一个发动效果，也要确认它继承的 description 是否仍然对应正确文本，不正确就重新 `SetDescription(...)`。
8. 只要脚本里使用了 `aux.Stringid(id,n)`，就必须同步编辑目标 `.cdb` 的 `texts.str{n+1}` 字段：`aux.Stringid(id,0)` 对应 `str1`，`aux.Stringid(id,1)` 对应 `str2`，依此类推。这些字符串用于效果描述、选项、确认提示等；缺失会导致客户端显示 unknown 文本。编辑 `.cdb` 时仍然使用 `ygopro-cdb-encode` 通过 node 处理。
9. 写完后不要只看语法，要通过红字检查和测试验证实际流程。

## 红字检查

脚本写完后运行：

```bash
npm run check:redtext -- <cdb>[:id,id...] [...]
```

例子：

```bash
npm run check:redtext -- workspace/33741/33741.cdb:33741001
npm run check:redtext -- workspace/33741/33741.cdb
npm run check:redtext -- workspace/foo/a.cdb:11111111,22222222 workspace/bar/b.cdb:33333333
```

规则来自 `src/check-redtext.ts`：

- 参数必须至少有一个。
- 不写 `:id,id...` 时，会检查该 `.cdb` 内全部卡。
- 写了 id 时，会先确认这些 id 存在于对应 `.cdb`。
- 检查时会把脚本目录设为 `path.dirname(cdb)/script`，并通过 `createTest` 同时加载官方 `ygopro/cards.cdb` 与 `ygopro/script/`。
- 每张卡会被加入卡组并推进一次，用于捕获 Lua 红字和脚本加载错误。

红字检查必须通过；失败就改脚本，直到通过。

## 测试要求

每张写脚本的卡都必须有测试。一张卡一个 `.spec.ts`。

测试路径按目标 `.cdb` 映射到 `tests/workspace/`：

- 目标库：`workspace/foo/bar/baz.cdb`
- 卡号：`11111111`
- 测试文件：`tests/workspace/foo/bar/baz/c11111111.spec.ts`

测试需要额外 fixture 时，放在对应 `.spec.ts` 同级目录下的 `fixtures/` 子目录，例如 `tests/workspace/foo/bar/baz/fixtures/helper.cdb` 或 `tests/workspace/foo/bar/baz/fixtures/script/c11111111.lua`。fixture 可以包含 `.cdb`、配套 `script/`、图片或其他测试辅助文件；不要放到顶层 `tests/fixtures/`，应跟使用它的目标测试目录归档在一起。

每个测试文件必须包含 unit 和 e2e 两类测试。

### Unit 测试

- 使用 `createTest({ cdb, scriptPath }, cb)`。
- 通过 `ctx.addCard(...)` 布置场面。
- 用 `ctx.evaluate(...)` 只能检查不会产生交互和状态变化的 Lua 逻辑：
  - `filter`、`condition`、`value` 等纯运算辅助函数。
  - `cost`、`target` 的 `chk==0` 分支，用来确认“是否可以支付/是否存在可选目标”。
- 在 unit 测 `cost`、`target` 等签名包含 `e` 的方法时，`e` 不允许传 `nil`。必须先取到对应 handler 卡片 `c`，再用 `local e=Effect.CreateEffect(c)` 构造 effect 并传入被测函数，避免绕过或误判脚本里的 `e:GetHandler()`、`e:GetLabel()` 等逻辑。
- 如果 unit 里只想验证 `filter`、`condition` 或 `target` 的 `chk==0` 可用性，但被测逻辑内部调用了 `Duel.IsExistingTarget`，在 `ctx.evaluate(...)` 里可以临时写 `local old=Duel.IsExistingTarget; Duel.IsExistingTarget=Duel.IsExistingMatchingCard`，执行纯判断后立刻恢复 `Duel.IsExistingTarget=old`。这只用于“是否存在可选对象”的纯判断，不能借此执行真正的选对象流程、`target` 的 `chk~=0` 分支或任何会改变状态的处理。
- 目标是确认算法正确且不会报错，不要只测 happy path。
- 禁止在 `ctx.evaluate(...)` 里执行会让玩家操作或改变决斗状态的代码，包括但不限于 `target` 的 `chk~=0` 分支、`operation`、`Duel.Select*`、`Duel.Announce*`、`Duel.Hint`、`Duel.SetOperationInfo`、送墓、除外、破坏、抽卡、特召、注册效果等。需要真实选择和处理时，一律放到 e2e 测试里。

### E2E 测试

- 结构参考 `tests/sample/standalone.spec.ts`。
- 用 `ctx.addCard(...)` 布置手牌、卡组、墓地、场上、额外卡组等。
- 如果 workspace 内 `.cdb` 卡池不全，导致缺少特定字段/种族/属性等测试用卡，优先从 `ygopro/cards.cdb` 里选一张合适的官方卡加入场面，再用 `ctx.evaluate(...)` 给那张卡临时注册效果改造成需要的测试卡。常见做法是注册 `EFFECT_ADD_SETCODE`、`EFFECT_CHANGE_RACE`、`EFFECT_CHANGE_ATTRIBUTE`、`EFFECT_CHANGE_TYPE`、`EFFECT_CHANGE_LEVEL` 等单体效果；如果要让卡组、里侧等位置的卡也能被字段筛选到，`EFFECT_ADD_SETCODE` 等效果可能需要加 `EFFECT_FLAG_SET_AVAILABLE`。这只用于补齐测试布场，不要因此跳过真实 e2e 流程。
- 用 `advance(...)`、`state(...)`、`CardHandle` 的 `summon()`、`activate()`、`select()` 等方法模拟真实客户端操作。
- 使用 `ygopro-msg-encode` 的 `YGOProMsg*` 类判断当前 MSG，再返回对应 response。
- 需要理解客户端消息和 response 时，参考 `ref/ygopro-msg-encode/`、`ref/ygopro-jstest/` 和 `ygopro/gframe/`。
- 检查效果可以发动、target 正确、operation 正确、处理后区域和数值正确。
- e2e 必须覆盖卡片的全部效果。融合、同调、超量、连接等召唤手续或特殊召唤条件也属于需要覆盖的内容，应该实际完成一次对应召唤；一个效果有多个分支、选项或处理路径时，每个分支都要有独立用例。
- 带 `1回合1次`、`1回合只能使用1次`、`这个卡名的效果1回合只能使用1次` 等次数限制的效果，e2e 必须验证发动过后不能再次发动。卡名 1 次的效果还要布置另一张同名卡，确认第一张发动后另一张也不能发动；“这个卡名的①②的效果1回合只能有1次使用其中任意1个”这类共享次数的效果，还要确认这张卡的另一个编号效果也不能发动。
- 召唤、特殊召唤、从手卡发动魔法·陷阱、盖放魔法·陷阱后，通常会先出现位置/表示形式选择。`return card.summon()`、`return card.specialSummon()`、`return card.activate()`、`return card.sset()` 之后，应紧跟 `advance(SummonPlaceAdvancor())` 或把 `SummonPlaceAdvancor()` 放在随后一次 `advance(...)` 的最前面，再继续断言连锁、选项或选卡 MSG。
- 如果前面的步骤进行了关键操作，例如召唤、特殊召唤、盖放、指示物变化、`Duel.Hint`、LP 伤害/回复/支付/设置等，下一次进入 `state(...)` 时必须断言 `ctx.currentMessages` 中出现了对应的非选择结果消息。优先断言有明确语义的消息类，例如 `YGOProMsgSummoning` / `YGOProMsgSummoned`、`YGOProMsgSpSummoning` / `YGOProMsgSpSummoned`、`YGOProMsgSet`、`YGOProMsgAddCounter` / `YGOProMsgRemoveCounter`、`YGOProMsgHint` / `YGOProMsgCardHint` / `YGOProMsgPlayerHint`、`YGOProMsgDamage` / `YGOProMsgRecover` / `YGOProMsgPayLpCost` / `YGOProMsgLpUpdate` 等。不要用 `YGOProMsgMove`、`YGOProMsgChaining`、`YGOProMsgChained`、`YGOProMsgChainEnd` 做这个要求的断言，这些消息太多或语义太泛，噪声大。
- `currentMessages` 只代表自上次 `state(...)` 回调结束清空后，到当前停住的这段流程消息。断言必须放在真正紧跟关键操作的下一次 `state(...)` 里；如果中间又经过了其他 `state(...)`，之前的消息已经被清空，不要把断言放到更晚的状态。
- `currentMessages` 断言 helper 统一放在 `src/current-messages.ts`，测试从 `src` 按相对路径导入；不要放到 `tests/helper` 或 `tests/helpers`。
- `expectCurrentMessage(ctx, MsgClass, assertMessage?)` 断言当前这段消息中至少出现过一次 `MsgClass`；如果传入 `assertMessage`，回调拿到最后一条同类消息，必须在里面断言关键字段。适合单条语义明确的消息，例如 `YGOProMsgSet`、`YGOProMsgSpSummoning`、`YGOProMsgDamage`、`YGOProMsgRecover`、`YGOProMsgPayLpCost`。
- `expectCurrentMessages(ctx, ...MsgClasses)` 批量断言多个消息类都出现过。只在每个消息类本身已经足够表达预期、且不需要检查字段时使用；不要用它来跳过 hint、LP 数值、指示物数量等关键字段断言。
- `expectCurrentMessageMatching(ctx, MsgClass, expected)` 断言当前这段消息里存在一条 `MsgClass`，且字段包含 `expected`。适合同一段流程可能有多条同类消息时使用，例如多名玩家分别回复 LP、多个提示或多个指示物变化。
- `expectCurrentHint(ctx, expected)` 专门断言 `YGOProMsgHint`，至少检查能区分语义的字段，例如 `type`、`player`、`desc`。不要写裸的 `expectCurrentMessage(ctx, YGOProMsgHint)`；要确认它确实是预期的 `HINT_SELECTMSG`、`HINTMSG_ATOHAND`、`HINTMSG_SPSUMMON` 等提示。
- 断言 `YGOProMsgCardHint` / `YGOProMsgPlayerHint` 时，不能只检查消息存在；必须断言具体字段，例如 `type`、`player`、`desc`、`value`。
- 断言 LP 相关消息时要按消息语义检查数值：`YGOProMsgDamage.value` 是受到多少伤害，`YGOProMsgRecover.value` 是回复多少，`YGOProMsgPayLpCost.cost` 是支付多少；这些都要同时断言 `player`。`YGOProMsgLpUpdate` 是 `Duel.SetLP` 的专用独立消息，表示基本分被设置成多少，只在脚本实际调用 `Duel.SetLP` 时断言，并检查 `player` 和 `lp`。
- 检索对象、效果对象、素材、解放、费用选择等会决定效果是否写对的关键选择，必须单独 `state(...)` 到对应 MSG 做断言，不能完全依赖自动推进。
- 关键选择禁止只写 `.advance(SlientAdvancor(), SelectCardAdvancor(...))` 这类在断言前自动通过的代码。必须先停在对应 MSG，例如 `YGOProMsgSelectCard`、`YGOProMsgSelectUnselectCard`、`YGOProMsgSelectSum`、`YGOProMsgSelectTribute`，检查 `msg.cards` / `msg.selectableCards` / `msg.unselectableCards` / `min` / `max` 等字段，明确断言“应该能选的卡在候选里、应该不能选的卡不在候选里”。
- 关键选择断言后再从同一个 `state(...)` 回调返回选择：单张卡优先找到对应 `CardHandle` 并 `return card.select()`；多张卡选择则 `return SelectCardAdvancor(...filters)`，让这个 advancor 只回应当前已经检查过的 MSG。只有需要手写特殊 response 时才直接用 `msg.prepareResponse(...)`。

`ygopro-jstest` 的 `Advancor` 是本项目 e2e 的关键，不是一般 YGOPro 脚本常识。需要确认实现时读 `ref/ygopro-jstest/` 和 `ref/koishipro-core.js/src/advancors/`，不要读 `node_modules/`。写测试时按下面规则使用：

- `advance(...advancorsOrResponses)` 会持续推进 `duel.process()`；遇到需要 response 的 MSG 时，按参数顺序调用 advancor，使用第一个返回了 `Uint8Array` 的结果。如果没有任何 advancor 返回 response，就停在当前 `lastSelectMessage`。
- `state(YGOProMsgClass, cb)` 用来断言当前停在指定 MSG。类型不匹配会直接抛错；`cb` 返回 response 或 advancor 后，会继续推进。`summon()`、`activate()`、`select()`、`msg.prepareResponse(...)` 都返回 response bytes，必须 `return`，否则不会把操作送回内核。
- `return card.summon()`、`return card.activate()`、`return card.select()` 这类写法是一种语法糖：`CardHandle` 先根据当前 MSG 生成一次性 response bytes，`state(...)` 再把这份 response 交给 `advance(...)`；`advance(...)` 会把 `Uint8Array` 包成类似 `StaticAdvancor` 的单次回应来继续流程。所以它看起来像“返回了一个变相 advancor”，但本质是已经准备好的客户端 response。
- `SlientAdvancor()` 会对任何可默认回应的 MSG 调用 `defaultResponse()`。它通常会拒绝可选发动、跳过提示，适合开局快进或处理无关步骤；不要在需要验证“可以发动/可以连锁”的位置提前放它，否则测试可能把关键效果自动拒绝掉。
- `NoEffectAdvancor()` 只在 `YGOProMsgSelectChain` 且没有可连锁项时回应，用于让流程从“没有连锁可选”继续走。要检查灰流丽、神之警告、屋敷童、星尘龙等能否连锁时，先 `state(YGOProMsgSelectChain, ...)` 断言对应卡 `canActivate()`，再决定是否返回连锁 response。
- `SummonPlaceAdvancor(placeAndPosition?)` 自动回应 `SelectPlace` 和 `SelectPosition`。可传 `{ player, location, sequence, position }` 限定召唤位置、魔陷放置位置或表示形式；一般紧跟在 `return card.summon()`、`return card.specialSummon()`、`return card.activate()`、`return card.sset()` 之后的 `advance(...)` 里。
- `SelectCardAdvancor(...filters)` 自动回应 `SelectCard`、`SelectUnselectCard`、`SelectSum`、`SelectTribute`。filter 可写 `{ code, location, controller, sequence }`；多张卡按参数顺序匹配并会被消耗。它只能用于已经不关心候选集合细节的机械步骤，或在前面已经按上面的关键选择规则用 `state(...)` 明确检查过候选集合的后续推进。
- `StaticAdvancor(items)` 依次返回预先准备好的 response，适合复现 yrp 或手写特殊 response。
- `MapAdvancor(...)` / `MapAdvancorHandler(MsgClass, cb)` 按 MSG 类型分发，适合一个步骤可能遇到多种选择消息时精确处理。
- `LimitAdvancor(...)` / `OnceAdvancor(...)` 限制回应次数，避免一个自动选择器在后续同类 MSG 中误触发。
- `PlayerViewAdvancor(player, advancor)` 只在 `msg.responsePlayer()` 等于指定玩家时启用，适合双方都有可选动作或连锁窗口的测试。
- 常见结构是：先 `advance(SlientAdvancor())` 进入主阶段；在 `state(YGOProMsgSelectIdleCmd, ...)` 里断言可发动/可召唤并 `return card.activate()` 或 `return card.summon()`；再用 `advance(SummonPlaceAdvancor(), NoEffectAdvancor())` 补齐无关的位置和无连锁窗口。遇到检索、目标、素材、解放等关键选择时，必须单独 `state(...)` 断言候选集合，不能完全依赖自动推进。

常见连锁检测必须按效果类型补上：

- 检索、从卡组加入手牌、从卡组特殊召唤、从卡组送墓：检查“灰流丽”能否连锁，基础代码 `14558127`。
- 特殊召唤相关：检查“神之警告”能否连锁，基础代码 `84749824`。
- 从墓地加入手牌/卡组、从墓地特殊召唤、除外墓地卡：检查“屋敷童”能否连锁，基础代码 `73642296`。
- 破坏效果：检查“星尘龙”能否连锁，基础代码 `44508094`。

这些测试用于防止脚本漏写 `CATEGORY_*`、`Duel.SetOperationInfo`、target flag 或 chain 信息。

## 跑测试

只跑目标测试：

```bash
npm test -- workspace/foo/bar/baz/c11111111.spec.ts
```

跑全部测试：

```bash
npm test
```

每次编辑完 `.spec.ts` 测试文件后，必须运行：

```bash
npm run lint
```

不要用 `prettier` 或直接调用底层 `eslint --fix` 代替；本项目统一通过 `npm run lint` 修复和检查测试格式、未使用导入等问题。

脚本和测试都写完后，必须至少运行：

```bash
npm run check:redtext -- <target.cdb>:<code>
npm test -- <mapped-test-path>
```

如果不通过，修改脚本或测试，直到全部通过。
