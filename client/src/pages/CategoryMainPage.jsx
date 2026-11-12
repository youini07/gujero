import React from 'react';
import { Link } from 'react-router-dom';
import { getTranslation } from '../services/i18n';

const CategoryMainPage = ({ lang }) => {
    const STYLE_CATEGORIES = [
        { 
            id: 'casual', 
            name: '캐주얼 (Casual)', 
            paramKey: 'style', 
            paramVal: 'Casual,Classic Casual,Sporty Casual', 
            image: '/categories/casual_style.png'
        },
        { 
            id: 'sporty', 
            name: '스포티 & 아웃도어', 
            paramKey: 'style', 
            paramVal: 'Sports,Sportswear,Sporty,Outdoor,Functional,Gorpcore', 
            image: '/categories/sporty_style.png'
        },
        { 
            id: 'street', 
            name: '스트릿 & 빈티지', 
            paramKey: 'style', 
            paramVal: 'Streetwear,Retro,Vintage,OldSchool', 
            image: '/categories/street_style.png'
        },
        { 
            id: 'classic', 
            name: '클래식 & 미니멀', 
            paramKey: 'style', 
            paramVal: 'Classic,Contemporary,Preppy,Minimal,Chic', 
            image: '/categories/classic_style.png'
        }
    ];

    // 남/여 구분 없이 7개 카테고리 통합
    const UNIFIED_CATEGORIES = [
        { id: '상의', name: '상의', paramKey: 'upper_category', paramVal: '상의', image: '/categories/tops.png' },
        { id: '아우터', name: '아우터', paramKey: 'upper_category', paramVal: '아우터', image: '/categories/outerwear.png' },
        { id: '하의', name: '하의', paramKey: 'upper_category', paramVal: '하의', image: '/categories/bottoms.png' },
        { id: '원피스', name: '원피스', paramKey: 'upper_category', paramVal: '원피스', image: '/categories/dresses.png' },
        { id: '신발', name: '신발', paramKey: 'upper_category', paramVal: '신발', image: '/categories/shoes.png' },
        { id: '가방', name: '가방', paramKey: 'upper_category', paramVal: '가방', image: '/categories/bags.png' },
        { id: '액세서리', name: '액세서리', paramKey: 'upper_category', paramVal: '액세서리', image: '/categories/accessories.png' }
    ];

    return (
        <div className="w-full flex flex-col min-h-screen bg-white pt-3 pb-10">
            {/* 전체 상품 보기 에디토리얼 바 */}
            <div className="px-4 py-3">
                <Link 
                    to={`/?lang=${lang}&gender=&upper_category=&category=&brand=`}
                    className="w-full bg-[#FAF9F6] border border-[#E7E5E4] rounded-xl py-3.5 px-4 flex justify-between items-center text-[13px] font-bold text-[#18181B] hover:border-[#18181B] transition-colors"
                >
                    <span>{getTranslation(lang, 'view_all_products')}</span>
                    <svg className="w-4 h-4 text-[#78716C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>

            {/* 스타일 카테고리 그리드 */}
            <div className="px-4 pt-3 pb-2">
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#78716C] mb-0.5">Curated Mood</span>
                <h2 className="text-[17px] font-extrabold tracking-tight text-[#18181B]">{getTranslation(lang, '스타일별 모아보기')}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3.5 px-4 pb-6 mt-1.5">
                {STYLE_CATEGORIES.map(cat => (
                    <Link 
                        key={cat.id} 
                        to={`/?lang=${lang}&${cat.paramKey}=${encodeURIComponent(cat.paramVal)}`}
                        className="group relative flex flex-col cursor-pointer overflow-hidden rounded-xl bg-[#FAF9F6] border border-[#E7E5E4] aspect-square"
                    >
                        {cat.image ? (
                            <img 
                                src={cat.image} 
                                alt={cat.name} 
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-[#A8A29E]">
                                No Image
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent group-hover:opacity-90 transition-opacity duration-300"></div>
                        <div className="absolute bottom-3 left-3 right-3 z-10">
                            <h3 className="text-white font-extrabold text-[13px] md:text-sm tracking-tight">
                                {getTranslation(lang, cat.name)}
                            </h3>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="w-full h-px bg-[#E7E5E4] my-2"></div>

            <div className="px-4 pt-4 pb-2">
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#78716C] mb-0.5">Apparel & Goods</span>
                <h2 className="text-[17px] font-extrabold tracking-tight text-[#18181B]">{getTranslation(lang, '의류 카테고리')}</h2>
            </div>
            
            {/* 통합 카테고리 그리드: 모바일 3열, PC 4열 */}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5 md:gap-3.5 px-4 pb-8 mt-1.5">
                {UNIFIED_CATEGORIES.map(cat => (
                    <Link 
                        key={cat.id} 
                        // gender 파라미터 제외하여 남/여 모두 조회되도록 함
                        to={`/?lang=${lang}&${cat.paramKey || 'upper_category'}=${encodeURIComponent(cat.paramVal)}`}
                        className="group relative flex flex-col cursor-pointer overflow-hidden rounded-xl bg-[#FAF9F6] border border-[#E7E5E4] aspect-square"
                    >
                        {cat.image ? (
                            <img 
                                src={cat.image} 
                                alt={cat.name} 
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-[#A8A29E]">
                                No Image
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent group-hover:opacity-90 transition-opacity duration-300"></div>
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10">
                            <h3 className="text-white font-extrabold text-[12px] md:text-sm tracking-tight">
                                {getTranslation(lang, cat.name)}
                            </h3>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default CategoryMainPage;
