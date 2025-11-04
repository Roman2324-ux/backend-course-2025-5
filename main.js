const { program } = require('commander');

program
  .option('-p, --port <number>', 'port to run the server on')
  .option('-t, --target <url>', 'target server URL');

program.parse(process.argv);

const options = program.opts();

console.log('Options received:', options);