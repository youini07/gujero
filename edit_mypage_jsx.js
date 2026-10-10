const fs = require('fs');
let c = fs.readFileSync('client/src/pages/MyPage.jsx', 'utf8');
const searchString = `<input
                                type="text"
                                placeholder="카카오톡 고유 ID (예: kakao_1234567) 또는 로그인 ID"
                                value={promoteVendorInput}
                                onChange={(e) => setPromoteVendorInput(e.target.value)}
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black"
                            />`;
const replaceString = `<input
                                type="text"
                                placeholder="카카오톡 고유 ID (예: kakao_1234567) 또는 로그인 ID"
                                value={promoteVendorInput}
                                onChange={(e) => setPromoteVendorInput(e.target.value)}
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black"
                            />
                            <input
                                type="text"
                                placeholder="밴드어드민 로그인 아이디 (예: vintage1)"
                                value={promoteBandadminInput}
                                onChange={(e) => setPromoteBandadminInput(e.target.value)}
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black"
                            />`;

c = c.replace(searchString, replaceString);
fs.writeFileSync('client/src/pages/MyPage.jsx', c);
console.log('JSX updated successfully');
