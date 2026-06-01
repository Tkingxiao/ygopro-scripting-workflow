const fs = require('fs');

const fileBuffer = fs.readFileSync('workspace/sd.cdb');
console.log('File size:', fileBuffer.length);

// Read header
console.log('\n=== SQLite Header ===');
console.log('Magic:', fileBuffer.slice(0, 16).toString('ascii'));
const pageSize = fileBuffer.readUInt16BE(16);
console.log('Page size field (BE @16):', pageSize);
const psLE = fileBuffer.readUInt16LE(16);
console.log('Page size field (LE @16):', psLE);

const usablePageSize = pageSize >= 512 ? pageSize : pageSize * 2;
console.log('Usable page size:', usablePageSize);

console.log('\nHeader bytes 0-100:');
for (let i = 0; i < 100; i++) {
  process.stdout.write(fileBuffer[i].toString(16).padStart(2, '0') + ' ');
  if ((i + 1) % 16 === 0) process.stdout.write('\n');
}

console.log('\n\nPage 1 first 64 bytes:');
const pageStart = usablePageSize === 4096 ? 0 : (fileBuffer.readUInt16LE(16) >= 512 ? 0 : 0);
for (let i = 0; i < 64; i++) {
  process.stdout.write(fileBuffer[i].toString(16).padStart(2, '0') + ' ');
  if ((i + 1) % 16 === 0) process.stdout.write('\n');
}

console.log('\nPage 1 byte[0] (page type):', fileBuffer[0], '(hex:', fileBuffer[0].toString(16), ')');
console.log('Page 1 byte[1] (first freeblock):', fileBuffer[1], '(hex:', fileBuffer[1].toString(16), ')');
console.log('Page 1 byte[2-3] (num cells LE):', fileBuffer.readUInt16LE(2), '(hex:', fileBuffer.readUInt16LE(2).toString(16), ')');
console.log('Page 1 byte[2-3] (num cells BE):', fileBuffer.readUInt16BE(2), '(hex:', fileBuffer.readUInt16BE(2).toString(16), ')');
console.log('Page 1 byte[4-5] (content start LE):', fileBuffer.readUInt16LE(4));
console.log('Page 1 byte[4-5] (content start BE):', fileBuffer.readUInt16BE(4));
console.log('Page 1 byte[5-6] (content start LE):', fileBuffer.readUInt16LE(5));
