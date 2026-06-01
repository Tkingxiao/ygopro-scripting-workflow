const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const rawBytes = fs.readFileSync('ygopro/cards.cdb');
  const db = new SQL.Database(rawBytes);

  // Search for spell cards with search effects
  const result = db.exec(`
    SELECT datas.id, texts.name, texts.desc, datas.type
    FROM datas
    INNER JOIN texts ON datas.id = texts.id
    WHERE datas.type & 2 != 0
    ORDER BY datas.id
  `);

  const spells = [];
  if (result.length > 0) {
    for (const row of result[0].values) {
      const id = row[0];
      const name = Buffer.from(row[1]).toString('utf8');
      const desc = Buffer.from(row[2]).toString('utf8');

      // Skip if desc contains certain keywords we don't want
      if (desc.includes('融合') && (desc.includes('卡组') || desc.includes('加入手牌') || desc.includes('送去墓地'))) {
        spells.push({ id, name, desc });
      }
    }
  }

  console.log('Found', spells.length, 'fusion-related spell cards:\n');
  for (const card of spells.slice(0, 20)) {
    console.log(`=== ${card.id}: ${card.name} ===`);
    console.log(card.desc.slice(0, 300));
    console.log();
  }

  db.close();
})();
