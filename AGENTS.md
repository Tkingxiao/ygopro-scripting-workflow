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
| 从自己的额外卡组把1只表侧表示的灵摆怪兽特殊召唤 | Special Summon 1 face-up Pendulum Monster from your Extra Deck | Extra Deck pendulum zone placement rule applies (see §6) |
| 灵摆区 | Pendulum Zone | `LOCATION_PZONE` (0x200) — two zones in SZone seq 0 (left) and seq 4 (right) |
| 灵摆刻度 | Pendulum Scale | `c:GetLeftScale()` / `c:GetRightScale()` |
| 灵摆召唤 | Pendulum Summon | `SUMMON_TYPE_PENDULUM` (0x4a000000) |
| 额外卡组的灵摆怪兽 | Extra Deck Pendulum Monster | `TYPE_PENDULUM` (0x1000000) + `LOCATION_EXTRA` + face-up |
| 连接箭头 | Link Marker | `LINK_MARKER_*` constants — define which zones a Link Monster connects to |

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

#### Extra Deck Pendulum Monster Placement Rule
When Special Summoning a Pendulum Monster from the Extra Deck (pendulum summon or card effect), the monster can ONLY be placed in a **zone pointed to by a Link Monster** (Extra Monster Zone or Main Monster Zone linked by a Link Monster). If no valid zone exists, the monster is **sent to the Graveyard**.

**Applies to:**
- Pendulum Summon of face-up Extra Deck Pendulum Monsters
- Card effects that Special Summon from the Extra Deck with text like "从自己的额外卡组把1只表侧表示的灵摆怪兽特殊召唤"

**Zone layout (from controller's perspective):**
- MZone seq 0–4: Main Monster Zones (columns 0–4)
- MZone seq 5: Extra Monster Zone left (column 1)
- MZone seq 6: Extra Monster Zone right (column 3)

**Key APIs for zone checking:**
- `c:GetLinkedZone(tp)` — Returns bitmask of zones linked by `c` (for player `tp`)
- `Duel.GetLinkedZone(tp)` — Returns all zones linked by any Link Monster on field for player `tp`
- `Auxiliary.GetMultiLinkedZone(tp)` — Returns zones linked by 2+ Link Monsters
- `Duel.GetLocationCount(tp, LOCATION_MZONE)` — Available Main Monster Zones
- `Duel.GetLocationCount(tp, LOCATION_MZONE, g)` — After releasing `g`, check available zones
- `LOCATION_REASON_TOFIELD = 0x1` — Default reason for `GetLocationCount` (field placement)
- `c:IsInExtraMZone()` — Check if card is in an Extra Monster Zone
- `c:IsInMainMZone()` — Check if card is in a Main Monster Zone

**Zone bitmask constants:**
- `0x1`–`0x1f`: Main Monster Zones seq 0–4 (columns 0–4)
- `0x20`: Extra Monster Zone seq 5 (left, column 1)
- `0x40`: Extra Monster Zone seq 6 (right, column 3)
- `0x7f`: All Monster Zones

**`Duel.SelectField` filter convention:** The `filter` parameter is an **exclusion mask** — bits set to 1 are EXCLUDED from selection. To select only from linked zones, use `~zone` (invert the linked zone bitmask). Example: if `zone = 0x21` (EMZ left + MMZ seq 0), then `~zone & 0x7f` selects from all OTHER zones.

**Scripting pattern for Extra Deck pendulum placement:**
```lua
-- In target/operation, when placing Extra Deck pendulum monsters:
local zone = Duel.GetLinkedZone(tp)
if zone == 0 then
    -- No valid zone — monster goes to GY
    Duel.SendtoGrave(c, REASON_RULE)
else
    -- Select from linked zones
    Duel.Hint(HINT_SELECTMSG, tp, HINTMSG_SPSUMMON)
    local seq = Duel.SelectField(tp, 1, LOCATION_MZONE, 0, ~zone)
    Duel.SpecialSummon(c, 0, tp, tp, false, false, POS_FACEUP, seq)
end
```

**Reference:** `ygopro/ocgcore/field.cpp` (`field::pendulum_summon`), `ygopro/ocgcore/operations.cpp`, `ygopro/script/utility.lua` (`Auxiliary.GetMultiLinkedZone`)

#### Pendulum Zone Mechanics
Pendulum Zones are part of the Spell/Trap zone area:
- `LOCATION_PZONE = 0x200` — Two zones per player: seq 0 (left) and seq 4 (right)
- When a Pendulum Monster is placed in a Pendulum Zone, it behaves as a **Continuous Spell** (not a monster)
- Pendulum Scales: `c:GetLeftScale()` and `c:GetRightScale()`
- Pendulum Monsters can exist in both Monster Zone and Pendulum Zone simultaneously (the Pendulum Monster in the Pendulum Zone is treated as a Spell)

**Key API — Pendulum Scale & Placement:**
- `c:IsPendulumMonster()` — Check if card is a Pendulum Monster
- `c:IsPendulumSetable()` — Check if Pendulum Monster can be placed in Pendulum Zone
- `c:SetPendulum()` — Place Pendulum Monster in Pendulum Zone (treated as Continuous Spell)
- `c:GetLeftScale()` — Get left Pendulum Scale value
- `c:GetRightScale()` — Get right Pendulum Scale value
- `Duel.GetPendulumCount(tp)` — Get number of Pendulum Monsters in Pendulum Zones for player

#### Link Monster Zone Connection
Link Monsters define connected zones via Link Markers. These zones determine where Extra Deck Pendulum Monsters can be placed (see "Extra Deck Pendulum Monster Placement Rule" above).

**Link Marker constants** (from `constant.lua`):
| Constant | Direction | Bitmask |
|----------|-----------|---------|
| `LINK_MARKER_BOTTOM_LEFT` | ↙ | `0x001` |
| `LINK_MARKER_BOTTOM` | ↓ | `0x002` |
| `LINK_MARKER_BOTTOM_RIGHT` | ↘ | `0x004` |
| `LINK_MARKER_LEFT` | ← | `0x008` |
| `LINK_MARKER_RIGHT` | → | `0x020` |
| `LINK_MARKER_TOP_LEFT` | ↖ | `0x040` |
| `LINK_MARKER_TOP` | ↑ | `0x080` |
| `LINK_MARKER_TOP_RIGHT` | ↗ | `0x100` |

**Related zone封锁 effects:**
- `EFFECT_USE_EXTRA_MZONE` (261) — Locks Extra Monster Zones
- `EFFECT_USE_EXTRA_SZONE` (262) — Locks Spell/Trap Zones
- `EFFECT_MAX_MZONE` (263) — Limits available Monster Zones
- `EFFECT_MAX_SZONE` (264) — Limits available Spell/Trap Zones
- `EFFECT_MUST_USE_MZONE` (265) — Forces use of specific Monster Zones

#### Pendulum Summon Type & Procedure
Pendulum Summon is a built-in summoning procedure, not a card effect:
- `SUMMON_TYPE_PENDULUM = 0x4a000000` — Used in `Card.IsSummonType()` checks
- `EFFECT_SPSUMMON_PROC_G = 320` — Pendulum summon procedure effect
- `EFFECT_EXTRA_PENDULUM_SUMMON = 360` — Extra pendulum summon (additional pendulum summon)
- `EVENT_SPSUMMON_SUCCESS_G_P = 1117` — Pendulum summon success event (continuous only)

**Card type flags for Pendulum:**
- `TYPE_PENDULUM = 0x1000000` — Pendulum Monster type bit
- Check: `c:IsType(TYPE_PENDULUM)` or `c:GetOriginalType() & TYPE_PENDULUM ~= 0`

#### Pendulum-Related Redirect Effects
When a Pendulum Monster leaves the field, it may go to different zones depending on its state:
- `EFFECT_TO_GRAVE_REDIRECT` (63) — Redirect from GY (e.g., face-up Pendulum Monster from Extra Deck goes to Pendulum Zone)
- `EFFECT_TO_DECK_REDIRECT` (62) — Redirect from Deck
- `EFFECT_LEAVE_FIELD_REDIRECT` (60) — Redirect when leaving field
- `EFFECT_TO_HAND_REDIRECT` (61) — Redirect to hand
- `EFFECT_REMOVE_REDIRECT` (64) — Redirect from banishment
- `EFFECT_BATTLE_DESTROY_REDIRECT` (204) — Redirect from battle destruction
- `EFFECT_TO_GRAVE_REDIRECT_CB` (313) — Conditional redirect (e.g., Crystal Beast)

**Important:** When a face-up Pendulum Monster in the Extra Deck would be sent to GY, it is placed in the Pendulum Zone instead (unless the Pendulum Zone is full). This is the core rule for "Extra Deck Pendulum Monster → Pendulum Zone" redirects.

#### Pendulum-Related Events
| Event | Meaning |
|-------|---------|
| `EVENT_SPSUMMON_SUCCESS_G_P = 1117` | Pendulum summon success (continuous only) |
| `EVENT_SPSUMMON_PROC_G = 320` | Pendulum summon procedure |

#### Scripting Pitfalls & Rules

##### `REASON_RULE` Does Not Trigger诱发 Effects
`Duel.SendtoGrave(c, REASON_RULE)` will NOT trigger `EVENT_DESTROYED` or `EVENT_TO_GRAVE` effects. Use when the core rule itself moves a card (e.g., Extra Deck pendulum monster with no valid zone).

##### Facedown Card Targeting Restriction
Targeting effects (`EFFECT_FLAG_CARD_TARGET`) generally cannot select facedown cards unless the effect text explicitly mentions "里侧表示的卡". Add `c:IsFaceup()` to targeting filters.

##### Non-Targeting Selection Requires `HintSelection`
After `Duel.SelectMatchingCard()` in `operation`, always call `Duel.HintSelection(g)` to record the selection. Without it, some cards won't register as "selected".

##### Same-Name Activation Limit
"同名卡1回合只能发动1次" requires `Duel.GetCustomActivityCount(id, tp, ACTIVITY_ACTIVATE)` — it checks the entire duel history, not just the field.

##### Target Relation Check in Operation
Always verify `tc:IsRelateToEffect(e)` before operating on a target. If the target was moved during chain resolution, `IsRelateToEffect` returns `false` and the target should not be processed.

##### Sequential Processing ("那之后")
"那之后" means the first action must fully resolve before the second begins. Check the result of the first action (e.g., `g:FilterCount(Card.IsLocation, nil, LOCATION_GRAVE) > 0`) before proceeding.

##### Damage Step Restrictions
During the Damage Step, only these effects may activate:
- ATK/DEF modification effects
- Counter Trap cards
- Effects explicitly stated to activate during damage step
- Effects that change battle position

Use `EFFECT_FLAG_DAMAGE_STEP` to allow activation, or check `Duel.IsDamageStep()` in condition to restrict.

##### `EFFECT_TYPE_FIELD` + Trigger Combination
Field effects that respond to events must combine `EFFECT_TYPE_FIELD` with `EFFECT_TYPE_TRIGGER_O` or `EFFECT_TYPE_TRIGGER_F`. Example: `e1:SetType(EFFECT_TYPE_FIELD + EFFECT_TYPE_TRIGGER_O)`.

##### Extra Deck Pendulum Monsters Are Public Info
Face-up Pendulum Monsters in the Extra Deck are public information — the opponent can view them. Filter with `LOCATION_EXTRA` + `Card.IsFaceup()`.

##### `aux.TRUE` / `aux.FALSE` Quick Filters
`utility.lua` provides `aux.TRUE` (matches all cards) and `aux.FALSE` (matches no cards) for convenience in `Duel.IsExistingMatchingCard` and similar calls.

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
| `Duel.SpecialSummon(c, sumtype, tp, tp, nocheck, nolimit, pos, seq)` | Special summon (with zone placement) |
| `Duel.Destroy(c, reason)` | Destroy card |
| `Duel.SendtoDeck(c, tp, seq, reason)` | Return to deck |
| `Duel.Remove(c, pos, reason)` | Remove from play |
| `Duel.Draw(tp, count, reason)` | Draw cards |
| `Duel.Recover(tp, count, reason)` | Recover LP |
| `Duel.Damage(tp, count, reason)` | Inflict damage |
| `Card:GetLinkedZone(tp)` | Zones linked by this Link Monster |
| `Duel.GetLinkedZone(tp)` | All linked zones on field for player |
| `Card:IsInExtraMZone()` | Check if in Extra Monster Zone |
| `Card:IsInMainMZone()` | Check if in Main Monster Zone |
| `Duel.SelectField(tp, count, loc1, loc2, filter)` | Select field zone(s) |
| `Card:IsPendulumMonster()` | Check if card is Pendulum Monster |
| `Card:IsPendulumSetable()` | Check if can be placed in Pendulum Zone |
| `Card:SetPendulum()` | Place in Pendulum Zone |
| `Card:GetLeftScale()` | Get left Pendulum Scale |
| `Card:GetRightScale()` | Get right Pendulum Scale |
| `Card:IsCanAddCounter(counter, count)` | Check if can add counter |
| `Duel.GetPendulumCount(tp)` | Count Pendulum Monsters in Pendulum Zones |
| `Duel.GetLocationCount(tp, loc)` | Available zones count |
| `Duel.GetCustomActivityCount(id, tp, act)` | Activity counter check |
| `c:IsCanBeSpecialSummoned(e, sumtype, tp, nocheck, nolimit, pos)` | Check if can be Special Summoned |
| `c:IsCanTurnSet()` | Check if can be turned face-down |
| `c:IsFaceup()` | Check if face-up |
| `c:IsFacedown()` | Check if face-down |

---

**These guidelines are working if:** scripts are accurate, tests are comprehensive, and verification is automated rather than manual.
