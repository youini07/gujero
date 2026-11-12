/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchVendors } from '../services/api';
import { getLocalizedVendorField, normalizeLangCode } from '../services/vendorChannels';

/**
 * 입점 매장 목록 페이지 (KR / EN / TH 3개국어 지원)
 * 왜 별도 Header/BottomNav를 내부에 렌더링하지 않는가:
 * App.jsx 최상위 레이아웃에서 이미 <Header lang={lang} />와 <BottomNav lang={lang} />를 감싸고 있으므로
 * 중복 헤더 렌더링 및 언어 상태 누락을 방지합니다.
 */
export default function VendorListPage({ lang = 'KR' }) {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const normLang = normalizeLangCode(lang);

    useEffect(() => {
        const loadVendors = async () => {
            try {
                const data = await fetchVendors();
                // 상품이 0개인 빈 상점은 편집샵 목록에서 보이지 않도록 프론트엔드에서도 이중 필터링
                const nonEmptyVendors = (Array.isArray(data) ? data : []).filter(
                    (v) => Number(v?.cnt || 0) > 0
                );
                setVendors(nonEmptyVendors);
            } catch (err) {
                console.error('Failed to load vendors', err);
                setError(
                    normLang === 'TH'
                        ? 'ไม่สามารถโหลดรายชื่อร้านค้าได้'
                        : normLang === 'EN'
                            ? 'Failed to load store list.'
                            : '매장 목록을 불러오는데 실패했습니다.'
                );
            } finally {
                setLoading(false);
            }
        };
        loadVendors();
    }, [normLang]);

    const handleVendorClick = (vendorCode) => {
        // 매장을 클릭하면 선택된 언어(lang)와 vendor 파라미터를 함께 유지하여 이동
        navigate(`/?vendor=${encodeURIComponent(vendorCode)}&lang=${normLang}`);
    };

    return (
        <div className="min-h-screen pb-14 relative bg-[#F6F5F2]">
            <div className="py-6 px-4 max-w-6xl mx-auto">
                <div className="mb-5">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-[#78716C] mb-1">Partner Curators</span>
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#18181B]">
                        {normLang === 'TH' ? 'ร้านค้าพาร์ทเนอร์' : normLang === 'EN' ? 'Partner Vintage Stores' : '입점 빈티지 편집샵'}
                    </h1>
                </div>

                {loading ? (
                    <div className="flex justify-center py-14">
                        <div className="w-7 h-7 border-2 border-[#E7E5E4] border-t-[#18181B] rounded-full animate-spin"></div>
                    </div>
                ) : error ? (
                    <div className="text-center text-rose-600 py-10 font-bold text-sm">{error}</div>
                ) : vendors.length === 0 ? (
                    <div className="text-center text-[#78716C] py-12 font-semibold text-sm bg-white border border-[#E7E5E4] rounded-2xl">
                        {normLang === 'TH'
                            ? 'ยังไม่มีร้านค้าที่ลงทะเบียน'
                            : normLang === 'EN'
                                ? 'No registered stores found.'
                                : '등록된 매장이 없습니다.'}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                        {vendors.map((v, idx) => {
                            const localizedDesc = getLocalizedVendorField(v, 'description', normLang);
                            const localizedRules = getLocalizedVendorField(v, 'rules', normLang);

                            return (
                            <div
                                key={v.vendor_code || idx}
                                onClick={() => handleVendorClick(v.vendor_code)}
                                className="bg-white border border-[#E7E5E4] rounded-2xl overflow-hidden cursor-pointer hover:border-[#18181B] transition-colors flex flex-row group items-stretch h-36 md:h-44 relative"
                            >
                                <div className="w-[36%] md:w-1/3 bg-[#FAF9F6] relative overflow-hidden shrink-0 border-r border-[#E7E5E4]">
                                    <img
                                        src={v.logo_url || '/stores.jpg'}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/stores.jpg';
                                        }}
                                        alt={v.store_name || v.vendor_code}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"></div>
                                    <div className="absolute bottom-2.5 left-2.5">
                                        <p className="text-[11px] text-white font-semibold bg-black/55 px-2 py-0.5 rounded-md backdrop-blur-sm tabular-nums">
                                            {normLang === 'TH'
                                                ? `สินค้า ${v.cnt} รายการ`
                                                : normLang === 'EN'
                                                    ? `${v.cnt} Items`
                                                    : `상품 ${v.cnt}개`}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-3.5 md:p-5 pr-9 flex flex-col flex-1 overflow-hidden justify-between">
                                    <div>
                                        <h2 className="text-[17px] md:text-2xl font-extrabold text-[#18181B] tracking-tight mb-1 truncate">
                                            {v.store_name || v.vendor_code || (normLang === 'TH' ? 'ร้านค้าวินเทจ' : normLang === 'EN' ? 'Vintage Store' : '상호명 미등록')}
                                        </h2>

                                        {localizedDesc ? (
                                            <p className="text-xs md:text-sm text-[#57534E] line-clamp-2 font-medium whitespace-pre-line leading-relaxed">
                                                {localizedDesc}
                                            </p>
                                        ) : !localizedRules ? (
                                            <p className="text-xs text-[#A8A29E] mt-1">
                                                {normLang === 'TH'
                                                    ? 'ยังไม่มีคำอธิบายร้านค้า'
                                                    : normLang === 'EN'
                                                        ? 'No store description available.'
                                                        : '등록된 매장 소개가 없습니다.'}
                                            </p>
                                        ) : null}
                                    </div>

                                    {localizedRules && (
                                        <p className="text-[11px] md:text-xs text-[#78716C] line-clamp-1 pt-2 border-t border-[#F5F5F4] whitespace-pre-line">
                                            {localizedRules}
                                        </p>
                                    )}

                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E] group-hover:text-[#18181B] transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
