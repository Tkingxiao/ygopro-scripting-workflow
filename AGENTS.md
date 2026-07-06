# YGOPro Scripting Workflow — Agent Instructions

**Tradeoff:** These guidelines bias toward accuracy over speed. Never guess — verify against source code.

## 1. Core Principles

### Think Before Coding
- **Don't assume. Don't hide confusion. Surface tradeoffs.**
- Every API, constant, function signature must come from `ygopro/script/*.lua`, `ygopro/ocgcore/*.cpp`, or `ygopro/gframe/*`.
- This is YGOPro official version, NOT Project Ignis / EDOPro. Never use APIs from other forks.
- If uncertain, search `ygopro/script/` for similar effects — this is normal workflow, not a sign of confusion.

### Simplicity First
- **Minimum code that solves the problem. Nothing speculative.**
- Match existing script style in `ygopro/script/`.
- No error handling for impossible scenarios. No unnecessary abstractions.

### Surgical Changes
- **Touch only what you must. Clean up only your own mess.**
- Don't "improve" adjacent code unless asked.
- If you notice unrelated issues, mention them — don't fix silently.

### Goal-Driven Execution
- **Define success criteria. Loop until verified.**
- Script passes redtext check + all tests pass = done.
- State verification steps before implementing.

---

## 2. Project Structure

### Directory Map

| Directory | Purpose | When to Read |
|-----------|---------|--------------|
| `workspace/` | User workspace with target `.cdb` and scripts | Always |
| `workspace/**/script/` | Card scripts: `workspace/foo/bar/script/c{code}.lua` | Writing scripts |
| `ygopro/cards.cdb` | Official card pool — search similar effects, test cards | Finding references |
| `ygopro/script/` | Official scripts, `utility.lua`, `procedure.lua`, `constant.lua` | Verifying APIs |
| `ygopro/ocgcore/` | C++ core — Lua API, constants, events, script loading | Confirming behavior |
| `ygopro/gframe/` | Client interaction — MSG/response relationships | E2E testing |
| `ref/ygopro-cdb-encode/` | `.cdb` read/write tool reference | Database operations |
| `ref/ygopro-jstest/` | Test driver reference | Writing tests |
| `ref/ygopro-msg-encode/` | MSG/CTOS/STOC encoding and response reference | E2E testing |
| `ref/koishipro-core.js/` | OCGCore JS wrapper reference | Understanding core |
| `src/create-test.ts` | Test entry — auto-attaches `ygopro/cards.cdb` and `ygopro/script/` | Writing tests |
| `src/create-coverage.ts` | Lua line coverage entry | Coverage reporting |
| `src/current-messages.ts` | Message assertion helpers | E2E assertions |
| `tests/sample/standalone.spec.ts` | E2E test structure example | Writing tests |

**Warning:** `ygopro/` and `ref/` are upstream reference directories. Do NOT modify unless explicitly asked.

### Reference Source Rules
- **NEVER** use `node_modules/` as source reference. Read `ref/` instead.
- `node_modules/` is only for installing dependencies and running commands.
- When stack traces point to `node_modules/`, use file/function names for location, but verify in `ref/`.
- Citations in conclusions/tests must reference `ref/`, `ygopro/`, or this project — not `node_modules/`.
- `.codex` files are Codex CLI artifacts. Don't clean or modify unless asked.

---

## 3. Setup & Preparation

### Initial Setup
```bash
npm ci  # Install dependencies (if node_modules/ missing)
```

### Before Scripting
```bash
npm run prepare:ygopro  # Update ygopro/ and submodules
npm run prepare:ref     # Update ref/ reference repos
```
Run these before processing new cards — directories may be stale.

---

## 4. Card Identification

### Finding Target Cards
```bash
rg --files workspace -g '*.cdb'  # Find all .cdb files in workspace
```

### Querying Card Data
**MUST** use `ygopro-cdb-encode` via Node.js/TypeScript. Never hand-write SQLite or guess fields.

**Required fields to verify:**
- `code` — Card ID
- `name` — Card name
- `desc` — Effect text
- `alias` — Original card ID (0 if not a variant)
- `type` — Card type flags
- `setcode` — Archetype/series codes
- `category` — Effect categories

### When NOT to Write Scripts
Skip `script/c{code}.lua` if:
1. **Alternate art cards:** `alias != 0`, original `code == alias` exists in workspace, and difference < 20
2. **Non-pendulum normal monsters:** `type & 0x10 != 0` AND `type & 0x1000000 == 0`

All other cards (effects, spells, traps, pendulum normals) require scripts.

---

## 5. Effect Text Analysis

### Key Terminology — Chinese to English

| Chinese Term | English Equivalent | Script Implication |
|--------------|-------------------|-------------------|
| 召唤成功的场合 | When successfully summoned | `SetCode(EVENT_SUMMON_SUCCESS)` |
| 被破坏的场合 | When destroyed | `SetCode(EVENT_DESTROYED)` |
| 攻击宣言时 | When attack declared | `SetCode(EVENT_ATTACK_ANNOUNCE)` |
| 对方的主要阶段 | During opponent's Main Phase | `SetHintTiming(TIMING_MAIN_END)` |
| 从手卡发动 | Activate from hand | `SetRange(LOCATION_HAND)` |
| 以...为对象才能发动 | Target to activate | `EFFECT_FLAG_CARD_TARGET` |
| 场上有「xxx」存在的场合才能发动 | Can activate if "xxx" on field | `condition` check |
| 选1张卡 | Select 1 card | `Duel.SelectTarget` or `Duel.SelectMatchingCard` |
| 那之后 | After that | Sequential processing in `operation` |
| 送入墓地 | Send to Graveyard | `CATEGORY_TOGRAVE` |
| 从卡组加入手卡 | Add from Deck to hand | `CATEGORY_SEARCH` |
| 特殊召唤 | Special Summon | `CATEGORY_SPECIAL_SUMMON` |
| 破坏 | Destroy | `CATEGORY_DESTROY` |
| 1回合1次 | Once per turn | `SetCountLimit(1, id)` |
| 这个卡名的效果1回合只能使用1次 | This card's effects can only be used once per turn | `SetCountLimit(1, id)` on all effects |

### Parsing Effect Text

**Before scripting, split each effect into:**

1. **Activation timing** → `SetCode(EVENT_XXX)` + `SetType(EFFECT_TYPE_*)`
   - Trigger: "When X happens" → `EVENT_XXX`
   - Free chain: "Can activate" → `EVENT_FREE_CHAIN`
   - Quick effect: Requires `EFFECT_TYPE_QUICK_O/F` + `SetHintTiming(...)`

2. **Condition** → `condition` function
   - Requirements that must be true WHEN effect activates (not timing events)
   - Example: "If you control X" is condition; "When X is summoned" is timing

3. **Cost** → `cost` function
   - What you MUST pay to activate
   - `chk==0`: Check if can pay
   - `chk~=0`: Actually pay

4. **Target** → `target` function
   - What you choose/target WHEN activating
   - `chk==0`: Check if valid targets exist
   - `chk~=0`: Select targets + `Duel.SetOperationInfo(...)`

5. **Operation** → `operation` function
   - What happens AFTER activation resolves
   - Never put resolution logic in `target`

### Target vs Non-Target Selection

**Targeting effects** (为对象):
- Set `EFFECT_FLAG_CARD_TARGET`
- `target` uses `Duel.IsExistingTarget()` (chk==0) and `Duel.SelectTarget()` (chk~=0)
- `operation` retrieves via `Duel.GetFirstTarget()` + `IsRelateToEffect(e)`

**Non-targeting effects** (选):
- No `EFFECT_FLAG_CARD_TARGET`
- `target` uses `Duel.IsExistingMatchingCard()` (chk==0)
- `operation` uses `Duel.SelectMatchingCard()` + `Duel.HintSelection(g)` when player choice matters

**Reference scripts:**
- `ygopro/script/c18239909.lua` — Target then non-target selection in operation
- `ygopro/script/c39531794.lua`, `c59011257.lua` — `SetCardTarget` examples (rare usage)

---

## 6. Script Writing Workflow

### Step-by-Step Process

1. **Analyze effect text** → Split into timing, condition, cost, target, operation
   - Verify against `ygopro/cards.cdb` similar cards and their scripts

2. **Search for similar official cards** using `ygopro-cdb-encode`
   - Prefer post-9th era cards (text contains `①：`)
   - Pre-9th texts may be misleading — verify with scripts

3. **Study reference scripts** in `ygopro/script/c{code}.lua`
   - Map text patterns to actual `SetCode()`, `condition`, `cost`, `target`, `operation`

4. **Verify API signatures** against:
   - `ygopro/script/utility.lua`
   - `ygopro/script/procedure.lua`
   - `ygopro/script/constant.lua`
   - `ygopro/ocgcore/libduel.cpp`
   - `ygopro/ocgcore/libcard.cpp`
   - `ygopro/ocgcore/libeffect.cpp`

5. **Write script** following official patterns

6. **Redtext check** → Must pass

7. **Write tests** → Unit + E2E

8. **Run tests** → Must pass

### Critical Rules

#### `SetOperationInfo` — Correct Categories
- `CATEGORY_SEARCH` — Adding from Deck to hand
- `CATEGORY_TOGRAVE` — Sending to GY
- `CATEGORY_SPECIAL_SUMMON` — Special summoning
- `CATEGORY_DESTROY` — Destroying
- Missing or wrong categories break chain detection

#### `SetCountLimit` — Count Codes
- "Each effect once per turn": Effect 1 = `id`, Effect 2 = `id+o`, Effect 3 = `id+2*o`
- "Once per turn for any of these effects": All effects use same `id`
- Cloned effects with same trigger share one count code
- Non-9-digit consecutive card IDs: Use `id`, `id+100`, `id+200` to avoid collisions
- Check workspace conventions before using custom patterns
- `EFFECT_COUNT_CODE_OATH`, `EFFECT_COUNT_CODE_DUEL` — Verify in ocgcore before using

#### `description` — Required for Ignition/Trigger/Quick Effects
- `SetType` includes `EFFECT_TYPE_IGNITION`, `EFFECT_TYPE_TRIGGER_O`, `EFFECT_TYPE_TRIGGER_F`, `EFFECT_TYPE_QUICK_O`, `EFFECT_TYPE_QUICK_F` → Must set `description`
- Usually `e:SetDescription(aux.Stringid(id, n))`
- Check `Clone()` effects inherit correct description

#### `aux.Stringid` — Sync with `.cdb`
- `aux.Stringid(id, 0)` → `texts.str1`
- `aux.Stringid(id, 1)` → `texts.str2`
- Edit `.cdb` using `ygopro-cdb-encode`, never hand-edit

---

## 7. Redtext Check

```bash
npm run check:redtext -- <cdb>[:id,id...] [...]
```

**Examples:**
```bash
npm run check:redtext -- workspace/33741/33741.cdb:33741001
npm run check:redtext -- workspace/33741/33741.cdb
npm run check:redtext -- workspace/foo/a.cdb:11111111,22222222
```

**Rules:**
- At least one argument required
- Without `:id,id...` → Checks all cards in `.cdb`
- With IDs → Verifies they exist in `.cdb`
- Script directory = `path.dirname(cdb)/script`
- Each card is added to deck and advanced once
- **Must pass.** Fix scripts until it does.

---

## 8. Testing Requirements

### Test Structure
- One `.spec.ts` per card
- Path mapping: `workspace/foo/bar/baz.cdb` → `tests/workspace/foo/bar/baz/c{code}.spec.ts`
- Fixtures in `tests/workspace/.../fixtures/` (not top-level `tests/fixtures/`)
- **Required:** Unit + E2E tests in every file

### Lua Coverage
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

**Rules:**
- `scriptDir` is required — must match `createTest({ scriptPath })`
- `createCoverage()` auto-registers `afterAll` — don't add manually
- Call `coverageRegistry.addFrom(ctx)` after each duel in `it`
- `missing executable lines` = TODO list for additional tests
- Never add assertion-free flows just to improve coverage

### Unit Testing
- Use `createTest({ cdb, scriptPath }, cb)`
- Test pure logic: `filter`, `condition`, `value`, `cost`/`target` `chk==0`
- **Never** pass `nil` for `e` — construct via `Effect.CreateEffect(c)`
- Cover both `true` and `false` outcomes for boolean functions
- **Forbidden** in `ctx.evaluate()`: `Duel.Select*`, `operation`, state changes

### E2E Testing
- Reference: `tests/sample/standalone.spec.ts`
- Cover ALL effects, branches, and failure paths
- Verify fusion/synchro/xyz/link summoning procedures
- Test count limits (once per turn, shared limits)
- Verify chain detection (Ash Blossom `14558127`, Warning `84749824`, Ghost Belle `73642296`, Stardust `44508094`)

### Message Assertions
Helpers in `src/current-messages.ts`:

```typescript
expectCurrentMessage(ctx, MsgClass, assertMessage?)  // Single message
expectCurrentMessages(ctx, ...MsgClasses)              // Multiple messages
expectCurrentMessageMatching(ctx, MsgClass, expected)  // Match fields
expectCurrentHint(ctx, expected)                       // Hint-specific
```

**Rules:**
- Always check specific fields for `YGOProMsgHint`, `YGOProMsgCardHint`, `YGOProMsgPlayerHint`
- For LP messages: Check `value`/`cost`/`lp` + `player`
- Use `currentMessages` only for messages since last `state()` callback
- Assert in the `state()` immediately following the operation

### Advancor Usage
Reference: `ref/ygopro-jstest/` and `ref/koishipro-core.js/src/advancors/`

| Advancor | Purpose |
|----------|---------|
| `advance(...)` | Process duel until MSG requiring response |
| `state(MsgClass, cb)` | Assert current MSG type |
| `SlientAdvancor()` | Auto-respond to all (skips optional chains) |
| `NoEffectAdvancor()` | Respond only when no chains available |
| `SummonPlaceAdvancor()` | Handle place/position selection |
| `SelectCardAdvancor(...filters)` | Auto-select cards by filter |
| `StaticAdvancor(items)` | Pre-defined responses |
| `MapAdvancor(...)` / `MapAdvancorHandler(Msg, cb)` | MSG-type dispatch |
| `LimitAdvancor(...)` / `OnceAdvancor(...)` | Limit response count |
| `PlayerViewAdvancor(player, advancor)` | Player-specific responses |

**Critical:** Return responses from `state()` callbacks! `summon()`, `activate()`, `select()` all return response bytes.

### Common E2E Patterns
```typescript
// 1. Skip to Main Phase
advance(SlientAdvancor())

// 2. Assert can activate/summon
state(YGOProMsgSelectIdleCmd, (msg) => {
  expect(card.canActivate()).toBe(true);
  return card.activate();
})

// 3. Handle placement + no chain
advance(SummonPlaceAdvancor(), NoEffectAdvancor())

// 4. Critical selection — MUST assert candidates first
state(YGOProMsgSelectCard, (msg) => {
  expect(msg.selectableCards).toContainEqual(expect.objectContaining({ code: 12345 }));
  return card.select();
})
```

---

## 9. Final Verification

Before marking complete:

```bash
npm run check:redtext -- <target.cdb>:<code>
npm test -- <mapped-test-path>
npm run lint  # After editing .spec.ts files
```

**All must pass.** Iterate until green.

---

## Quick Reference

### Effect Type Mapping
| Effect Type | Constant | Typical Use |
|-------------|----------|-------------|
| 起动效果 | `EFFECT_TYPE_IGNITION` | Normal Spell-like monster effects |
| 诱发效果 | `EFFECT_TYPE_TRIGGER_O` | Optional trigger effects |
| 必发诱发效果 | `EFFECT_TYPE_TRIGGER_F` | Mandatory trigger effects |
| 速攻效果 | `EFFECT_TYPE_QUICK_O` | Quick-effect (opponent's turn) |
| 必发速攻效果 | `EFFECT_TYPE_QUICK_F` | Mandatory quick effects |
| 永续效果 | `EFFECT_TYPE_SINGLE` | Continuous effects |
| 场地效果 | `EFFECT_TYPE_FIELD` | Field spell-like effects |

### Common Event Codes
| Event | Meaning |
|-------|---------|
| `EVENT_FREE_CHAIN` | Any time |
| `EVENT_SUMMON_SUCCESS` | Successfully summoned |
| `EVENT_SPSUMMON_SUCCESS` | Successfully special summoned |
| `EVENT_DESTROYED` | Destroyed |
| `EVENT_ATTACK_ANNOUNCE` | Attack declared |
| `EVENT_DAMAGE_STEP_START` | Damage step start |
| `EVENT_TO_GRAVE` | Sent to GY |
| `EVENT_LEAVE_FIELD` | Left the field |

### Common APIs
| API | Purpose |
|-----|---------|
| `Duel.IsExistingMatchingCard(f, tp, loc1, loc2, min, ...)` | Check if cards exist |
| `Duel.SelectMatchingCard(tp, f, loc1, loc2, min, max, ...)` | Select cards |
| `Duel.IsExistingTarget(f, tp, loc1, loc2, min, ...)` | Check if target exists |
| `Duel.SelectTarget(tp, f, loc1, loc2, min, max, ...)` | Select target |
| `Duel.SetOperationInfo(0, CATEGORY_*, g, count, loc, ...)` | Set chain info |
| `Duel.GetFirstTarget()` | Get selected target |
| `tc:IsRelateToEffect(e)` | Check if target still related |
| `Duel.HintSelection(g)` | Hint player selection |
| `Duel.NegateEffect(ev)` | Negate chain effect |
| `Duel.SpecialSummon(c, sumtype, tp, tp, ...)` | Special summon card |
| `Duel.Destroy(c, reason)` | Destroy card |
| `Duel.SendtoDeck(c, tp, seq, reason)` | Return to deck |
| `Duel.Remove(c, pos, reason)` | Remove from play |
| `Duel.Draw(tp, count, reason)` | Draw cards |
| `Duel.Recover(tp, count, reason)` | Recover LP |
| `Duel.Damage(tp, count, reason)` | Inflict damage |

---

**These guidelines are working if:** scripts are accurate, tests are comprehensive, and verification is automated rather than manual.
