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

const server = http.createServer(async (req, res) => {
try {
    // 1. Перевірка URL (наприклад, /200)
    if (req.url === '/') {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Please specify the HTTP code in the path (e.g., /200, /404)');
      return;
    }
    
    // 2. Формуємо ім'я файлу та шлях до нього в кеші
    // req.url -> "/200", substring(1) -> "200", + '.jpg' -> "200.jpg"
    const fileName = req.url.substring(1) + '.jpg';
    const filePath = path.join(cacheDir, fileName);

    console.log(`[REQUEST] ${req.method} ${req.url} -> ${filePath}`);

    // 3. Розподіляємо логіку за методами HTTP
    switch (req.method) {
      case 'GET':
        try {
          // Асинхронно читаємо файл з кешу
          const data = await fs.promises.readFile(filePath);
          
          // Успіх (200 OK)
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(data);

        } catch (error) {
          if (error.code === 'ENOENT') {
            // ENOENT = Помилка "No such file or directory"
            // Це означає, що файл не знайдено у кеші (404 Not Found)
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 - Image not found in cache');
          } else {
            // Інша помилка (наприклад, немає прав на читання)
            throw error; // Передаємо у загальний catch (блок 5)
          }
        }
        break;

      case 'PUT':
        // Логіка для PUT буде тут (Крок 5)
        break;

      case 'DELETE':
        // Логіка для DELETE буде тут (Крок 7)
        break;

      default:
        // 4. Обробка всіх інших методів (405 Method Not Allowed)
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.setHeader('Allow', 'GET, PUT, DELETE'); // Обов'язковий хедер для 405
        res.end('Метод не дозволено. Використовуйте GET, PUT або DELETE.');
    }

  } catch (error) {
    // 5. Загальна обробка непередбачуваних помилок (500)
    console.error('[SERVER ERROR]', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Внутрішня помилка сервера.');
  }
});

server.listen(port, host, () => {
  console.log(`Proxy server is running on http://${host}:${port}`);
});