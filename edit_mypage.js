const fs = require('fs');
let c = fs.readFileSync('client/src/pages/MyPage.jsx', 'utf8');

const regex1 = /const \[promoteVendorInput, setPromoteVendorInput\] = useState\(''\);[\s\S]*?const handlePromoteVendor = async \(\) => \{[\s\S]*?catch \(err\) \{[\s\S]*?alert\('서버와 통신 중 오류가 발생했습니다\.'\);\s*\}\s*\};/;

const replace1 = `const [promoteVendorInput, setPromoteVendorInput] = useState('');
    const [promoteBandadminInput, setPromoteBandadminInput] = useState('');
    const handlePromoteVendor = async () => {
        if (!promoteVendorInput.trim() || !promoteBandadminInput.trim()) return alert('카카오톡 고유 ID와 밴드어드민 ID를 모두 입력해주세요.');
        if (!confirm(\`[\${promoteVendorInput}] 계정을 밴드어드민 ID [\${promoteBandadminInput}] 상호로 승격하시겠습니까?\`)) return;

        try {
            const res = await fetch('/api/admin/promote-vendor', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginId: promoteVendorInput, bandadminId: promoteBandadminInput })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(\`성공적으로 승격되었습니다!\\n이제 해당 계정으로 로그인하면 [\${promoteBandadminInput}] 상품을 관리할 수 있습니다.\`);
                setPromoteVendorInput('');
                setPromoteBandadminInput('');
            } else {
                alert('승격 실패: ' + (data.message || data.error));
            }
        } catch (err) {
            console.error('Promote vendor error:', err);
            alert('서버와 통신 중 오류가 발생했습니다.');
        }
    };`;

c = c.replace(regex1, replace1);

const regex2 = /<input\s+type="text"\s+placeholder="카카오톡 고유 ID[^>]*>\s*<button[^>]*>\s*승격하기\s*<\/button>\s*<\/div>\s*<p className="text-xs text-gray-400 mt-2">\s*회원가입된 계정의 ID를 입력하고 승격하면, 해당 사용자는 자신의 상품을 관리할 수 있는 권한을 얻게 됩니다\.\s*<\/p>/m;

const replace2 = `<input
                                type="text"
                                placeholder="카카오톡 ID (예: kakao_1234)"
                                value={promoteVendorInput}
                                onChange={(e) => setPromoteVendorInput(e.target.value)}
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black"
                            />
                            <input
                                type="text"
                                placeholder="밴드어드민 아이디 (예: vintage1)"
                                value={promoteBandadminInput}
                                onChange={(e) => setPromoteBandadminInput(e.target.value)}
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black"
                            />
                            <button 
                                onClick={handlePromoteVendor} 
                                className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors shrink-0 whitespace-nowrap"
                            >
                                승격하기
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            카카오톡 ID와 밴드어드민 ID를 입력하고 승격하면, 해당 사용자는 자신의 밴드어드민 ID로 등록된 상품을 관리할 수 있는 권한을 얻게 됩니다.
                        </p>`;

c = c.replace(regex2, replace2);

fs.writeFileSync('client/src/pages/MyPage.jsx', c);
console.log('MyPage.jsx updated successfully');
