const { open } = require('ygopro-cdb-encode');
(async () => {
  const db = await open('workspace/实验.cdb');
  const card = await db.card(11602456);
  const card2 = await db.card(11602451);
  console.log(JSON.stringify(card, null, 2));
  console.log(JSON.stringify(card2, null, 2));
  await db.close();
})();
