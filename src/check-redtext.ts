import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { createTest } from './create-test';
import { SlientAdvancor } from 'ygopro-jstest';
import { OcgcoreScriptConstants } from 'ygopro-msg-encode';

function parseArgs() {
  const args = process.argv.slice(2);
  const results: Array<{ cdbPath: string; codes?: number[] }> = [];

  for (const arg of args) {
    const parts = arg.split(':');
    const cdbPath = parts[0];
    if (parts.length === 1) {
      results.push({ cdbPath });
    } else {
      const codes = parts[1].split(',').map(Number);
      results.push({ cdbPath, codes });
    }
  }

  return results;
}

async function readCodesFromCdb(cdbPath: string): Promise<number[]> {
  if (!fs.existsSync(cdbPath)) {
    throw new Error(`CDB not found: ${cdbPath}`);
  }
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(cdbPath);
  const db = new SQL.Database(new Uint8Array(buf));
  const stmt = db.prepare('SELECT id FROM datas');
  const codes: number[] = [];
  while (stmt.step()) {
    codes.push(stmt.getAsObject().id as number);
  }
  stmt.free();
  db.close();
  return codes;
}

async function checkRedText() {
  const tasks = parseArgs();
  if (tasks.length === 0) {
    console.error('Usage: npm run check:redtext -- <cdb>[:<id>,<id>...]');
    process.exit(1);
  }

  for (const { cdbPath, codes } of tasks) {
    console.log(`Checking ${cdbPath}...`);

    let targetCodes: number[];
    if (codes && codes.length > 0) {
      targetCodes = codes;
    } else {
      targetCodes = await readCodesFromCdb(cdbPath);
    }

    if (targetCodes.length === 0) {
      console.log('  No cards to check.');
      continue;
    }

    const scriptPath = path.resolve(path.dirname(cdbPath), 'script');

    await createTest(
      {
        cdb: cdbPath,
        scriptPath: fs.existsSync(scriptPath) ? scriptPath : undefined,
        playerInfo: [
          { startHand: 0, drawCount: 0 },
          { startHand: 0, drawCount: 0 },
        ],
      },
      (ctx) => {
        const cards = targetCodes.map((code) => ({
          code,
          location: OcgcoreScriptConstants.LOCATION_DECK,
        }));
        ctx.addCard(cards);
        try {
          ctx.advance(SlientAdvancor());
        } catch (e) {
          console.error(`  Error while checking cards:`, (e as Error).message);
          throw e;
        }
        console.log(`  Checked ${targetCodes.length} card(s)`);
        return;
      },
    );
  }

  console.log('All checks passed!');
}

checkRedText();
