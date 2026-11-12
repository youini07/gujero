import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getTranslation } from '../services/i18n';

const RecommendPage = ({ lang }) => {
    const [themes, setThemes] = useState([]);
    const [iconicLooks, setIconicLooks] = useState([]);
    const [mainBanners, setMainBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeBannerIdx, setActiveBannerIdx] = useState(0);
    const bannerCarouselRef = useRef(null);

    useEffect(() => {
        // 백엔드에서 활성화된 테마 및 각 테마에 해당하는 상품 불러오기
        const fetchData = async () => {
            try {
                // 1. 배너 목록 가져오기 (캐싱 방지를 위해 timestamp 추가)
                const bannerRes = await fetch(`/api/main_banners?t=${Date.now()}`);
                const bannerData = await bannerRes.json();
                if (bannerData.success) {
                    setMainBanners(bannerData.banners);
                }

                const res = await fetch('/api/themes');
                const data = await res.json();
                
                if (data.success && data.themes.length > 0) {
                    // 2. 각 테마별로 필터에 맞는 상품 가져오기
                    const themesWithProducts = await Promise.all(data.themes.map(async (theme) => {
                        // 왜: 테마 모드에 따라 다른 쿼리를 사용
                        // 'recent': 최근 업로드 N개 (필터 무시, 최신순 정렬)
                        // 'filter': 기존 필터 조건에 맞는 상품 검색
                        const limit = theme.max_items || 10;
                        let query;
                        
                        if (theme.filter_mode === 'recent') {
                            // 최근 업로드 모드: 재고 있는 상품 중 최신순으로 N개
                            query = `/api/products?limit=${limit}&stock_status=in_stock&sort=0`;
                        } else {
                            // 필터 모드: 기존 필터 조건 적용
                            query = `/api/products?limit=${limit}&stock_status=in_stock`;
                            if (theme.filter_gender) query += `&gender=${encodeURIComponent(theme.filter_gender)}`;
                            if (theme.filter_upper_category) query += `&upper_category=${encodeURIComponent(theme.filter_upper_category)}`;
                            if (theme.filter_category) query += `&category=${encodeURIComponent(theme.filter_category)}`;
                            if (theme.filter_brand) query += `&brand=${encodeURIComponent(theme.filter_brand)}`;
                            if (theme.filter_season) query += `&season=${encodeURIComponent(theme.filter_season)}`;
                        }
                        
                        const pRes = await fetch(query);
                        const pData = await pRes.json();
                        
                        return {
                            ...theme,
                            products: pData.data || []
                        };
                    }));
                    // 상품이 있는 테마만 노출 필터링
                    const themesWithProductsFiltered = themesWithProducts.filter(t => t.products.length > 0);
                    
                    // 3. Iconic Looks 가져오기
                    const iconicRes = await fetch(`/api/iconic_looks`);
                    const iconicData = await iconicRes.json();
                    let fetchedIconicLooks = [];
                    if (iconicData.success && iconicData.items && iconicData.items.length > 0) {
                        fetchedIconicLooks = iconicData.items;
                    }
                    
                    // 설정에서 Iconic Look 섹션 순서 가져오기
                    const setRes = await fetch('/api/settings/iconic_look_section_order');
                    const setData = await setRes.json();
                    const iconicSectionOrder = (setData.success && setData.value) ? Number(setData.value) : 0;
                    
                    let allBlocks = themesWithProductsFiltered.map(t => ({ type: 'theme', data: t, sort_order: t.sort_order || 0 }));
                    if (fetchedIconicLooks.length > 0) {
                        allBlocks.push({ type: 'iconic', data: fetchedIconicLooks, sort_order: iconicSectionOrder });
                    }
                    allBlocks.sort((a, b) => a.sort_order - b.sort_order);
                    
                    setThemes(allBlocks);
                } else {
                    // 테마가 하나도 없을 때도 Iconic Look은 표시될 수 있음
                    const iconicRes = await fetch(`/api/iconic_looks`);
                    const iconicData = await iconicRes.json();
                    if (iconicData.success && iconicData.items && iconicData.items.length > 0) {
                        const setRes = await fetch('/api/settings/iconic_look_section_order');
                        const setData = await setRes.json();
                        const iconicSectionOrder = (setData.success && setData.value) ? Number(setData.value) : 0;
                        setThemes([{ type: 'iconic', data: iconicData.items, sort_order: iconicSectionOrder }]);
                    } else {
                        setThemes([]);
                    }
                }
            } catch (err) {
                console.error("데이터를 불러오는 중 오류 발생:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // 스크롤 숨기기를 위한 스타일
    const hideScrollbarStyle = {
        msOverflowStyle: 'none',  // IE and Edge
        scrollbarWidth: 'none',  // Firefox
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#E7E5E4] border-t-[#18181B]"></div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col pb-8 bg-white">
            {/* 상단 메인 배너 영역 (동적 멀티 배너) */}
            {mainBanners.length === 0 ? (
                // Fallback: 배너가 없을 경우 에디토리얼 기본 배너 유지
                <div className="w-full bg-[#FAF9F6] aspect-[16/9] md:aspect-[21/9] mb-8 flex flex-col justify-center items-center px-4 relative overflow-hidden border-b border-[#E7E5E4]">
                    <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=800&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover" alt="banner" />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="relative z-20 text-white text-center">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-[0.28em] text-white/80 mb-1.5">Curated Vintage</span>
                        <h2 className="text-2xl md:text-4xl font-extrabold mb-2 uppercase tracking-[0.14em]">New Arrivals</h2>
                        <p className="text-xs md:text-sm font-medium text-white/90">{getTranslation(lang, 'new_arrivals_subtitle')}</p>
                    </div>
                </div>
            ) : (
                <div className="relative w-full aspect-[16/9] md:aspect-[21/9] mb-8 overflow-hidden bg-[#FAF9F6] border-b border-[#E7E5E4] group">
                    <div 
                        ref={bannerCarouselRef}
                        className="banner-carousel-track absolute inset-0 flex overflow-x-auto snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        onScroll={(e) => {
                            const scrollLeft = e.target.scrollLeft;
                            const width = e.target.offsetWidth;
                            if (width > 0) setActiveBannerIdx(Math.round(scrollLeft / width));
                        }}
                    >
                        {/* 왜 전용 클래스에만 스크롤 숨김을 적용하는가: 전역 .flex 스크롤바가 전부 사라지는 부작용을 막기 위함 */}
                        <style>{`.banner-carousel-track::-webkit-scrollbar { display: none; }`}</style>
                        {mainBanners.map((banner) => {
                            const content = (
                                <div className="relative w-full h-full">
                                    <img src={banner.image_url} alt={banner.title || '배너'} className="absolute inset-0 w-full h-full object-cover" />
                                    {(banner.title || banner.subtitle) && <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none" />}
                                    <div className="relative z-20 text-white h-full flex flex-col justify-center items-center text-center px-6 pointer-events-none">
                                        {banner.title && <h2 className="text-2xl md:text-4xl font-extrabold mb-2 uppercase tracking-[0.12em] leading-tight">{banner.title}</h2>}
                                        {banner.subtitle && <p className="text-xs md:text-base font-medium text-white/90">{banner.subtitle}</p>}
                                    </div>
                                </div>
                            );

                            if (banner.link_url) {
                                if (banner.link_url.startsWith('http')) {
                                    return <a href={banner.link_url} key={banner.id} className="block flex-none w-full h-full snap-center">{content}</a>;
                                }
                                return <Link to={banner.link_url} key={banner.id} className="block flex-none w-full h-full snap-center">{content}</Link>;
                            }

                            return <div key={banner.id} className="block flex-none w-full h-full snap-center">{content}</div>;
                        })}
                    </div>

                    {/* 캐러셀 인디케이터 */}
                    {mainBanners.length > 1 && (
                        <div className="absolute bottom-3.5 left-0 right-0 z-30 flex justify-center gap-1.5 pointer-events-none">
                            {mainBanners.map((_, idx) => (
                                <div 
                                    key={idx}
                                    className={`h-1 rounded-full transition-all duration-300 ${
                                        activeBannerIdx === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/45'
                                    }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* 데스크탑 좌우 이동 화살표 (md 이상) */}
                    {mainBanners.length > 1 && (
                        <>
                            <button 
                                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 border border-[#E7E5E4] rounded-full items-center justify-center text-[#18181B] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-30"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (bannerCarouselRef.current) {
                                        bannerCarouselRef.current.scrollBy({ left: -bannerCarouselRef.current.offsetWidth, behavior: 'smooth' });
                                    }
                                }}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button 
                                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 border border-[#E7E5E4] rounded-full items-center justify-center text-[#18181B] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-30"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (bannerCarouselRef.current) {
                                        bannerCarouselRef.current.scrollBy({ left: bannerCarouselRef.current.offsetWidth, behavior: 'smooth' });
                                    }
                                }}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* 테마 리스트 렌더링 (Iconic + 일반 테마 통합) */}
            {themes.length === 0 ? (
                <div className="text-center text-[#78716C] mt-10 text-sm">
                    {getTranslation(lang, 'no_recommend_themes')}
                </div>
            ) : (
                themes.map((block, index) => {
                    if (block.type === 'iconic') {
                        const iconicItems = block.data;
                        return (
                            <div key={`iconic-${index}`} className="w-full mb-11 pl-4">
                                {/* 왜 손글씨 Caveat 테두리를 에디토리얼 타이포그래피로 교체했는가: 빈티지 큐레이션 편집샵의 정돈된 가독성과 브랜드 신뢰감을 높이기 위함 */}
                                <div className="flex justify-between items-end pr-4 mb-4">
                                    <div>
                                        <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-[#78716C] mb-0.5">Style Reference</span>
                                        <h3 className="text-[18px] md:text-[21px] font-extrabold tracking-tight text-[#18181B]">
                                            Celeb Iconic Look
                                        </h3>
                                    </div>
                                </div>
                                
                                <div className="relative group w-full">
                                    <button 
                                        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -ml-2 w-9 h-9 bg-white/95 border border-[#E7E5E4] rounded-full items-center justify-center text-[#18181B] opacity-0 group-hover:opacity-100 transition-all hover:border-[#18181B] z-20"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            document.getElementById(`iconic-scroll-${index}`).scrollBy({ left: -400, behavior: 'smooth' });
                                        }}
                                    >
                                        <svg className="w-4 h-4 pr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>

                                    <div 
                                        id={`iconic-scroll-${index}`}
                                        className="theme-scroll flex overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory gap-3.5"
                                        style={hideScrollbarStyle}
                                    >
                                    {iconicItems.map(item => {
                                        const getSafeImgUrl = (urlStr) => {
                                            if (!urlStr) return '';
                                            if (typeof urlStr === 'string' && urlStr.startsWith('[')) {
                                                try {
                                                    const arr = JSON.parse(urlStr);
                                                    if (Array.isArray(arr) && arr.length > 0) {
                                                        const mainImg = arr.find(img => typeof img === 'string' && img.toLowerCase().includes('main'));
                                                        return mainImg || arr[0];
                                                    }
                                                } catch(e) {}
                                            }
                                            return urlStr;
                                        };

                                        const pImg = getSafeImgUrl(item.nukki_url) || getSafeImgUrl(item.p_image) || getSafeImgUrl(item.thumbnail_url) || getSafeImgUrl(item.product_images) || '/static/nophoto.png';
                                        const cacheBuster = `v=${new Date().toISOString().split('T')[0]}`;
                                        
                                        return (
                                            <Link 
                                                key={item.id} 
                                                to={`/product/${item.product_code}?lang=${lang}`}
                                                className="snap-start flex-none w-[276px] md:w-[320px] bg-white border border-[#E7E5E4] rounded-xl overflow-hidden flex group hover:border-[#18181B]/40 transition-colors cursor-pointer"
                                                style={{ height: '268px' }}
                                            >
                                                <div className="w-1/2 h-full bg-[#FAF9F6] relative overflow-hidden border-r border-[#E7E5E4]">
                                                    <img src={item.image_url} alt={item.tags || "Iconic Look"} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    {item.tags && <span className="sr-only">{item.tags}</span>}
                                                </div>
                                                <div className="w-1/2 h-full p-3 flex flex-col items-center justify-between bg-white relative">
                                                    <div className="flex-1 w-full flex items-center justify-center p-2">
                                                        <img 
                                                            src={pImg.startsWith('http') || pImg.startsWith('/static') ? pImg : `/static/thumbnails/${item.product_code}.jpg?${cacheBuster}`}
                                                            alt={item.name_en || item.name} 
                                                            className="max-w-full max-h-full object-contain"
                                                            onError={(e) => { e.target.src = '/static/nophoto.png'; }}
                                                        />
                                                    </div>
                                                    <div className="w-full text-left pt-2 border-t border-[#F5F5F4]">
                                                        <p className="text-[10px] font-bold text-[#78716C] uppercase tracking-[0.12em] truncate">{item.brand || 'ARCHIVE'}</p>
                                                        <p className="text-[12px] font-semibold text-[#18181B] mt-0.5 line-clamp-2 leading-snug">{lang === 'TH' ? (item.name_th || item.name_en || item.name) : lang === 'EN' ? (item.name_en || item.name) : (item.name || item.name_en)}</p>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                    </div>
                                    
                                    <button 
                                        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 -mr-2 w-9 h-9 bg-white/95 border border-[#E7E5E4] rounded-full items-center justify-center text-[#18181B] opacity-0 group-hover:opacity-100 transition-all hover:border-[#18181B] z-20"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            document.getElementById(`iconic-scroll-${index}`).scrollBy({ left: 400, behavior: 'smooth' });
                                        }}
                                    >
                                        <svg className="w-4 h-4 pl-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            </div>
                        );
                    } else if (block.type === 'theme') {
                        const theme = block.data;
                        return (
                            <div key={theme.id} className="w-full mb-11 pl-4">
                                <div className="flex justify-between items-end pr-4 mb-4">
                                    <h3 className="text-[18px] md:text-[21px] font-extrabold tracking-tight text-[#18181B]">
                                        {theme.title}
                                    </h3>
                                    <Link 
                                        to={`/?lang=${lang}&gender=${encodeURIComponent(theme.filter_gender || '')}&upper_category=${encodeURIComponent(theme.filter_upper_category || '')}&category=${encodeURIComponent(theme.filter_category || '')}&brand=${encodeURIComponent(theme.filter_brand || '')}`}
                                        className="text-[12px] text-[#78716C] font-semibold hover:text-[#18181B] transition-colors flex items-center gap-0.5 shrink-0"
                                    >
                                        <span>{getTranslation(lang, 'see_all')}</span>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </Link>
                                </div>
                                
                                {/* 좌우 화살표 및 스크롤 컨테이너를 감싸는 relative 그룹 */}
                                <div className="relative group w-full">
                                    {/* 데스크탑 좌측 화살표 */}
                                    <button 
                                        className="hidden md:flex absolute left-0 top-[38%] -translate-y-1/2 -ml-2 w-9 h-9 bg-white/95 border border-[#E7E5E4] rounded-full items-center justify-center text-[#18181B] opacity-0 group-hover:opacity-100 transition-all hover:border-[#18181B] z-20"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            document.getElementById(`theme-scroll-${theme.id}`).scrollBy({ left: -400, behavior: 'smooth' });
                                        }}
                                    >
                                        <svg className="w-4 h-4 pr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>

                                    {/* 가로 스크롤 영역 (좌우 드래그) */}
                                    <div 
                                        id={`theme-scroll-${theme.id}`}
                                        className="theme-scroll grid grid-rows-2 grid-flow-col auto-cols-max gap-x-3 gap-y-5 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory"
                                        style={hideScrollbarStyle}
                                    >
                                        <style>{`
                                            .theme-scroll::-webkit-scrollbar { display: none; }
                                        `}</style>
                                    
                                    {theme.products.map(product => {
                                        // ProductCard.jsx 와 완벽히 동일한 썸네일 표시 로직
                                        const getSafeImgUrl = (urlStr) => {
                                            if (!urlStr) return '';
                                            if (typeof urlStr === 'string' && urlStr.startsWith('[')) {
                                                try {
                                                    const arr = JSON.parse(urlStr);
                                                    if (Array.isArray(arr) && arr.length > 0) {
                                                        const mainImg = arr.find(img => typeof img === 'string' && img.toLowerCase().includes('main'));
                                                        return mainImg || arr[0];
                                                    }
                                                } catch(e) {}
                                            }
                                            return urlStr;
                                        };

                                        const cleanImageFromDb = typeof product.product_images === 'string' ? getSafeImgUrl(product.product_images) : '';
                                        const dbFallbackImg = getSafeImgUrl(product.thumbnail_url) || cleanImageFromDb || getSafeImgUrl(product.image_url) || '/static/nophoto.png';
                                        const cacheBuster = `v=${new Date().toISOString().split('T')[0]}`;
                                        const dbImgSrc = dbFallbackImg.startsWith('http') || dbFallbackImg.startsWith('/static') 
                                            ? `${dbFallbackImg}${dbFallbackImg.includes('?') ? '&' : '?'}${cacheBuster}`
                                            : dbFallbackImg;

                                        const isScheduled = !!product.arrival_date;
                                        const localThumb = isScheduled 
                                            ? `/static/thumbnails_scheduled/${product.code}.jpg?${cacheBuster}` 
                                            : `/static/thumbnails/${product.code}.jpg?${cacheBuster}`;

                                        return (
                                        <Link 
                                            key={product.code} 
                                            to={`/product/${product.code}?lang=${lang}`}
                                            className="snap-start w-[142px] md:w-[162px] flex flex-col group cursor-pointer"
                                        >
                                            {/* 왜 3:4 세로형(aspect-[3/4])으로 지정하는가: 960x1280 세로형 누끼/원본 썸네일 비율에 맞춰 추천 테마 가로 스크롤 카드 높이를 균일하게 유지하기 위함 */}
                                            <div className="w-full aspect-[3/4] bg-[#FAF9F6] border border-[#E7E5E4]/80 rounded-lg overflow-hidden relative mb-2">
                                                <img 
                                                    src={localThumb}
                                                    alt={product.name} 
                                                    className="w-full h-full object-cover block group-hover:scale-105 transition-transform duration-500"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        const fallbackImg = '/static/nophoto.png';
                                                        if (e.target.src !== dbImgSrc && !e.target.src.includes('nophoto.png')) {
                                                            e.target.src = dbImgSrc;
                                                        } else if (!e.target.src.includes('nophoto.png')) {
                                                            e.target.src = fallbackImg;
                                                        }
                                                    }}
                                                />
                                                {/* 품절 뱃지 */}
                                                {String(product.stock).toLowerCase().includes('sold') && (
                                                    <div className="absolute inset-0 bg-white/65 flex items-center justify-center">
                                                        <span className="text-[#18181B] font-extrabold tracking-wider text-xs border border-[#18181B] bg-white/90 px-2 py-1">SOLD OUT</span>
                                                    </div>
                                                )}
                                            </div>
                                            {/* 브랜드 + 출고가 + 판매가 (좌측 정렬 및 고정폭 숫자 적용) */}
                                            <div className="flex flex-col items-start px-0.5">
                                                {product.brand && (
                                                    <span className="text-[10px] font-bold text-[#78716C] uppercase tracking-[0.08em] truncate w-full">
                                                        {product.brand}
                                                    </span>
                                                )}
                                                <div className="flex items-baseline gap-1.5 mt-0.5 tabular-nums">
                                                    <span className="text-[13px] font-bold text-[#18181B]">
                                                        {getTranslation(lang, 'currency')}{Number(String(product.price).replace(/[^0-9]/g, '')).toLocaleString()}
                                                    </span>
                                                    {product.original_price && (
                                                        <span className="text-[11px] text-[#A8A29E] line-through">
                                                            {getTranslation(lang, 'currency')}{Number(String(product.original_price).replace(/[^0-9]/g, '')).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                        );
                                    })}
                                    
                                    {/* 더보기 카드 */}
                                    <Link 
                                        to={`/?lang=${lang}&gender=${encodeURIComponent(theme.filter_gender || '')}&upper_category=${encodeURIComponent(theme.filter_upper_category || '')}&category=${encodeURIComponent(theme.filter_category || '')}&brand=${encodeURIComponent(theme.filter_brand || '')}`}
                                        className="row-span-2 snap-start w-[142px] md:w-[162px] flex flex-col justify-center items-center bg-[#FAF9F6] border border-[#E7E5E4] rounded-lg hover:border-[#18181B]/40 transition-colors cursor-pointer h-[calc(100%-0.5rem)] self-center"
                                    >
                                        <div className="w-10 h-10 rounded-full border border-[#E7E5E4] flex items-center justify-center mb-2 bg-white text-[#18181B]">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M5 12h14M12 5l7 7-7 7"/>
                                            </svg>
                                        </div>
                                        <span className="text-xs font-bold text-[#57534E]">{getTranslation(lang, 'see_more')}</span>
                                    </Link>
                                </div>

                                {/* 데스크탑 우측 화살표 */}
                                <button  
                                    className="hidden md:flex absolute right-0 top-[38%] -translate-y-1/2 -mr-2 w-9 h-9 bg-white/95 border border-[#E7E5E4] rounded-full items-center justify-center text-[#18181B] opacity-0 group-hover:opacity-100 transition-all hover:border-[#18181B] z-20"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        document.getElementById(`theme-scroll-${theme.id}`).scrollBy({ left: 400, behavior: 'smooth' });
                                    }}
                                >
                                    <svg className="w-4 h-4 pl-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })
            )}
        </div>
    );
};

export default RecommendPage;
