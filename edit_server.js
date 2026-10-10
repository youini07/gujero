const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

// 1. Add column if not exists
const schemaRegex = /CREATE TABLE IF NOT EXISTS customers \([\s\S]*?\)(?=;|, \(err\))/;
const schemaMatch = c.match(schemaRegex);
if (schemaMatch && !schemaMatch[0].includes('bandadmin_id')) {
    // Actually, we can just run an ALTER TABLE right after the creation
    const alterTableSQL = `
                        db.run("ALTER TABLE customers ADD COLUMN bandadmin_id TEXT DEFAULT ''", (err) => {
                            if (err && !err.message.includes('duplicate column')) console.log('[DB] bandadmin_id 컬럼 추가 에러 무시 (이미 존재):', err.message);
                        });`;
    // Find where the customers table is created and insert it after
    const createCustomersRegex = /(CREATE TABLE IF NOT EXISTS customers \([\s\S]*?\)\s*`, \(err\) => \{[\s\S]*?\}\);)/;
    c = c.replace(createCustomersRegex, `$1${alterTableSQL}`);
}

// 2. Update promote-vendor
const promoteRegex = /app\.put\('\/api\/admin\/promote-vendor', \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true \}\);\s*\}\);\s*\}\);/;
const promoteReplacement = `app.put('/api/admin/promote-vendor', (req, res) => {
    const { loginId, bandadminId } = req.body;
    if (!loginId || !bandadminId) return res.status(400).json({ error: 'MISSING', message: '카카오 ID와 밴드어드민 ID를 모두 입력해주세요.' });

    const query = \`UPDATE customers SET role = 'vendor', bandadmin_id = ? WHERE login_id = ?\`;
    db.run(query, [bandadminId.trim(), loginId.trim()], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'NOT_FOUND', message: '가입되지 않은 아이디입니다. 먼저 홈페이지 회원가입을 유도해주세요.' });
        res.json({ success: true });
    });
});`;
c = c.replace(promoteRegex, promoteReplacement);

// 3. Update GET /api/vendor/products/:loginId
const getVendorProductsRegex = /app\.get\('\/api\/vendor\/products\/:loginId', \(req, res\) => \{[\s\S]*?res\.json\(\{ products: rows \}\);\s*\}\);\s*\}\);/;
const getVendorProductsReplacement = `app.get('/api/vendor/products/:loginId', (req, res) => {
    const { loginId } = req.params;
    db.get('SELECT bandadmin_id FROM customers WHERE login_id = ?', [loginId], (err, customer) => {
        if (err) return res.status(500).json({ error: err.message });
        const bandadminId = (customer && customer.bandadmin_id) ? customer.bandadmin_id : loginId;
        db.all(\`
            SELECT p.*, IFNULL(d.discount_rate, 0) as discount_rate 
            FROM products p 
            LEFT JOIN discount_products d ON p.code = d.product_code 
            WHERE p.vendor_code = ? 
            ORDER BY p.arrival_date DESC
        \`, [bandadminId], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ products: rows });
        });
    });
});`;
c = c.replace(getVendorProductsRegex, getVendorProductsReplacement);

// 4. Update PUT /api/vendor/products/:code
const putVendorProductsRegex = /app\.put\('\/api\/vendor\/products\/:code', \(req, res\) => \{[\s\S]*?const \{ loginId, price, stock \} = req\.body;[\s\S]*?db\.get\('SELECT vendor_code FROM products WHERE code = \?', \[code\], \(err, row\) => \{[\s\S]*?if \(row\.vendor_code !== loginId\) return res\.status\(403\)[\s\S]*?res\.json\(\{ success: true \}\);\s*\}\);\s*\}\);\s*\}\);/;
const putVendorProductsReplacement = `app.put('/api/vendor/products/:code', (req, res) => {
    const { code } = req.params;
    const { loginId, price, stock } = req.body;

    if (!loginId) return res.status(403).json({ error: 'UNAUTHORIZED', message: '권한이 없습니다.' });

    db.get('SELECT bandadmin_id FROM customers WHERE login_id = ?', [loginId], (err, customer) => {
        if (err) return res.status(500).json({ error: err.message });
        const bandadminId = (customer && customer.bandadmin_id) ? customer.bandadmin_id : loginId;

        db.get('SELECT vendor_code FROM products WHERE code = ?', [code], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'NOT_FOUND', message: '상품을 찾을 수 없습니다.' });
            if (row.vendor_code !== bandadminId) return res.status(403).json({ error: 'FORBIDDEN', message: '본인의 상품만 수정할 수 있습니다.' });

            db.run('UPDATE products SET price = ?, stock = ? WHERE code = ?', [price, stock, code], function(err2) {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true });
            });
        });
    });
});`;
c = c.replace(putVendorProductsRegex, putVendorProductsReplacement);

// 5. Update GET /api/products/:code where it joins customers
// Currently it's: LEFT JOIN customers c ON p.vendor_code = c.login_id
// It should be: LEFT JOIN customers c ON p.vendor_code = c.bandadmin_id
const productCodeRegex = /LEFT JOIN customers c ON p\.vendor_code = c\.login_id/g;
c = c.replace(productCodeRegex, 'LEFT JOIN customers c ON p.vendor_code = c.bandadmin_id');

fs.writeFileSync('server/index.js', c);
console.log('server/index.js updated successfully');
