const path = require('path');

process.env.HOSTNAME = '0.0.0.0';
process.env.PORT = process.env.PORT || '5000';
process.env.NODE_ENV = 'production';

const standaloneServer = path.join(__dirname, '.next', 'standalone', 'server.js');

console.log(`[Production] Starting Next.js on ${process.env.HOSTNAME}:${process.env.PORT}`);
console.log(`[Production] Server path: ${standaloneServer}`);

require(standaloneServer);
