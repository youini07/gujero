/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react';
import MessengerIcon from './MessengerIcon';
import {
    MESSENGER_PLATFORMS,
    CHANNEL_LANGUAGES,
    normalizeLangCode,
    parseVendorContactChannels,
    getPlatformDisplayName,
} from '../services/vendorChannels';

/**
 * [ProductInquiryControl.jsx]
 * 상품 상세페이지(DetailPage)의 메신저 문의 버튼, 다중 채널 드롭다운,
 * 그리고 언어별 문의글 자동완성 및 연결 안내 모달을 전담하는 컴포넌트입니다.
 *
 * 왜 별도 컴포넌트로 분리했는가:
 * 1) 판매자가 설정한 메신저 개수(1개 이하 vs 2개 이상)에 따라 단일 버튼과 통합 [문의하기 ▾] 드롭다운으로
 *    전환되는 UI 상태와 외부 클릭 닫기 로직을 DetailPage 본문과 격리하여 가독성을 높이기 위함입니다.
 * 2) 고객이 선택한 메신저 채널의 설정 언어(KR / EN / TH)에 맞춰 상품명과 문의 양식을 자동 완성하고,
 *    모바일 브라우저 팝업 차단을 회피하는 동기 복사 + 즉시 창 열기 흐름을 일관되게 보장하기 위함입니다.
 */
export default function ProductInquiryControl({ product, code, lang, curr, displayPrice }) {
    const uiLang = normalizeLangCode(lang);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [inquiryModal, setInquiryModal] = useState(null);
    const [copiedToast, setCopiedToast] = useState(false);
    const dropdownWrapRef = useRef(null);

    // 드롭다운 외부 영역 클릭 또는 ESC 키 입력 시 메뉴를 자동으로 닫아 사용성을 개선
    useEffect(() => {
        if (!dropdownOpen) return undefined;
        const handleOutsideClick = (e) => {
            if (dropdownWrapRef.current && !dropdownWrapRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('touchstart', handleOutsideClick);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('touchstart', handleOutsideClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [dropdownOpen]);

    // 판매자가 등록한 다중 채널을 파싱하되, 미설정 기존 매장은 기존 vendor_kakao_url로 안전 폴백
    const rawChannels = parseVendorContactChannels(
        product?.vendor_contact_channels,
        product?.vendor_kakao_url
    );

    // 현재 고객의 사이트 표시 언어(uiLang)와 일치하는 상담 채널을 드롭다운 최상단에 우선 배치
    // 왜 정렬하는가: 태국어 화면을 보고 있는 고객에게 태국어 상담 메신저가 가장 먼저 보여야 직관적이기 때문입니다.
    const sortedChannels = [...rawChannels].sort((a, b) => {
        const aMatch = a.lang === uiLang ? 0 : 1;
        const bMatch = b.lang === uiLang ? 0 : 1;
        return aMatch - bMatch;
    });

    const isMultiChannel = sortedChannels.length >= 2;

    /**
     * 선택된 메신저 채널의 대상 언어(targetLang)에 맞춰 상품 문의 메시지를 자동 생성합니다.
     * 왜 uiLang이 아닌 targetLang을 인자로 받는가:
     * 한국어 화면 상태에서라도 고객이 '태국어 전용 페이스북 메신저'를 선택하면
     * 태국인 상담 직원이 즉시 이해할 수 있도록 태국어 상품명과 양식으로 자동 완성되어야 하기 때문입니다.
     */
    const buildLocalizedInquiryMessage = (targetLang) => {
        const normTarget = normalizeLangCode(targetLang);
        const brand = product?.brand || 'Vintage';
        const size = product?.size || '';

        const localizedTitle =
            normTarget === 'TH'
                ? product?.name_th || product?.name_en || product?.name || ''
                : normTarget === 'EN'
                    ? product?.name_en || product?.name || ''
                    : product?.name || '';

        let productUrl = window.location.href;
        try {
            const urlObj = new URL(window.location.href);
            urlObj.searchParams.set('lang', normTarget);
            productUrl = urlObj.toString();
        } catch {
            productUrl = window.location.href;
        }

        const cleanCode = String(code || '').startsWith('TEMP_')
            ? normTarget === 'TH'
                ? 'รอกำหนด'
                : normTarget === 'EN'
                    ? 'TBD'
                    : '도착예정'
            : code;

        const storeLabel =
            product?.vendor_store_name ||
            product?.vendor_code ||
            (normTarget === 'TH' ? 'ผู้ขาย' : normTarget === 'EN' ? 'Seller' : '판매자');

        if (normTarget === 'TH') {
            return [
                `📦 [สอบถามสินค้า GUJERO]`,
                `• ร้านค้า: ${storeLabel}`,
                `• สินค้า: [${brand}] ${localizedTitle}`,
                size ? `• ไซส์: ${size}` : null,
                `• รหัสสินค้า: ${cleanCode}`,
                `• ราคา: ${curr}${displayPrice}`,
                `• ลิงก์สินค้า: ${productUrl}`,
                ``,
                `สวัสดีครับ/ค่ะ สนใจสอบถามสินค้าชิ้นนี้จากเว็บไซต์ GUJERO :)`,
            ]
                .filter((v) => v !== null)
                .join('\n');
        }

        if (normTarget === 'EN') {
            return [
                `📦 [GUJERO Product Inquiry]`,
                `• Store: ${storeLabel}`,
                `• Item: [${brand}] ${localizedTitle}`,
                size ? `• Size: ${size}` : null,
                `• Code: ${cleanCode}`,
                `• Price: ${curr}${displayPrice}`,
                `• Product Link: ${productUrl}`,
                ``,
                `Hello! I saw this item on GUJERO and would like to inquire about it :)`,
            ]
                .filter((v) => v !== null)
                .join('\n');
        }

        return [
            `📦 [구제로(GUJERO) 상품 문의]`,
            `• 매장명: ${storeLabel}`,
            `• 상품명: [${brand}] ${localizedTitle}`,
            size ? `• 사이즈: ${size}` : null,
            `• 상품코드: ${cleanCode}`,
            `• 판매가격: ${curr}${displayPrice}`,
            `• 문의 상품 링크: ${productUrl}`,
            ``,
            `안녕하세요 사장님! 위 상품 링크 보고 문의드립니다 :)`,
        ]
            .filter((v) => v !== null)
            .join('\n');
    };

    /**
     * 모바일 Safari 등의 팝업 차단을 피하기 위해 사용자 클릭 이벤트 직후 동기 복사를 먼저 수행합니다.
     * 왜 동기 복사를 우선하는가: await navigator.clipboard 이후에 window.open을 호출하면
     * 모바일 브라우저가 사용자 제스처 컨텍스트가 끝난 것으로 간주해 새 창 열기를 차단할 수 있기 때문입니다.
     */
    const copyTextImmediateAndAsync = (text) => {
        let syncCopied = false;
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            syncCopied = document.execCommand('copy');
            document.body.removeChild(ta);
        } catch {
            syncCopied = false;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => {});
        }
        return syncCopied;
    };

    /**
     * WhatsApp 공식 링크(wa.me/번호)인 경우 클립보드 복사에 더해 URL text 파라미터로도 초안을 자동 입력합니다.
     */
    const buildFinalTargetUrl = (channel, messageText) => {
        if (!channel?.url) return '';
        if (
            channel.platform === 'whatsapp' &&
            /^https?:\/\/wa\.me\/[0-9]+\/?$/i.test(channel.url)
        ) {
            return `${channel.url.replace(/\/$/, '')}?text=${encodeURIComponent(messageText)}`;
        }
        return channel.url;
    };

    const triggerChannelInquiry = (channel) => {
        setDropdownOpen(false);

        // 기존 단일 kakao_url 폴백 채널인 경우에만 사이트 현재 언어를 따르고,
        // 사장님이 명시적으로 설정한 채널은 해당 채널에 지정된 전용 언어(channel.lang)로 자동 완성!
        const targetLang =
            !channel || channel.isLegacyFallback
                ? uiLang
                : normalizeLangCode(channel.lang || uiLang);

        const platformId = channel?.platform || 'kakaotalk';
        const platformMeta = MESSENGER_PLATFORMS[platformId] || MESSENGER_PLATFORMS.kakaotalk;
        const messageText = buildLocalizedInquiryMessage(targetLang);
        const targetUrl = buildFinalTargetUrl(channel, messageText);

        // 1) 동기 클립보드 복사 실행
        copyTextImmediateAndAsync(messageText);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 3000);

        // 2) 연결 주소가 있으면 사용자 제스처 흐름 안에서 즉시 새 창으로 메신저 오픈
        if (targetUrl) {
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
        }

        // 3) 붙여넣기 안내 및 재열기용 모달 표시
        setInquiryModal({
            platformId,
            platformMeta,
            targetLang,
            text: messageText,
            targetUrl,
            storeName:
                product?.vendor_store_name ||
                product?.vendor_code ||
                (targetLang === 'TH' ? 'ร้านค้า' : targetLang === 'EN' ? 'Seller' : '입점 사장님'),
        });
    };

    // 단일 채널일 때 표시할 대표 채널 (미등록 매장은 카카오톡 기본 안내 버튼으로 동작)
    const singleChannel = sortedChannels[0] || null;
    const singlePlatformMeta = singleChannel
        ? MESSENGER_PLATFORMS[singleChannel.platform] || MESSENGER_PLATFORMS.kakaotalk
        : MESSENGER_PLATFORMS.kakaotalk;

    const getSingleButtonLabel = () => {
        if (!singleChannel || singleChannel.platform === 'kakaotalk') {
            return uiLang === 'KR'
                ? '카카오톡 문의'
                : uiLang === 'TH'
                    ? 'สอบถามทาง KakaoTalk'
                    : 'KakaoTalk Inquiry';
        }
        const pName = getPlatformDisplayName(singleChannel.platform, uiLang);
        if (uiLang === 'TH') return `สอบถามทาง ${pName}`;
        if (uiLang === 'EN') return `${pName} Inquiry`;
        return `${pName} 문의`;
    };

    const modalLang = inquiryModal ? inquiryModal.targetLang : uiLang;
    const modalPlatformName = inquiryModal
        ? getPlatformDisplayName(inquiryModal.platformId, modalLang)
        : 'KakaoTalk';

    return (
        <>
            {isMultiChannel ? (
                /* ─── 2개 이상 메신저 설정 시: 통합 [문의하기 ▾] 드롭다운 버튼 ─── */
                <div ref={dropdownWrapRef} className="relative flex-1 h-full">
                    <button
                        type="button"
                        onClick={() => setDropdownOpen((prev) => !prev)}
                        aria-expanded={dropdownOpen}
                        className="w-full h-full bg-[#FEE500] hover:bg-[#F4DC00] text-[#371D1E] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 text-[11px] md:text-[13px] shadow-sm px-2.5 border border-[#E5CE00]"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.3"
                            className="w-4 h-4 flex-none"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                        <span className="whitespace-nowrap">
                            {uiLang === 'KR'
                                ? '문의하기'
                                : uiLang === 'TH'
                                    ? 'สอบถามผู้ขาย'
                                    : 'Inquire'}
                        </span>
                        <svg
                            className={`w-3.5 h-3.5 flex-none transition-transform duration-200 ${
                                dropdownOpen ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.5"
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </button>

                    {/* 언어별 전용 메신저 선택 드롭다운 패널 */}
                    {dropdownOpen && (
                        <div className="absolute right-0 top-[calc(100%+8px)] w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in duration-150">
                            <div className="px-4 py-2.5 bg-gray-900 text-white flex items-center justify-between">
                                <span className="text-[11px] md:text-xs font-extrabold tracking-tight">
                                    {uiLang === 'TH'
                                        ? 'เลือกช่องทางแชทตามภาษา'
                                        : uiLang === 'EN'
                                            ? 'Choose Messenger by Language'
                                            : '상담 언어별 메신저 선택'}
                                </span>
                                <span className="text-[10px] text-gray-300 font-semibold">
                                    {sortedChannels.length} Channels
                                </span>
                            </div>

                            <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto">
                                {sortedChannels.map((ch) => {
                                    const pMeta =
                                        MESSENGER_PLATFORMS[ch.platform] ||
                                        MESSENGER_PLATFORMS.kakaotalk;
                                    const langMeta =
                                        CHANNEL_LANGUAGES[ch.lang] || CHANNEL_LANGUAGES.KR;
                                    const langLabel =
                                        langMeta.shortByUiLang[uiLang] ||
                                        langMeta.shortByUiLang.KR;
                                    const pDisplayName = getPlatformDisplayName(
                                        ch.platform,
                                        uiLang
                                    );
                                    const isRecommended = ch.lang === uiLang;

                                    return (
                                        <button
                                            key={ch.id}
                                            type="button"
                                            onClick={() => triggerChannelInquiry(ch)}
                                            className={`w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-left transition-all hover:shadow-xs ${
                                                isRecommended
                                                    ? 'bg-amber-50/60 border-amber-300 hover:bg-amber-50'
                                                    : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-none shadow-2xs"
                                                    style={{
                                                        backgroundColor: pMeta.badgeBg,
                                                        color: pMeta.badgeText,
                                                    }}
                                                >
                                                    <MessengerIcon
                                                        platform={pMeta.id}
                                                        className="w-4.5 h-4.5"
                                                    />
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-black text-gray-900 truncate">
                                                            {pDisplayName}
                                                        </span>
                                                        {isRecommended && (
                                                            <span className="px-1.5 py-0.5 rounded-full bg-gray-900 text-white text-[9px] font-extrabold leading-none">
                                                                {uiLang === 'TH'
                                                                    ? 'แนะนำ'
                                                                    : uiLang === 'EN'
                                                                        ? 'Match'
                                                                        : '추천'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] font-bold text-gray-600 flex items-center gap-1 mt-0.5">
                                                        <span>{langMeta.flag}</span>
                                                        <span className="truncate">{langLabel}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-gray-400 text-xs font-black flex-none pr-1">
                                                ↗
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="px-3.5 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-500 font-semibold leading-snug">
                                {uiLang === 'TH'
                                    ? '💡 ระบบจะคัดลอกข้อความสอบถามเป็นภาษาของช่องทางที่เลือกให้อัตโนมัติ'
                                    : uiLang === 'EN'
                                        ? '💡 Product inquiry text will be auto-copied in the selected channel’s language.'
                                        : '💡 선택한 채널의 설정 언어로 문의글이 자동 완성·복사됩니다.'}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* ─── 1개 이하 메신저 설정 시: 단일 플랫폼 바로 문의 버튼 ─── */
                <button
                    type="button"
                    onClick={() => triggerChannelInquiry(singleChannel)}
                    style={{
                        backgroundColor: singlePlatformMeta.bgColor,
                        color: singlePlatformMeta.textColor,
                        borderColor: singlePlatformMeta.borderColor,
                    }}
                    className="flex-1 h-full font-black rounded-lg transition-all flex items-center justify-center gap-1.5 text-[11px] md:text-[13px] shadow-sm px-2 border hover:opacity-95"
                >
                    <MessengerIcon
                        platform={singlePlatformMeta.id}
                        className="w-4 h-4 md:w-4.5 md:h-4.5 flex-none"
                    />
                    <span className="whitespace-nowrap">{getSingleButtonLabel()}</span>
                </button>
            )}

            {/* ─── 메신저 상품 문의 자동완성 & 연결 안내 모달 ─── */}
            {inquiryModal && (
                <div
                    className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                    onClick={() => setInquiryModal(null)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className="px-5 py-4 flex items-center justify-between"
                            style={{
                                backgroundColor: inquiryModal.platformMeta.bgColor,
                                color: inquiryModal.platformMeta.textColor,
                            }}
                        >
                            <div className="flex items-center gap-2 font-black text-sm md:text-base">
                                <MessengerIcon
                                    platform={inquiryModal.platformId}
                                    className="w-5 h-5 flex-none"
                                />
                                <span>
                                    {modalLang === 'TH'
                                        ? `เชื่อมต่อแชท ${modalPlatformName} กับผู้ขาย`
                                        : modalLang === 'EN'
                                            ? `Seller ${modalPlatformName} Inquiry`
                                            : `사장님 ${modalPlatformName} 문의 연결`}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInquiryModal(null)}
                                className="w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center font-bold text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-emerald-900 text-xs font-bold leading-relaxed flex items-start gap-2">
                                <span className="text-base leading-none">✅</span>
                                <div>
                                    {modalLang === 'TH' ? (
                                        <>
                                            คัดลอกข้อความสอบถามสินค้า (ภาษาไทย) ไปยังคลิปบอร์ดเรียบร้อยแล้ว!
                                            <br />
                                            กรุณาวางข้อความ (<b>Paste / Ctrl+V</b>) ในห้องแชท{' '}
                                            <b>{modalPlatformName}</b> เพื่อส่งให้ผู้ขาย
                                        </>
                                    ) : modalLang === 'EN' ? (
                                        <>
                                            Product details and link have been{' '}
                                            <b>automatically copied in English</b>!
                                            <br />
                                            Simply <b>paste (Ctrl+V or Long Press → Paste)</b> into
                                            the <b>{modalPlatformName}</b> chat room and send.
                                        </>
                                    ) : (
                                        <>
                                            어떤 상품에서 문의하셨는지 사장님이 바로 알아보실 수 있도록{' '}
                                            <b>아래 상품 정보와 링크가 클립보드에 자동 완성(복사)</b>
                                            되었습니다!
                                            <br />
                                            열린 <b>{modalPlatformName}</b> 채팅방 입력창에{' '}
                                            <b>붙여넣기(Ctrl+V 또는 길게 눌러 붙여넣기)</b> 후 전송해 주세요.
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-black text-gray-700">
                                        {modalLang === 'TH'
                                            ? '📋 ข้อความสอบถามอัตโนมัติ (คัดลอกแล้ว)'
                                            : modalLang === 'EN'
                                                ? '📋 Auto-Completed Inquiry Message (Copied)'
                                                : '📋 자동 완성된 문의 메시지 (복사 완료)'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            copyTextImmediateAndAsync(inquiryModal.text);
                                            setCopiedToast(true);
                                            setTimeout(() => setCopiedToast(false), 2500);
                                        }}
                                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
                                    >
                                        {copiedToast
                                            ? modalLang === 'TH'
                                                ? '✓ คัดลอกแล้ว!'
                                                : modalLang === 'EN'
                                                    ? '✓ Copied!'
                                                    : '✓ 복사됨!'
                                            : modalLang === 'TH'
                                                ? 'คัดลอกอีกครั้ง'
                                                : modalLang === 'EN'
                                                    ? 'Copy Again'
                                                    : '다시 복사'}
                                    </button>
                                </div>
                                <pre className="w-full p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-800 whitespace-pre-wrap break-all font-sans leading-relaxed max-h-48 overflow-y-auto">
                                    {inquiryModal.text}
                                </pre>
                            </div>

                            {inquiryModal.targetUrl ? (
                                <a
                                    href={inquiryModal.targetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => {
                                        copyTextImmediateAndAsync(inquiryModal.text);
                                    }}
                                    style={{
                                        backgroundColor: inquiryModal.platformMeta.bgColor,
                                        color: inquiryModal.platformMeta.textColor,
                                        borderColor: inquiryModal.platformMeta.borderColor,
                                    }}
                                    className="w-full py-3.5 px-4 font-black rounded-2xl shadow-sm flex items-center justify-center gap-2 text-sm transition-all border hover:opacity-95"
                                >
                                    <MessengerIcon
                                        platform={inquiryModal.platformId}
                                        className="w-5 h-5 flex-none"
                                    />
                                    <span>
                                        {modalLang === 'TH'
                                            ? `เปิดแชท ${modalPlatformName} ของ ${inquiryModal.storeName}`
                                            : modalLang === 'EN'
                                                ? `Open ${inquiryModal.storeName} ${modalPlatformName} Chat`
                                                : `${inquiryModal.storeName} ${modalPlatformName} 채팅방 열기`}
                                    </span>
                                </a>
                            ) : (
                                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold leading-relaxed text-center">
                                    {modalLang === 'TH' ? (
                                        <>⚠️ ผู้ขายยังไม่ได้ตั้งค่าลิงก์ช่องทางแชทสำหรับร้านค้านี้</>
                                    ) : modalLang === 'EN' ? (
                                        <>
                                            ⚠️ The seller has not configured a messenger link for
                                            this store yet.
                                        </>
                                    ) : (
                                        <>
                                            ⚠️ 이 상품을 업로드한 사장님의 상담 메신저 주소가 아직 설정되지
                                            않았습니다.
                                            <br />
                                            (사장님께서 [마이페이지 → 매장 프로필 관리]에서 연락 플랫폼을
                                            입력하시면 즉시 연결됩니다.)
                                        </>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setInquiryModal(null)}
                                className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                            >
                                {modalLang === 'TH'
                                    ? 'ปิด'
                                    : modalLang === 'EN'
                                        ? 'Close'
                                        : '닫기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

