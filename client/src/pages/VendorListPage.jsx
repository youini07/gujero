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
        <div 
            className="min-h-screen text-white pb-20 relative bg-cover bg-center bg-fixed"
            style={{ backgroundImage: "url('/stores.jpg')" }}
        >
            {/* 배경을 살짝 어둡게 만들어 글씨가 잘 보이게 함 */}
            <div className="absolute inset-0 bg-black/60 z-0"></div>

            <div className="relative z-10">
                <Header />
                
                <div className="pt-20 px-4 max-w-6xl mx-auto">
                    <h1 className="text-3xl font-black mb-6 text-center text-white drop-shadow-md">입점 매장 리스트</h1>
                    <p className="text-gray-200 text-center mb-10 text-sm font-medium drop-shadow-sm">
                        머물던 시간이 멋이 되는 길. 구제로
                    </p>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 py-10 font-bold bg-black/50 rounded-lg">{error}</div>
                    ) : vendors.length === 0 ? (
                        <div className="text-center text-gray-300 py-10 bg-black/50 rounded-lg">등록된 매장이 없습니다.</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            {vendors.map((v, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => handleVendorClick(v.vendor_code)}
                                    className="bg-black/70 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden cursor-pointer hover:border-white transition-all transform hover:-translate-y-1 shadow-xl flex flex-col group"
                                >
                                    <div className="w-full aspect-[4/3] bg-gray-800 relative overflow-hidden">
                                        <img 
                                            src={`/vendors/${v.vendor_code}.jpg`} 
                                            onError={(e) => { 
                                                e.target.onerror = null; 
                                                e.target.src = '/stores.jpg'; 
                                            }}
                                            alt={v.vendor_code}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                        <div className="absolute bottom-3 left-3">
                                            <p className="text-[11px] text-gray-300 font-medium bg-black/50 px-2 py-0.5 rounded-sm backdrop-blur-md">
                                                상품 {v.cnt}개
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-4 text-center">
                                        <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">{v.vendor_code}</h2>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <BottomNav />
            </div>
        </div>
    );
}
