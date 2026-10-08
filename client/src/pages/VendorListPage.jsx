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
            className="min-h-screen pb-20 relative bg-gray-50"
            
        >
            

            <div className="relative z-10">
                <Header />
                
                <div className="pt-20 px-4 max-w-6xl mx-auto">

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-600 py-10 font-bold">{error}</div>
                    ) : vendors.length === 0 ? (
                        <div className="text-center text-gray-800 py-10 font-bold">등록된 매장이 없습니다.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5">
                            {vendors.map((v, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => handleVendorClick(v.vendor_code)}
                                    className="bg-white/90 backdrop-blur-md border border-gray-300 rounded-2xl overflow-hidden cursor-pointer hover:border-black transition-all shadow-xl flex flex-row group items-stretch h-40 md:h-48 relative"
                                >
                                    <div className="w-2/5 md:w-1/3 bg-gray-200 relative overflow-hidden shrink-0">
                                        <img 
                                            src={v.logo_url || '/stores.jpg'} 
                                            onError={(e) => { 
                                                e.target.onerror = null; 
                                                e.target.src = '/stores.jpg'; 
                                            }}
                                            alt={v.store_name || v.vendor_code}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60"></div>
                                        <div className="absolute bottom-3 left-3">
                                            <p className="text-[11px] text-gray-200 font-medium bg-black/50 px-2 py-0.5 rounded-sm backdrop-blur-md">
                                                상품 {v.cnt}개
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-4 md:p-5 flex flex-col flex-1 overflow-hidden">
                                        <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight mb-1 truncate">
                                            {v.store_name || v.vendor_code}
                                        </h2>
                                        
                                        <div className="flex-1 overflow-hidden flex flex-col justify-center">
                                            {v.description && (
                                                <p className="text-sm md:text-base text-gray-700 line-clamp-2 mb-1 font-medium whitespace-pre-line">
                                                    {v.description}
                                                </p>
                                            )}
                                            {v.rules && (
                                                <p className="text-xs md:text-sm text-gray-500 line-clamp-2 mt-1 pt-1 border-t border-gray-200 whitespace-pre-line">
                                                    {v.rules}
                                                </p>
                                            )}
                                            {!v.description && !v.rules && (
                                                <p className="text-sm text-gray-400 italic mt-1">
                                                    등록된 매장 소개가 없습니다.
                                                </p>
                                            )}
                                        </div>
                                        <div className="absolute right-4 bottom-4 text-gray-400 group-hover:text-black transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
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
