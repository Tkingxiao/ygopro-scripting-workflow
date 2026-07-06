# ygopro-scripting-workflow

为 YGOPro 官方版本自定义卡片编写 Lua 脚本和测试的工作区。内置红字检查、E2E 测试框架和消息断言工具。

详细的脚本编写规则、测试要求和 Agent 协作规范见 [AGENTS.md](./AGENTS.md)（英文）或 [AGENTS\_CN.md](./AGENTS_CN.md)（中文）。

## 快速开始

```bash
# 1. 安装依赖（首次使用或 node_modules/ 缺失时）
npm ci

# 2. 更新上游数据（每次处理新卡前建议执行）
npm run prepare:ygopro   # 更新 ygopro/ 本体和子模块
npm run prepare:ref      # 更新 ref/ 参考仓库
```

## 项目结构

```
ygopro-scripting-workflow/
├── workspace/                  # 你的卡片工作区
│   └── my-pack/
│       ├── my-pack.cdb         # 卡片数据库
│       └── script/
│           └── c11111111.lua   # 卡片脚本
├── tests/                      # 测试文件（按 .cdb 路径映射）
│   └── workspace/my-pack/my-pack/
│       └── c11111111.spec.ts
├── src/                        # 工具源码
│   ├── create-test.ts          # 测试框架入口
│   ├── check-redtext.ts        # 红字检查
│   └── current-messages.ts     # 消息断言辅助函数
├── ygopro/                     # [gitignored] YGOPro 官方源码（自动拉取）
│   ├── cards.cdb               # 官方卡池
│   ├── script/                 # 官方 Lua 脚本
│   ├── ocgcore/                # C++ 内核源码
│   └── gframe/                 # 客户端源码
└── ref/                        # [gitignored] 依赖工具源码参考
    ├── ygopro-cdb-encode/      # .cdb 读写
    ├── ygopro-jstest/          # 测试驱动
    ├── ygopro-msg-encode/      # MSG 编解码
    └── koishipro-core.js/      # OCGCore JS 封装
```

## 写卡流程

### 1. 准备工作区

在 `workspace/` 下创建独立目录，放入 `.cdb` 文件：

```text
workspace/my-pack/my-pack.cdb
workspace/my-pack/script/
```

脚本放在 `.cdb` 同级的 `script/` 目录下，文件名格式为 `c{cardCode}.lua`。

### 2. 备份 cdb（重要）

脚本中使用 `aux.Stringid(id, n)` 时需要同步修改 `.cdb` 的 `texts.str*` 字段，建议先备份：

```bash
cp workspace/my-pack/my-pack.cdb workspace/my-pack/my-pack.cdb.bak
```

### 3. 编写脚本

参考 `ygopro/script/` 中的官方脚本风格。关键规范：

- 效果文本中的「以...为对象」→ 使用 `EFFECT_FLAG_CARD_TARGET`
- 效果文本中的「选」（不取对象）→ 使用 `Duel.SelectMatchingCard`
- 每个效果必须设置 `description`
- 使用 `SetOperationInfo` 时设置正确的 `CATEGORY_*` 标志
- 使用 `SetCountLimit` 控制每回合使用次数

详见 [AGENTS.md §6 Script Writing Workflow](./AGENTS.md)。

### 4. 红字检查

```bash
# 检查单张卡
npm run check:redtext -- workspace/my-pack/my-pack.cdb:11111111

# 检查整个 .cdb
npm run check:redtext -- workspace/my-pack/my-pack.cdb

# 检查多张卡
npm run check:redtext -- workspace/my-pack/my-pack.cdb:11111111,22222222
```

### 5. 编写测试

测试文件放在 `tests/workspace/` 下，路径与 `.cdb` 映射：

```typescript
import { resolve } from 'path';
import { createTest } from '../../src';

describe('Card Name', () => {
  const cdb = resolve(__dirname, '../../../workspace/my-pack/my-pack.cdb');
  const scriptDir = resolve(__dirname, '../../../workspace/my-pack/script');

  it('effect 1 description', async () => {
    await createTest({ cdb, scriptPath: scriptDir }, (ctx) => {
      ctx.addCard(...)
        .advance(...)
        .state(SomeMsg, (msg) => {
          // 断言 + 返回响应
        });
    });
  });
});
```

### 6. 运行测试

```bash
# 运行指定测试
npm test -- workspace/my-pack/my-pack/c11111111.spec.ts

# 运行全部测试
npm test

# 代码检查
npm run lint
```

## 核心命令

| 命令                                     | 说明            |
| -------------------------------------- | ------------- |
| `npm ci`                               | 安装依赖          |
| `npm run prepare:ygopro`               | 更新 ygopro/ 本体 |
| `npm run prepare:ref`                  | 更新 ref/ 参考仓库  |
| `npm run check:redtext -- <cdb>[:ids]` | 红字错误检查        |
| `npm test -- <path>`                   | 运行测试          |
| `npm run lint`                         | 代码检查          |

## 常用 API 速查

| API                                                     | 用途         |
| ------------------------------------------------------- | ---------- |
| `Duel.IsExistingMatchingCard(f, tp, l1, l2, min, ...)`  | 检查是否存在匹配的卡 |
| `Duel.SelectMatchingCard(tp, f, l1, l2, min, max, ...)` | 选卡（不取对象）   |
| `Duel.IsExistingTarget(f, tp, l1, l2, min, ...)`        | 检查是否存在目标   |
| `Duel.SelectTarget(tp, f, l1, l2, min, max, ...)`       | 选择目标       |
| `Duel.SetOperationInfo(0, CATEGORY_*, g, count, ...)`   | 设置连锁信息     |
| `Duel.GetFirstTarget()`                                 | 获取已选择的目标   |
| `tc:IsRelateToEffect(e)`                                | 目标是否仍关联效果  |
| `Duel.SpecialSummon(c, sumtype, tp, ...)`               | 特殊召唤       |
| `Duel.Destroy(c, reason)`                               | 破坏         |
| `Duel.SendtoDeck(c, tp, seq, reason)`                   | 回到卡组       |
| `Duel.Draw(tp, count, reason)`                          | 抽卡         |
| `Duel.Recover(tp, count, reason)`                       | 回复 LP      |

## 事件代码速查

| 事件                       | 含义     |
| ------------------------ | ------ |
| `EVENT_FREE_CHAIN`       | 自由时点   |
| `EVENT_SUMMON_SUCCESS`   | 成功召唤   |
| `EVENT_SPSUMMON_SUCCESS` | 成功特殊召唤 |
| `EVENT_DESTROYED`        | 被破坏    |
| `EVENT_ATTACK_ANNOUNCE`  | 攻击宣言   |
| `EVENT_TO_GRAVE`         | 送入墓地   |
| `EVENT_LEAVE_FIELD`      | 离开场上   |

## 效果类型速查

| 类型   | 常量                      | 对应文本         |
| ---- | ----------------------- | ------------ |
| 起动效果 | `EFFECT_TYPE_IGNITION`  | ① 可以...      |
| 诱发效果 | `EFFECT_TYPE_TRIGGER_O` | ...的场合可以发动   |
| 必发诱发 | `EFFECT_TYPE_TRIGGER_F` | ...的场合必须发动   |
| 速攻效果 | `EFFECT_TYPE_QUICK_O`   | 可以在对方回合...   |
| 永续效果 | `EFFECT_TYPE_SINGLE`    | 这张卡...（持续适用） |

## 许可证

MIT协议
