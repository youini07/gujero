const fs = require('fs'); const content = fs.readFileSync('server/index.js'); console.log(content.slice(1539*100, 1545*100).toString());
