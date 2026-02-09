process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
process.env.PORT = process.env.PORT || '5000';
process.env.NODE_ENV = 'production';

console.log(`[Production] Starting Next.js on ${process.env.HOSTNAME}:${process.env.PORT}`);

require('./.next/standalone/server.js');
