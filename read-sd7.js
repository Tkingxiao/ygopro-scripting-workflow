const fs = require('fs');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const rawBytes = fs.readFileSync('workspace/sd.cdb');
  const db = new SQL.Database(rawBytes);

  const result = db.exec("SELECT id, name, `desc`, str1, str2 FROM texts");
  if (result.length > 0) {
    for (const row of result[0].values) {
      const id = row[0];
      const name = row[1];
      const desc = row[2];
      const str1 = row[3];
      const str2 = row[4];

      // Write to file with explicit UTF-8 encoding
      const output = `=== Card ${id} ===
Name: ${name}
Str1: ${str1 || ''}
Str2: ${str2 || ''}
Desc:
${desc}
`;

      fs.writeFileSync('card_output.txt', output, 'utf8');
      console.log('Written to card_output.txt');
    }
  }
  db.close();
})();
