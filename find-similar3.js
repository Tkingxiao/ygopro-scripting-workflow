const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const rawBytes = fs.readFileSync('ygopro/cards.cdb');
  const db = new SQL.Database(rawBytes);

  // Search for cards with search effects (加入手牌)
  const result = db.exec(`
    SELECT datas.id, texts.name, texts.desc, datas.type
    FROM datas
    INNER JOIN texts ON datas.id = texts.id
    WHERE datas.type & 2 != 0
    LIMIT 500
  `);

  const spells = [];
  if (result.length > 0) {
    for (const row of result[0].values) {
      spells.push({
        id: row[0],
        name: row[1],
        desc: row[2],
        type: row[3]
      });
    }
  }

  // Filter for cards with 1回合各1次 effects
  const filtered = spells.filter(card => {
    return card.desc.includes('1回合') && card.desc.includes('各能使用1次');
  });

  let output = 'Found ' + filtered.length + ' cards with "1回合各能使用1次":\n\n';
  for (const card of filtered.slice(0, 30)) {
    output += `=== ${card.id}: ${card.name} ===\n`;
    output += card.desc + '\n\n';
  }

  fs.writeFileSync('similar_cards.txt', output, 'utf8');
  console.log('Written', filtered.length, 'cards to similar_cards.txt');

  db.close();
})();
