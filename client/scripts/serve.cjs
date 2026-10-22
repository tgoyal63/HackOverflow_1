const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const handler = require('serve-handler');

const directory = path.resolve(__dirname, '../build');
fs.accessSync(path.join(directory, 'index.html'));
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const server = http.createServer((request, response) => {
  handler(request, response, {
    public: directory,
    directoryListing: false,
    rewrites: [{ source: '**', destination: '/index.html' }],
  }).catch((error) => {
    console.error('Failed to serve production asset:', error);
    if (!response.headersSent) response.writeHead(500);
    response.end();
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`HackOverflow production server listening on 0.0.0.0:${port}`);
});
