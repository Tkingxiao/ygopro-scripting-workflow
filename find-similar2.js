const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const rawBytes = fs.readFileSync('ygopro/cards.cdb');
  const db = new SQL.Database(rawBytes);

  // Search for spell cards with search effects like our target card
  // Target: send from extra deck, search from deck based on attribute
  const result = db.exec(`
    SELECT datas.id, texts.name, texts.desc, datas.type
    FROM datas
    INNER JOIN texts ON datas.id = texts.id
    WHERE datas.type & 2 != 0
      AND texts.desc LIKE '%额外卡组%'
      AND texts.desc LIKE '%送去墓地%'
      AND texts.desc LIKE '%加入手牌%'
    LIMIT 50
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

  // Write output with proper encoding
  let output = 'Found ' + spells.length + ' cards:\n\n';
  for (const card of spells) {
    output += `=== ${card.id}: ${card.name} ===\n`;
    output += card.desc + '\n\n';
  }

  fs.writeFileSync('similar_cards.txt', output, 'utf8');
  console.log('Written to similar_cards.txt');

  db.close();
})();
