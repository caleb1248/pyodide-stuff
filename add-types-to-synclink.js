import fs from 'fs';

const synclinkJson = JSON.parse(fs.readFileSync('./node_modules/synclink/package.json').toString());
synclinkJson.exports['.'].types = './dist/types/synclink.d.ts';
fs.writeFileSync('./node_modules/synclink/package.json', JSON.stringify(synclinkJson, null, 2));
