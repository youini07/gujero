import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchVendors } from '../services/api';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function VendorListPage({ lang = 'ko' }) {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadVendors = async () => {
            try {
                const data = await fetchVendors();
                setVendors(data);
            } catch (err) {
                console.error('Failed to load vendors', err);
                setError('매장 목록을 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };
        loadVendors();
    }, []);

    const handleVendorClick = (vendorCode) => {
        // 매장을 클릭하면 카탈로그 페이지로 이동하되 vendor 파라미터를 유지
        navigate(`/?vendor=${encodeURIComponent(vendorCode)}`);
    };

    return (
        <div className="bg-[#111111] min-h-screen text-white pb-20">
            <Header />
            
            <div className="pt-20 px-4 max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 text-center text-[#ff3366]">입점 매장 리스트</h1>
                <p className="text-gray-400 text-center mb-8 text-sm">
                    {lang === 'th' ? 'เลือกสาขาที่ต้องการ' : '다양한 매장의 상품을 모아보세요.'}
                </p>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-4 border-[#ff3366] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500 py-10">{error}</div>
                ) : vendors.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">등록된 매장이 없습니다.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {vendors.map((v, idx) => (
                            <div 
                                key={idx}
                                onClick={() => handleVendorClick(v.vendor_code)}
                                className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-5 flex items-center justify-between cursor-pointer hover:border-[#ff3366] hover:bg-[#222222] transition-all transform hover:-translate-y-1 shadow-lg"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#ff3366] to-orange-500 flex items-center justify-center text-xl font-black text-white shadow-md">
                                        {v.vendor_code.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white mb-1">{v.vendor_code}</h2>
                                        <p className="text-xs text-gray-400 font-medium">등록된 상품 {v.cnt}개</p>
                                    </div>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
