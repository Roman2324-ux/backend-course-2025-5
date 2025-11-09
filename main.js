const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const http = require('http');
const superagent = require('superagent');

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

const server = http.createServer(async (req, res) => {
try {
    if (req.url === '/') {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Please specify the HTTP code in the path (e.g., /200, /404)');
      return;
    }
    const fileName = req.url.substring(1) + '.jpg';
    const filePath = path.join(cacheDir, fileName);
    console.log(`[REQUEST] ${req.method} ${req.url} -> ${filePath}`);

    switch (req.method) {
      case 'GET':
        try {
          const data = await fs.promises.readFile(filePath);
          console.log(`[CACHE HIT] Serving ${fileName} from cache.`);
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(data);

        } catch (error) {
          if (error.code === 'ENOENT') {
            console.log(`[CACHE MISS] File ${fileName} not found. Fetching from http.cat...`);
            const statusCode = fileName.replace('.jpg', '');
            const targetUrl = `https://http.cat/${statusCode}`;
            try {
              const targetRes = await superagent.get(targetUrl)
                .responseType('blob');
              const imageData = targetRes.body;
              fs.promises.writeFile(filePath, imageData)
                .then(() => console.log(`[CACHE WRITE] Saved ${fileName} to cache.`))
                .catch(cacheErr => console.error('[CACHE ERROR] Failed to save to cache:', cacheErr));
              res.writeHead(200, { 'Content-Type': 'image/jpeg' });
              res.end(imageData);
            } catch (fetchError) {  
              console.error(`[FETCH ERROR] Failed to fetch ${targetUrl}:`, fetchError.status || fetchError.message);
              res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end(`404 - Image not found in cache OR at http.cat (Status: ${fetchError.status || 'Error'})`);
            }
          } else {
            throw error;
          }
        }
        break;
        
      case 'PUT':
        try {
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          const imageData = Buffer.concat(chunks);
          await fs.promises.writeFile(filePath, imageData);
          res.writeHead(201, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('201 - The image has been successfully saved/updated in the cache.');
        } catch (writeError) {
          console.error('[PUT ERROR]', writeError);
          throw writeError;
        }  
        break;

      case 'DELETE':
        try {
          await fs.promises.unlink(filePath);
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('200 - The image has been successfully deleted from the cache.');
          } catch (error) {
          if (error.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 - Image not found in cache');
          } else {
            throw error;
          }
        }
        break;
        
      default:
        res.setHeader('Allow', 'GET, PUT, DELETE');
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method not allowed. Please use GET, PUT, or DELETE.');
    }

  } catch (error) {
    console.error('[SERVER ERROR]', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error.');
  }
});

server.listen(port, host, () => {
  console.log(`Proxy server is running on http://${host}:${port}`);
});