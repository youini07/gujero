/* eslint-disable react/prop-types */
import { useState } from 'react';
import MessengerIcon from './MessengerIcon';
import {
    MESSENGER_PLATFORMS,
    MESSENGER_PLATFORM_LIST,
    CHANNEL_LANGUAGE_LIST,
    normalizeChannelUrl,
} from '../services/vendorChannels';

/**
 * [VendorMessengerSettings.jsx]
 * 입점 사장님의 매장 프로필 관리 화면에서:
 * 1) 다중 연락 플랫폼(한국어=카카오톡, 태국어=페이스북메신저/LINE 등) 설정
 * 2) 한국어 / 영문 / 태국어 개별 매장 소개 및 매장 규칙 설정
 * 을 담당하는 전용 모듈 컴포넌트입니다.
 *
 * 왜 MyPage.jsx에서 분리했는가:
 * MyPage.jsx가 4,000줄 이상의 거대 파일이므로, 다중 채널 상태 조작과 다국어 탭 편집 로직을
 * 독립된 모듈로 분리하여 가독성과 유지보수 안정성을 높이기 위함입니다.
 */
export default function VendorMessengerSettings({ vendorProfile, setVendorProfile }) {
    const [activeIntroLang, setActiveIntroLang] = useState('KR');
    const [showAllLangsAtOnce, setShowAllLangsAtOnce] = useState(false);

    const channels = Array.isArray(vendorProfile.contact_channels) ? vendorProfile.contact_channels : [];

    // 실제로 주소가 입력되어 활성화된 채널 수 계산 (단일 버튼 vs 통합 드롭다운 미리보기 안내용)
    const activeValidChannels = channels.filter(
        (ch) => ch && normalizeChannelUrl(ch.platform, ch.url)
    );

    const addChannel = (presetLang = 'KR', presetPlatform = 'kakaotalk') => {
        const newChannel = {
            id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            lang: presetLang,
            platform: presetPlatform,
            url: '',
        };
        setVendorProfile((prev) => ({
            ...prev,
            contact_channels: [...(prev.contact_channels || []), newChannel],
        }));
    };

    const updateChannel = (targetId, patch) => {
        setVendorProfile((prev) => {
            const nextList = (prev.contact_channels || []).map((ch) =>
                ch.id === targetId ? { ...ch, ...patch } : ch
            );
            // 첫 번째 카카오톡 채널 주소는 기존 kakao_url 필드와도 자동 동기화하여 하위 호환성 유지
            const firstKakao = nextList.find(
                (ch) => ch.platform === 'kakaotalk' && String(ch.url || '').trim()
            );
            return {
                ...prev,
                contact_channels: nextList,
                kakao_url: firstKakao ? normalizeChannelUrl('kakaotalk', firstKakao.url) : '',
            };
        });
    };

    const removeChannel = (targetId) => {
        setVendorProfile((prev) => {
            const nextList = (prev.contact_channels || []).filter((ch) => ch.id !== targetId);
            const firstKakao = nextList.find(
                (ch) => ch.platform === 'kakaotalk' && String(ch.url || '').trim()
            );
            return {
                ...prev,
                contact_channels: nextList,
                kakao_url: firstKakao ? normalizeChannelUrl('kakaotalk', firstKakao.url) : '',
            };
        });
    };

    const moveChannel = (index, direction) => {
        const targetIdx = index + direction;
        if (targetIdx < 0 || targetIdx >= channels.length) return;
        setVendorProfile((prev) => {
            const nextList = [...(prev.contact_channels || [])];
            const [moved] = nextList.splice(index, 1);
            nextList.splice(targetIdx, 0, moved);
            return { ...prev, contact_channels: nextList };
        });
    };

    const introTabs = [
        {
            code: 'KR',
            flag: '🇰🇷',
            title: '한국어 (기본)',
            descKey: 'description',
            rulesKey: 'rules',
            descPlaceholder: '한국 고객에게 보여질 매장 특징이나 인사말을 적어주세요. (예: 평택 소재의 빈티지 아카이브 편집샵입니다.)',
            rulesPlaceholder: '배송비, 교환/환불 정책 등을 안내해 주세요. (예: 배송비 : 5,000원 / 10만원 이상 무료배송)',
        },
        {
            code: 'EN',
            flag: '🇺🇸',
            title: '영문 (English)',
            descKey: 'description_en',
            rulesKey: 'rules_en',
            descPlaceholder: '영문 모드 고객에게 보여질 샵 소개를 입력해 주세요. (비워두면 한국어 소개가 대신 표시됩니다)',
            rulesPlaceholder: '영문 배송비/교환 안내 (예: Shipping: ₩5,000 / Worldwide inquiry available)',
        },
        {
            code: 'TH',
            flag: '🇹🇭',
            title: '태국어 (ภาษาไทย)',
            descKey: 'description_th',
            rulesKey: 'rules_th',
            descPlaceholder: '태국어 모드 고객에게 보여질 샵 소개를 입력해 주세요. (비워두면 영문/한국어 소개가 대신 표시됩니다)',
            rulesPlaceholder: '태국어 배송비/교환 안내 (예: ค่าจัดส่ง 5,000 วอน / สอบถามเพิ่มเติมทางแชท)',
        },
    ];

    const visibleIntroTabs = showAllLangsAtOnce
        ? introTabs
        : introTabs.filter((tab) => tab.code === activeIntroLang);

    return (
        <div className="space-y-8">
            {/* ─── 1. 다중 연락 플랫폼 (언어별 상담 메신저) 설정 섹션 ─── */}
            <div className="p-4 md:p-5 rounded-2xl bg-[#FAF9F6] border border-[#E7E5E4] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E5E4] pb-3.5">
                    <div>
                        <h3 className="text-sm md:text-base font-black text-gray-900 flex items-center gap-2">
                            <span>💬</span> 상담 연락 플랫폼 설정 (언어별 다중 메신저 지원)
                        </h3>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            한국인 상담은 <b>카카오톡</b>, 태국인 상담은 <b>페이스북 메신저 / LINE</b> 등 언어별로 원하는 메신저를 여러 개 등록할 수 있습니다.
                        </p>
                    </div>
                    <div className="shrink-0">
                        {activeValidChannels.length >= 2 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold">
                                ✨ 통합 [문의하기 ▾] 드롭다운 활성 ({activeValidChannels.length}개)
                            </span>
                        ) : activeValidChannels.length === 1 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                                단일 메신저 버튼 표시 (1개)
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-gray-500 text-xs font-bold">
                                등록된 메신저 없음
                            </span>
                        )}
                    </div>
                </div>

                {/* 빠른 프리셋 추가 버튼 */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 mr-1">빠른 추가:</span>
                    <button
                        type="button"
                        onClick={() => addChannel('KR', 'kakaotalk')}
                        className="px-3 py-1.5 rounded-xl bg-[#FEE500]/40 hover:bg-[#FEE500] text-[#371D1E] border border-[#E5CE00] text-xs font-extrabold transition-colors flex items-center gap-1.5"
                    >
                        <span>+ 🇰🇷 한국어 · 카카오톡</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => addChannel('TH', 'facebook')}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-extrabold transition-colors flex items-center gap-1.5"
                    >
                        <span>+ 🇹🇭 태국어 · 페이스북 메신저</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => addChannel('TH', 'line')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-extrabold transition-colors flex items-center gap-1.5"
                    >
                        <span>+ 🇹🇭 태국어 · LINE</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => addChannel('EN', 'instagram')}
                        className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-extrabold transition-colors flex items-center gap-1.5"
                    >
                        <span>+ 🇺🇸 영어 · Instagram DM</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => addChannel('EN', 'whatsapp')}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-bold transition-colors"
                    >
                        + 직접 채널 추가
                    </button>
                </div>

                {/* 채널 카드 리스트 */}
                {channels.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center text-xs text-gray-500 space-y-2">
                        <p className="font-bold text-gray-700">아직 설정된 상담 메신저가 없습니다.</p>
                        <p>위 <b>[빠른 추가]</b> 버튼을 눌러 매장에서 사용하시는 상담 메신저를 추가해 주세요.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {channels.map((ch, idx) => {
                            const platformMeta = MESSENGER_PLATFORMS[ch.platform] || MESSENGER_PLATFORMS.kakaotalk;
                            const resolvedPreviewUrl = normalizeChannelUrl(ch.platform, ch.url);

                            return (
                                <div
                                    key={ch.id || idx}
                                    className="bg-white border border-gray-200 rounded-xl p-3.5 md:p-4 shadow-2xs space-y-3"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-6 h-6 rounded-lg flex items-center justify-center shadow-2xs"
                                                style={{
                                                    backgroundColor: platformMeta.badgeBg,
                                                    color: platformMeta.badgeText,
                                                }}
                                            >
                                                <MessengerIcon platform={platformMeta.id} className="w-3.5 h-3.5" />
                                            </span>
                                            <span className="text-xs font-black text-gray-800">
                                                상담 채널 #{idx + 1}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {channels.length > 1 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveChannel(idx, -1)}
                                                        disabled={idx === 0}
                                                        title="위로 이동"
                                                        className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 font-bold"
                                                    >
                                                        ↑
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveChannel(idx, 1)}
                                                        disabled={idx === channels.length - 1}
                                                        title="아래로 이동"
                                                        className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 font-bold"
                                                    >
                                                        ↓
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeChannel(ch.id)}
                                                className="px-2.5 py-1 text-xs rounded bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold ml-1"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {/* 1) 상담 언어 선택 */}
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-500 mb-1">
                                                상담 전용 언어 (문의 자동완성 언어)
                                            </label>
                                            <select
                                                value={ch.lang || 'KR'}
                                                onChange={(e) => updateChannel(ch.id, { lang: e.target.value })}
                                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs md:text-sm font-bold text-gray-900 focus:outline-none focus:border-black"
                                            >
                                                {CHANNEL_LANGUAGE_LIST.map((lng) => (
                                                    <option key={lng.code} value={lng.code}>
                                                        {lng.flag} {lng.labelKr}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* 2) 메신저 플랫폼 선택 */}
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-500 mb-1">
                                                연락 플랫폼 (메신저 앱)
                                            </label>
                                            <select
                                                value={ch.platform || 'kakaotalk'}
                                                onChange={(e) => updateChannel(ch.id, { platform: e.target.value })}
                                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs md:text-sm font-bold text-gray-900 focus:outline-none focus:border-black"
                                            >
                                                {MESSENGER_PLATFORM_LIST.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.nameKr} ({p.nameEn})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* 3) 연결 주소 입력 */}
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 mb-1">
                                            연결 채팅 주소 (URL 또는 계정 아이디)
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={ch.url || ''}
                                                onChange={(e) => updateChannel(ch.id, { url: e.target.value })}
                                                placeholder={platformMeta.placeholder}
                                                className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
                                            />
                                            {resolvedPreviewUrl && (
                                                <a
                                                    href={resolvedPreviewUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="shrink-0 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                >
                                                    열기 확인 ↗
                                                </a>
                                            )}
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-gray-500">
                                            <span>💡 {platformMeta.guideKr}</span>
                                            {resolvedPreviewUrl && resolvedPreviewUrl !== String(ch.url || '').trim() && (
                                                <span className="text-emerald-700 font-semibold">
                                                    자동 변환 주소: {resolvedPreviewUrl}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="bg-white/80 border border-gray-200 rounded-xl p-3 text-[11px] md:text-xs text-gray-600 leading-relaxed">
                    • 메신저를 <b>1개만</b> 등록하시면 상품 상세페이지에 해당 메신저 문의 버튼이 바로 표시됩니다.<br />
                    • 메신저를 <b>2개 이상</b> 등록하시면 통합 <b>[문의하기 ▾]</b> 버튼으로 자동 전환되며, 고객이 선택한 언어 전용 메신저 주소가 열리면서 <b>해당 언어(한국어/영어/태국어)로 상품 문의글이 자동 완성·복사</b>됩니다.
                </div>
            </div>

            {/* ─── 2. 매장 소개 및 규칙 3개 국어(KR / EN / TH) 개별 설정 섹션 ─── */}
            <div className="p-4 md:p-5 rounded-2xl bg-[#FAF9F6] border border-[#E7E5E4] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E5E4] pb-3.5">
                    <div>
                        <h3 className="text-sm md:text-base font-black text-gray-900 flex items-center gap-2">
                            <span>🌐</span> 다국어 매장 소개 & 매장 정책 설정 (한국어 · 영문 · 태국어)
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                            고객이 홈페이지 상단에서 선택한 언어(KR / EN / TH)에 맞춰 편집샵 목록과 상점 페이지에 각기 다른 소개글이 노출됩니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowAllLangsAtOnce((prev) => !prev)}
                        className="self-start sm:self-auto shrink-0 px-3 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-700 transition-colors"
                    >
                        {showAllLangsAtOnce ? '탭별로 접어서 보기' : '3개 국어 한눈에 펼쳐보기'}
                    </button>
                </div>

                {/* 언어 선택 탭 바 */}
                {!showAllLangsAtOnce && (
                    <div className="flex flex-wrap gap-2">
                        {introTabs.map((tab) => {
                            const hasContent =
                                Boolean(String(vendorProfile[tab.descKey] || '').trim()) ||
                                Boolean(String(vendorProfile[tab.rulesKey] || '').trim());
                            const isSelected = activeIntroLang === tab.code;
                            return (
                                <button
                                    key={tab.code}
                                    type="button"
                                    onClick={() => setActiveIntroLang(tab.code)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-2 ${
                                        isSelected
                                            ? 'bg-black text-white border-black shadow-xs'
                                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    <span>{tab.flag}</span>
                                    <span>{tab.title}</span>
                                    <span
                                        className={`w-2 h-2 rounded-full ${
                                            hasContent ? 'bg-emerald-400' : 'bg-gray-300'
                                        }`}
                                        title={hasContent ? '작성됨' : '미작성 (기본 언어 자동 표시)'}
                                    />
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* 각 언어별 매장 소개 & 규칙 입력 폼 */}
                <div className="space-y-5">
                    {visibleIntroTabs.map((tab) => (
                        <div
                            key={tab.code}
                            className="bg-white border border-gray-200 rounded-xl p-4 space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <span className="text-xs md:text-sm font-black text-gray-900 flex items-center gap-1.5">
                                    <span>{tab.flag}</span> {tab.title} 매장 프로필
                                </span>
                                {tab.code !== 'KR' && (
                                    <span className="text-[11px] text-gray-400 font-semibold">
                                        비워두면 한국어 기본 소개가 자동 표시됩니다
                                    </span>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    매장 소개 ({tab.code})
                                </label>
                                <textarea
                                    value={vendorProfile[tab.descKey] || ''}
                                    onChange={(e) =>
                                        setVendorProfile((prev) => ({
                                            ...prev,
                                            [tab.descKey]: e.target.value,
                                        }))
                                    }
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all h-28 resize-none text-sm"
                                    placeholder={tab.descPlaceholder}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    매장 규칙 / 배송비 안내 ({tab.code})
                                </label>
                                <textarea
                                    value={vendorProfile[tab.rulesKey] || ''}
                                    onChange={(e) =>
                                        setVendorProfile((prev) => ({
                                            ...prev,
                                            [tab.rulesKey]: e.target.value,
                                        }))
                                    }
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all h-20 resize-none text-sm"
                                    placeholder={tab.rulesPlaceholder}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

