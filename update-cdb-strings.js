const fs = require('fs');
const initSqlJs = require('sql.js');
(async () => {
  const SQL = await initSqlJs();
  const data = fs.readFileSync('workspace/实验.cdb');
  const db = new SQL.Database(data);
  const stmt = db.prepare('UPDATE texts SET str1 = :str1, str2 = :str2 WHERE id = :id');
  const updates = [
    {
      id: 11602451,
      str1: 'Return 1 "流淌金血的黄金裔" monster from your hand or field to the Deck; Special Summon 1 other "流淌金血的黄金裔" monster from your Deck.',
      str2: 'Target 1 "流淌金血的黄金裔" monster you control; place 1 Fire Seed counter on it, then Special Summon 1 "流淌金血的黄金裔" monster from your GY.',
    },
    {
      id: 11602456,
      str1: 'When your monster leaves the field by opponent\'s effect: Special Summon 1 monster with the same name from your GY, banished zone, Deck, or Extra Deck, then you can reveal 1 "生命第一因 德谬歌" to Special Summon 1 "流淌金血的黄金裔" monster from your Deck.',
      str2: 'Banish this card from your GY; add 1 banished "流淌金血的黄金裔" monster to your hand.',
    },
  ];
  db.run('BEGIN');
  for (const upd of updates) {
    stmt.run(upd);
  }
  db.run('COMMIT');
  fs.writeFileSync('workspace/实验.cdb', Buffer.from(db.export()));
  stmt.free();
  db.close();
})();
