const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../db/database.sqlite');
db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='products'", [], (err, row) => {
    console.log(err ? err : row);
    db.all("SELECT code, vendor_code FROM products LIMIT 1", [], (err2, rows) => {
        console.log(err2 ? err2 : rows);
        db.close();
    });
});
