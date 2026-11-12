/* Lucian UX/UI Prompt #041 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#041 */
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getTranslation } from '../services/i18n';

const IconRecommend = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.5l2.85 5.78 6.38.93-4.62 4.5 1.09 6.36L12 17.06l-5.7 3.01 1.09-6.36-4.62-4.5 6.38-.93L12 2.5z" />
    </svg>
);

const IconVendor = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z" />
    </svg>
);

const IconBrand = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <circle cx="7" cy="7" r="1.2" fill="currentColor" />
    </svg>
);

const IconCategory = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
);

const IconLounge = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.8" />
        <path d="M4.5 20c.9-3.8 3.8-5.8 7.5-5.8s6.6 2 7.5 5.8" />
    </svg>
);

/**
 * 구제로(Gujero) 하단 내비게이션 — Lucian #041 (홈 파인 하단 탭 바) 포트
 * 왜 스프링 노치 탭 바를 적용했는가:
 * 모바일/PC 공통 하단 5개 핵심 동선(추천·매장·브랜드·카테고리·마이페이지)에서
 * 현재 위치를 명확히 드러내고 375px 화면에서도 넉넉한 터치 영역을 확보하기 위함입니다.
 */
const BottomNav = ({ lang }) => {
    const location = useLocation();
    const navRef = useRef(null);
    const liRefs = useRef([]);
    const springRef = useRef({ x: 0, v: 0, target: 0, raf: 0, ready: false });

    const getActiveTab = () => {
        const path = location.pathname;
        if (path.startsWith('/brand') || (path === '/' && location.search.includes('brand='))) return 'brand';
        if (path.startsWith('/category')) return 'category';
        if (path.startsWith('/mypage') || path.startsWith('/orders') || path.startsWith('/login')) return 'lounge';
        if (path.startsWith('/vendors') || (path === '/' && location.search.includes('vendor='))) return 'vendor';
        if (path === '/') return 'recommend';
        return '';
    };

    const activeTab = getActiveTab();

    const tabs = [
        { id: 'recommend', label: getTranslation(lang, 'bottom_nav_recommend'), path: '/', Icon: IconRecommend },
        { id: 'vendor', label: getTranslation(lang, 'bottom_nav_vendor') || (lang === 'TH' ? 'ร้านค้า' : lang === 'EN' ? 'Stores' : '매장'), path: '/vendors', Icon: IconVendor },
        { id: 'brand', label: getTranslation(lang, 'bottom_nav_brand') || '브랜드', path: '/brand', Icon: IconBrand },
        { id: 'category', label: getTranslation(lang, 'bottom_nav_category') || '카테고리', path: '/category', Icon: IconCategory },
        { id: 'lounge', label: getTranslation(lang, 'bottom_nav_mypage') || '마이페이지', path: '/mypage', Icon: IconLounge },
    ];

    useEffect(() => {
        const syncNotch = (immediate = false) => {
            const root = navRef.current;
            const idx = tabs.findIndex((t) => t.id === activeTab);
            if (!root || idx < 0 || !liRefs.current[idx]) return;
            const el = liRefs.current[idx];
            const target = el.offsetLeft + el.offsetWidth / 2;
            if (!target) return;

            const st = springRef.current;
            st.target = target;
            const rm = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

            if (immediate || rm || !st.ready) {
                st.ready = true;
                st.x = target;
                st.v = 0;
                if (st.raf) {
                    cancelAnimationFrame(st.raf);
                    st.raf = 0;
                }
                root.style.setProperty('--x', `${target.toFixed(2)}px`);
                return;
            }

            const step = () => {
                const a = (st.target - st.x) * 0.16 - st.v * 0.42;
                st.v += a;
                st.x += st.v;
                root.style.setProperty('--x', `${st.x.toFixed(2)}px`);
                if (Math.abs(st.target - st.x) > 0.3 || Math.abs(st.v) > 0.3) {
                    st.raf = requestAnimationFrame(step);
                } else {
                    st.x = st.target;
                    st.v = 0;
                    st.raf = 0;
                    root.style.setProperty('--x', `${st.x.toFixed(2)}px`);
                }
            };
            if (!st.raf) st.raf = requestAnimationFrame(step);
        };

        syncNotch(false);
        const onResize = () => syncNotch(true);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            if (springRef.current.raf) {
                cancelAnimationFrame(springRef.current.raf);
                springRef.current.raf = 0;
            }
        };
    }, [activeTab]);

    return (
        <nav
            ref={navRef}
            className={`u041-nav max-w-[600px] sm:landscape:max-w-[900px] md:max-w-[900px] lg:max-w-[1200px] ${
                !activeTab ? 'no-active' : ''
            }`}
            aria-label="구제로 하단 메뉴"
        >
            <div className="u041-bar" aria-hidden="true" />
            <span className="u041-bub" aria-hidden="true" />
            <ul className="u041-tabs">
                {tabs.map((tab, idx) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <li key={tab.id} ref={(el) => { liRefs.current[idx] = el; }}>
                            <Link
                                to={`${tab.path}${tab.path.includes('?') ? '&' : '?'}lang=${lang}`}
                                aria-current={isActive ? 'page' : undefined}
                                className="u041-tab"
                            >
                                <span className="u041-ic" aria-hidden="true">
                                    <tab.Icon />
                                </span>
                                <span className="u041-lab">{tab.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default BottomNav;
