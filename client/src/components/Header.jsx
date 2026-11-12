/* Lucian UX/UI Prompt #212 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#212 */
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { getTranslation } from '../services/i18n';
import { fetchFilters, fetchSetting } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

/**
 * 구제로(Gujero) 상단 에디토리얼 헤더 — Lucian #212 포트
 * 왜 스크롤 다운 시 숨기고 스크롤 업 시 복귀하도록 설계했는가:
 * 375px 모바일에서 수백 벌의 빈티지 의류를 탐색할 때 상단 공간 침범을 줄이고,
 * 살짝 위로 올리기만 해도 언어·장바구니·메뉴에 즉시 접근할 수 있게 하기 위함입니다.
 */
const Header = ({ lang, setLang }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [tiktokLiveUrl, setTiktokLiveUrl] = useState('');
    const [tiktokLiveTime, setTiktokLiveTime] = useState('');
    const [isSolid, setIsSolid] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const [scrollPct, setScrollPct] = useState(0);

    const location = useLocation();
    const navigate = useNavigate();
    const { user, isLoggedIn, logout } = useAuth();
    const { cartCount } = useCart();
    const menuRef = useRef(null);
    const buttonRef = useRef(null);

    const toggleMenu = () => setIsMobileMenuOpen((prev) => !prev);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                isMobileMenuOpen &&
                menuRef.current &&
                !menuRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobileMenuOpen]);

    // Lucian #212: 스크롤 방향 누적 감지로 내려갈 때 숨기고 올라올 때 복귀
    useEffect(() => {
        let lastY = window.scrollY || 0;
        let acc = 0;
        const onScroll = () => {
            const y = window.scrollY || 0;
            const d = y - lastY;
            lastY = y;
            acc = (d > 0) === (acc > 0) ? acc + d : d;

            setIsSolid(y > 16);
            if (y < 64) {
                setIsHidden(false);
            } else if (acc > 10) {
                setIsHidden(true);
            } else if (acc < -6) {
                setIsHidden(false);
            }

            const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            setScrollPct(Math.min(100, Math.max(0, (y / maxScroll) * 100)));
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        fetchFilters().catch(() => {});

        const loadTiktokUrl = async () => {
            try {
                const urlData = await fetchSetting('tiktok_live_url');
                setTiktokLiveUrl(urlData?.value || '');
                const timeData = await fetchSetting('tiktok_live_time');
                setTiktokLiveTime(timeData?.value || '');
            } catch (err) {}
        };

        loadTiktokUrl();
        const intervalId = setInterval(loadTiktokUrl, 10000);
        return () => clearInterval(intervalId);
    }, []);

    const navLinks = [
        { name: getTranslation(lang, 'nav_notice'), path: '/notice' },
        { name: getTranslation(lang, 'nav_catalog'), path: '/' },
        { name: getTranslation(lang, 'category_accessory'), path: '/?category=Accessory' },
        { name: getTranslation(lang, 'category_winter'), path: '/?category=Winter' },
    ];

    const langs = ['KR', 'EN', 'TH'];

    const handleSelectLang = (nextLang) => {
        const params = new URLSearchParams(location.search);
        params.set('lang', nextLang);
        navigate(`${location.pathname}?${params.toString()}`, { replace: true });
        setLang(nextLang);
    };

    return (
        <header
            className={`u212-site-hd fixed top-0 w-full max-w-[600px] sm:landscape:max-w-[900px] md:max-w-[900px] lg:max-w-[1200px] z-[1000] border-b border-[#E7E5E4] flex flex-col ${
                isSolid ? 'is-solid' : ''
            } ${isHidden && !isMobileMenuOpen ? 'is-hide' : ''}`}
        >
            <div className="max-w-7xl mx-auto w-full px-3 md:px-6">
                <div className="h-[64px] md:h-[68px] flex items-center justify-between relative">
                    {/* 좌측: 틱톡 라이브 배지 (375px 모바일에서도 중앙 로고와 겹치지 않도록 슬림화) */}
                    <div className="flex-1 flex items-center justify-start z-10 min-w-0">
                        {tiktokLiveUrl && (
                            <a
                                href={tiktokLiveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shrink-0"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FE2C55] animate-pulse" />
                                <span className="text-[10.5px] font-extrabold tracking-tight">LIVE</span>
                                {tiktokLiveTime && (
                                    <span className="hidden sm:inline text-[10px] font-semibold text-zinc-300 tabular-nums">
                                        {tiktokLiveTime}
                                    </span>
                                )}
                            </a>
                        )}
                    </div>

                    {/* 중앙: 로고 */}
                    <div className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center justify-center pointer-events-none">
                        <a
                            href={`/?lang=${lang}`}
                            className="h-[42px] md:h-[48px] cursor-pointer pointer-events-auto flex items-center"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <img src="/gujero_logo.jpg" alt="Gujero" className="h-full w-auto object-contain" />
                        </a>
                    </div>

                    {/* 우측: 3개국어 빠른 전환 + 장바구니 + 드로어 메뉴 */}
                    <div className="flex-1 flex items-center justify-end gap-1 md:gap-2 z-10">
                        <div className="flex items-center bg-[#F4F3EF] rounded-full p-0.5 border border-[#E7E5E4]">
                            {langs.map((l) => (
                                <button
                                    key={l}
                                    type="button"
                                    onClick={() => handleSelectLang(l)}
                                    className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-full transition-colors ${
                                        lang === l ? 'bg-[#18181B] text-white' : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        {!(user?.role === 'admin' || user?.login_id === 'dreamstudio') && (
                            <Link
                                to={`/cart?lang=${lang}`}
                                className="relative p-1.5 text-zinc-700 hover:text-zinc-950 transition-colors"
                                title={getTranslation(lang, 'cart_title')}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.8}
                                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                    />
                                </svg>
                                {cartCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 bg-[#18181B] text-white text-[9.5px] font-extrabold rounded-full min-w-[17px] h-[17px] px-1 flex items-center justify-center tabular-nums">
                                        {cartCount > 99 ? '99+' : cartCount}
                                    </span>
                                )}
                            </Link>
                        )}

                        <button
                            ref={buttonRef}
                            type="button"
                            onClick={toggleMenu}
                            aria-label="메뉴 열기"
                            className="p-1.5 text-zinc-800 hover:text-zinc-950 transition-colors rounded-md hover:bg-[#F4F3EF]"
                        >
                            {isMobileMenuOpen ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6.5h16M4 12h16M4 17.5h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Lucian #212 하단 스크롤 진행 바 */}
            <span className="u212-pg" style={{ width: `${scrollPct.toFixed(1)}%` }} aria-hidden="true" />

            {/* 통합 드로어 메뉴 */}
            {isMobileMenuOpen && (
                <div
                    ref={menuRef}
                    className="absolute top-[64px] md:top-[68px] right-2 w-[260px] sm:w-[300px] bg-white border border-[#E7E5E4] p-4 flex flex-col gap-3 shadow-[0_20px_40px_-20px_rgba(24,24,27,0.22)] z-50 rounded-2xl"
                >
                    <div className="grid grid-cols-3 gap-1.5 pb-3 border-b border-[#E7E5E4]">
                        {langs.map((l) => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => {
                                    handleSelectLang(l);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`text-[12px] font-bold py-2 rounded-lg transition-colors text-center ${
                                    lang === l ? 'bg-[#18181B] text-white' : 'bg-[#F4F3EF] text-zinc-700 hover:bg-zinc-200'
                                }`}
                            >
                                {l === 'KR' ? '한국어' : l === 'EN' ? 'English' : 'ไทย'}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={`${link.path}${link.path.includes('?') ? '&' : '?'}lang=${lang}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`px-2.5 py-2 rounded-lg text-[14px] transition-colors ${
                                    location.pathname === link.path
                                        ? 'bg-[#F4F3EF] text-[#18181B] font-bold'
                                        : 'text-zinc-600 hover:bg-[#FAF9F6] hover:text-[#18181B] font-medium'
                                }`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    <div className="border-t border-[#E7E5E4] pt-2.5 flex flex-col gap-1">
                        {isLoggedIn ? (
                            <>
                                {(user.role === 'admin' || user.login_id === 'dreamstudio') && (
                                    <Link
                                        to={`/mypage?lang=${lang}&tab=admin`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="px-2.5 py-2 rounded-lg text-[13.5px] text-[#18181B] font-bold hover:bg-[#F4F3EF]"
                                    >
                                        {getTranslation(lang, 'admin_tab')}
                                    </Link>
                                )}
                                {!(user.role === 'admin' || user.login_id === 'dreamstudio') && (
                                    <>
                                        <Link
                                            to={`/mypage?lang=${lang}`}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="px-2.5 py-2 rounded-lg text-[13.5px] text-zinc-700 font-medium hover:bg-[#F4F3EF]"
                                        >
                                            {getTranslation(lang, 'bottom_nav_mypage')}
                                        </Link>
                                        <Link
                                            to={`/orders?lang=${lang}`}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="px-2.5 py-2 rounded-lg text-[13.5px] text-zinc-700 font-medium hover:bg-[#F4F3EF]"
                                        >
                                            {getTranslation(lang, 'nav_my_orders')}
                                        </Link>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        logout();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="text-left px-2.5 py-2 rounded-lg text-[13.5px] text-rose-600 font-semibold hover:bg-rose-50"
                                >
                                    {getTranslation(lang, 'nav_logout')}
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to={`/login?lang=${lang}`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="px-3 py-2.5 rounded-lg bg-[#18181B] text-white text-[13.5px] font-bold text-center"
                                >
                                    {getTranslation(lang, 'nav_login')}
                                </Link>
                                <Link
                                    to={`/register?lang=${lang}`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="px-2.5 py-2 rounded-lg text-[13px] text-zinc-600 text-center hover:bg-[#F4F3EF]"
                                >
                                    {getTranslation(lang, 'nav_register')}
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
