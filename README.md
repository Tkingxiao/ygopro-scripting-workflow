# ygopro-scripting-workflow

用于为 YGOPro 官方版本的自定义卡片自动编写脚本和测试的工作区。

详细的脚本编写规则、测试要求和 Agent 协作规范见 [AGENTS.md](./AGENTS.md)。

## 环境准备

第一次使用，或没有 `node_modules/` 时，先安装依赖：

```bash
npm ci
```

开始写卡前，更新 YGOPro 本体和参考仓库：

```bash
npm run prepare:ygopro
npm run prepare:ref
```

这两个目录可能会过期，建议每次正式开始处理新卡前都先跑一遍。

## 准备待写卡片

把要写脚本的卡片放到 `workspace/` 下单独开一个目录，并准备好 `.cdb` 文件。例如：

```text
workspace/my-pack/my-pack.cdb
workspace/my-pack/script/
```

脚本会写在 `.cdb` 同级的 `script/` 目录下：

```text
workspace/my-pack/script/c11111111.lua
```

如果一次处理多张卡，可以放在同一个 `.cdb` 中；测试会按 `.cdb` 路径映射到 `tests/workspace/` 下。

## 重要：先备份 cdb

写脚本时经常会用到 `aux.Stringid(id,n)` 作为效果描述、选项或提示文本。

只要脚本用了 `aux.Stringid`，就需要同步修改对应 `.cdb` 的 `texts.str1`、`texts.str2` 等字段。因此开始前建议先备份目标 `.cdb`，方便回退：

```bash
cp workspace/my-pack/my-pack.cdb workspace/my-pack/my-pack.cdb.bak
```

## 常用命令

检查脚本是否有红字错误：

```bash
npm run check:redtext -- workspace/my-pack/my-pack.cdb:11111111
```

检查整个 `.cdb`：

```bash
npm run check:redtext -- workspace/my-pack/my-pack.cdb
```

运行指定测试：

```bash
npm test -- workspace/my-pack/my-pack/c11111111.spec.ts
```

运行全部测试：

```bash
npm test
```

## 参考目录

- `ygopro/cards.cdb`: 官方卡池，用来找相似效果和作为测试卡来源。
- `ygopro/script/`: 官方脚本、`utility.lua`、`procedure.lua`、`constant.lua`。
- `ygopro/ocgcore/`: YGOPro 官方内核源码，用来确认 Lua API 和规则行为。
- `ygopro/gframe/`: 客户端交互源码，写 e2e 时确认消息和回应流程。
- `ref/`: 本项目依赖工具的源码参考，例如 `ygopro-cdb-encode`、`ygopro-jstest`、`ygopro-msg-encode`。
