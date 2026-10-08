const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../database.sqlite');
db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='products'", (err, row) => {
    console.log(row ? row.sql : 'No products table');
});
