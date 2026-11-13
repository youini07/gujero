/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from './ProductCard';
import { fetchProducts } from '../services/api';
import { parseBrandNames, formatBrandGroupTitle } from '../services/brandGroup';

/**
 * [RecommendedBrandSection]
 * 추천 브랜드 카드 1개(단일 브랜드 또는 다중 브랜드 큐레이션 그룹)를 렌더링합니다.
 * 왜 activeSubBrand 상태를 두었는가:
 * 한 그룹 카드 안에 여러 브랜드(예: Stone Island, C.P. Company, Off-White)가 묶여 있을 때,
 * 기본으로는 그룹 전체 최신 상품을 한눈에 보여주면서도 고객이 원하는 특정 브랜드 알약 탭을 눌러
 * 카드 안에서 즉시 필터링해 볼 수 있도록 하기 위함입니다.
 */
const RecommendedBrandSection = ({ brand, lang, isAdmin, todayOrders }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSubBrand, setActiveSubBrand] = useState('ALL');
    const [, setSearchParams] = useSearchParams();

    const brandList = useMemo(() => parseBrandNames(brand.brand_name), [brand.brand_name]);
    const isMultiBrand = brandList.length >= 2;
    const joinedBrands = brandList.join(',');

    // 카드의 브랜드 목록이 바뀌면 서브 필터를 전체(ALL)로 초기화
    useEffect(() => {
        setActiveSubBrand('ALL');
    }, [joinedBrands]);

    useEffect(() => {
        if (!joinedBrands) {
            setProducts([]);
            setLoading(false);
            return;
        }

        let isCancelled = false;
        const loadProducts = async () => {
            setLoading(true);
            try {
                const targetBrandQuery = activeSubBrand === 'ALL' ? joinedBrands : activeSubBrand;
                const targetLimit = isMultiBrand && activeSubBrand === 'ALL' ? 12 : 8;

                const data = await fetchProducts({
                    brand: targetBrandQuery,
                    page: 1,
                    limit: targetLimit,
                });
                if (!isCancelled) {
                    setProducts(data?.data || []);
                }
            } catch (err) {
                console.error('Failed to load products for brand group', brand.brand_name, err);
                if (!isCancelled) setProducts([]);
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };
        loadProducts();

        return () => {
            isCancelled = true;
        };
    }, [joinedBrands, activeSubBrand, isMultiBrand, brand.brand_name]);

    // 언어에 맞는 설명 선택
    const description =
        lang === 'TH'
            ? brand.description_th || brand.description_en || brand.description_kr
            : lang === 'EN'
              ? brand.description_en || brand.description_kr
              : brand.description_kr;

    const viewAllLabel = lang === 'TH' ? 'ดูทั้งหมด' : lang === 'EN' ? 'View All' : '전체보기';
    const allTabLabel = lang === 'TH' ? 'ทั้งหมด' : lang === 'EN' ? 'All' : '전체';
    const emptyLabel =
        lang === 'TH'
            ? 'ยังไม่มีสินค้าในขณะนี้'
            : lang === 'EN'
              ? 'No products available right now.'
              : '등록된 상품이 없습니다.';

    const displayTitle = formatBrandGroupTitle(brandList) || brand.brand_name;

    const handleViewAll = () => {
        const nextParams = { brand: joinedBrands || brand.brand_name };
        if (brand.group_name && isMultiBrand) {
            nextParams.group = brand.group_name;
        }
        setSearchParams(nextParams);
    };

    return (
        <div className="mb-12 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group">
            {/* 히어로 & 로고 영역 */}
            <div className="relative h-64 md:h-80 w-full bg-gray-100 overflow-hidden">
                {brand.hero_image_url ? (
                    <img
                        src={brand.hero_image_url}
                        alt={displayTitle}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center px-6 text-center text-gray-300 font-bold tracking-widest text-xl md:text-2xl">
                        {displayTitle}
                    </div>
                )}
                {/* 오버레이 그라데이션 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></div>

                {/* 로고 & 타이틀 정보 */}
                <div className="absolute bottom-0 left-0 w-full p-5 md:p-6 flex items-end gap-4">
                    {brand.logo_url && (
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-full p-2 shadow-xl shrink-0">
                            <img
                                src={brand.logo_url}
                                alt="logo"
                                className="w-full h-full object-contain rounded-full"
                            />
                        </div>
                    )}
                    <div className="text-white flex-1 min-w-0">
                        <h3
                            className={`${
                                isMultiBrand
                                    ? 'text-xl sm:text-2xl md:text-3xl leading-snug'
                                    : 'text-3xl md:text-4xl'
                            } font-black mb-1.5 tracking-wide drop-shadow-md break-words`}
                        >
                            {displayTitle}
                        </h3>
                        {description && (
                            <p className="text-xs sm:text-sm md:text-base text-gray-200 line-clamp-2 md:line-clamp-3 leading-relaxed drop-shadow-md">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleViewAll}
                        className="shrink-0 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white border border-white/50 px-4 py-2 md:px-5 md:py-2.5 rounded-full font-bold transition flex items-center gap-1 text-xs md:text-sm shadow-lg"
                    >
                        {viewAllLabel}
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.5"
                                d="M9 5l7 7-7 7"
                            ></path>
                        </svg>
                    </button>
                </div>
            </div>

            {/* 상품 가로 스크롤 영역 */}
            <div className="p-6 bg-gray-50/50">
                {/* 다중 브랜드 그룹일 때만 노출되는 인라인 브랜드 필터 탭 */}
                {isMultiBrand && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 hide-scrollbar">
                        <button
                            type="button"
                            onClick={() => setActiveSubBrand('ALL')}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition ${
                                activeSubBrand === 'ALL'
                                    ? 'bg-black text-white border-black shadow-sm'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-black hover:text-black'
                            }`}
                        >
                            {allTabLabel} ({brandList.length})
                        </button>
                        {brandList.map((bName) => (
                            <button
                                key={bName}
                                type="button"
                                onClick={() => setActiveSubBrand(bName)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition ${
                                    activeSubBrand === bName
                                        ? 'bg-black text-white border-black shadow-sm'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-black hover:text-black'
                                }`}
                            >
                                {bName}
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="flex gap-4 overflow-hidden">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="min-w-[160px] md:min-w-[200px] h-64 bg-gray-200 animate-pulse rounded-lg shrink-0"
                            ></div>
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-sm text-gray-400 py-8 text-center border border-dashed rounded-lg">
                        {emptyLabel}
                    </div>
                ) : (
                    <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 snap-x hide-scrollbar">
                        {products.map((p) => (
                            <div
                                key={p.code}
                                className="min-w-[160px] w-[160px] md:min-w-[220px] md:w-[220px] shrink-0 snap-start"
                            >
                                <ProductCard
                                    product={p}
                                    lang={lang}
                                    isAdmin={isAdmin}
                                    todayOrders={todayOrders}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const RecommendedBrandsList = ({ lang, isAdmin, todayOrders }) => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBrands = async () => {
            try {
                const res = await fetch('/api/recommended_brands');
                const data = await res.json();
                if (data.success) {
                    setBrands(data.brands || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadBrands();
    }, []);

    if (loading) {
        return (
            <div className="py-20 text-center text-gray-500 animate-pulse">
                Loading Recommended Brands...
            </div>
        );
    }

    if (brands.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 animate-fade-in">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-100">
                    <svg
                        className="w-10 h-10 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        ></path>
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">브랜드를 선택해주세요</h3>
                <p className="text-sm text-gray-400 max-w-xs text-center">
                    왼쪽 사이드바에서 원하시는 브랜드를 선택하여 상품을 확인해보세요.
                </p>
            </div>
        );
    }

    // 그룹별 묶기
    const grouped = {};
    brands.forEach((b) => {
        const groupKey = (b.group_name || '').trim();
        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(b);
    });

    return (
        <div className="animate-fade-in pb-12">
            {Object.keys(grouped).map((groupName) => (
                <div key={groupName} className="mb-16">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 mb-6 border-b-2 border-black pb-2 inline-block">
                        {groupName}
                    </h2>
                    <div className="space-y-8">
                        {grouped[groupName].map((brand) => (
                            <RecommendedBrandSection
                                key={brand.id}
                                brand={brand}
                                lang={lang}
                                isAdmin={isAdmin}
                                todayOrders={todayOrders}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default RecommendedBrandsList;
