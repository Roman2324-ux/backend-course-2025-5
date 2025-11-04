const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const http = require('http');

program
  .requiredOption('-p, --port <number>', 'server port')
  .requiredOption('-h, --host <address>', 'server address')
  .requiredOption('-c, --cache <path>', 'path to cache directory');
program.parse(process.argv);

const options = program.opts();
const host = options.host;
const port = options.port;
const cacheDir = path.resolve(options.cache);

try {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    console.log(`Cache directory created at: ${cacheDir}`);
  } else {
    console.log(`Using existing cache directory: ${cacheDir}`);
  }
} catch (err) {
  console.error(`Failed to create cache directory: ${err.message}`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  res.writeHead(501, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Implemented\n');
});

server.listen(port, host, () => {
  console.log(`Proxy server is running on http://${host}:${port}`);
});