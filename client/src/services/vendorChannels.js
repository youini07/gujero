/**
 * [vendorChannels.js]
 * 입점 매장 다중 연락 플랫폼(메신저) 정규화 및 다국어 매장 소개 폴백 유틸리티
 *
 * 왜 별도 모듈로 분리했는가:
 * 판매자 설정(MyPage), 상품 상세 문의 드롭다운(DetailPage), 편집샵 목록(VendorListPage),
 * 개별 매장 카탈로그(CatalogPage) 네 곳에서 동일한 플랫폼 규칙과 다국어 폴백 기준을 공유하여
 * 데이터 불일치 버그를 예방하고 파일 비대화를 막기 위함입니다.
 */

// 지원하는 연락 플랫폼 메타데이터 정의
export const MESSENGER_PLATFORMS = {
    kakaotalk: {
        id: 'kakaotalk',
        nameKr: '카카오톡',
        nameEn: 'KakaoTalk',
        nameTh: 'KakaoTalk',
        bgColor: '#FEE500',
        hoverBgColor: '#F4DC00',
        textColor: '#371D1E',
        borderColor: '#E5CE00',
        badgeBg: '#FEE500',
        badgeText: '#371D1E',
        placeholder: 'https://open.kakao.com/o/sXXXXXXX 또는 https://pf.kakao.com/_XXXX',
        guideKr: '카카오톡 오픈채팅방 링크 또는 채널 채팅 주소를 입력해 주세요.',
    },
    facebook: {
        id: 'facebook',
        nameKr: '페이스북 메신저',
        nameEn: 'Facebook Messenger',
        nameTh: 'Facebook Messenger',
        bgColor: '#0084FF',
        hoverBgColor: '#0073E6',
        textColor: '#FFFFFF',
        borderColor: '#0073E6',
        badgeBg: '#0084FF',
        badgeText: '#FFFFFF',
        placeholder: 'https://m.me/페이지아이디 또는 페이지 아이디 입력',
        guideKr: 'm.me/페이지아이디 주소 또는 페이스북 페이지 주소를 입력해 주세요.',
    },
    line: {
        id: 'line',
        nameKr: '라인 (LINE)',
        nameEn: 'LINE',
        nameTh: 'LINE',
        bgColor: '#06C755',
        hoverBgColor: '#05B34C',
        textColor: '#FFFFFF',
        borderColor: '#05B34C',
        badgeBg: '#06C755',
        badgeText: '#FFFFFF',
        placeholder: 'https://lin.ee/XXXXXXX 또는 https://line.me/ti/p/~아이디 또는 @공식계정ID',
        guideKr: 'LINE 친구추가 링크(lin.ee / line.me) 또는 @공식계정 아이디를 입력해 주세요.',
    },
    instagram: {
        id: 'instagram',
        nameKr: '인스타그램 DM',
        nameEn: 'Instagram DM',
        nameTh: 'Instagram DM',
        bgColor: '#E1306C',
        hoverBgColor: '#C9255D',
        textColor: '#FFFFFF',
        borderColor: '#C9255D',
        badgeBg: '#E1306C',
        badgeText: '#FFFFFF',
        placeholder: 'https://ig.me/m/인스타아이디 또는 @인스타아이디',
        guideKr: '@인스타그램 아이디만 입력하셔도 고객 클릭 시 DM 창(ig.me/m/아이디)으로 바로 연결됩니다.',
    },
    whatsapp: {
        id: 'whatsapp',
        nameKr: '왓츠앱 (WhatsApp)',
        nameEn: 'WhatsApp',
        nameTh: 'WhatsApp',
        bgColor: '#25D366',
        hoverBgColor: '#1EBE57',
        textColor: '#FFFFFF',
        borderColor: '#1EBE57',
        badgeBg: '#25D366',
        badgeText: '#FFFFFF',
        placeholder: 'https://wa.me/821012345678 또는 국가번호 포함 번호(예: 821012345678)',
        guideKr: 'wa.me 링크 또는 국가번호를 포함한 숫자(한국 82..., 태국 66...)를 입력해 주세요.',
    },
    telegram: {
        id: 'telegram',
        nameKr: '텔레그램 (Telegram)',
        nameEn: 'Telegram',
        nameTh: 'Telegram',
        bgColor: '#26A5E4',
        hoverBgColor: '#1E93CE',
        textColor: '#FFFFFF',
        borderColor: '#1E93CE',
        badgeBg: '#26A5E4',
        badgeText: '#FFFFFF',
        placeholder: 'https://t.me/아이디 또는 @텔레그램아이디',
        guideKr: 't.me 링크 또는 @텔레그램 사용자명을 입력해 주세요.',
    },
};

export const MESSENGER_PLATFORM_LIST = Object.values(MESSENGER_PLATFORMS);

// 상담 채널에 지정 가능한 언어 메타데이터
export const CHANNEL_LANGUAGES = {
    KR: {
        code: 'KR',
        flag: '🇰🇷',
        labelKr: '한국어 상담 전용',
        shortByUiLang: {
            KR: '한국어 상담',
            EN: 'Korean (한국어)',
            TH: 'ภาษาเกาหลี (KR)',
        },
    },
    TH: {
        code: 'TH',
        flag: '🇹🇭',
        labelKr: '태국어 상담 전용',
        shortByUiLang: {
            KR: '태국어 상담 (ไทย)',
            EN: 'Thai (ภาษาไทย)',
            TH: 'แชทภาษาไทย',
        },
    },
    EN: {
        code: 'EN',
        flag: '🇺🇸',
        labelKr: '영어(글로벌) 상담 전용',
        shortByUiLang: {
            KR: '영어 상담 (English)',
            EN: 'English Support',
            TH: 'ภาษาอังกฤษ (EN)',
        },
    },
};

export const CHANNEL_LANGUAGE_LIST = [
    CHANNEL_LANGUAGES.KR,
    CHANNEL_LANGUAGES.TH,
    CHANNEL_LANGUAGES.EN,
];

/**
 * 언어 코드를 'KR' | 'EN' | 'TH' 표준 코드로 정규화합니다.
 * 왜 필요한가: URL 파라미터에 소문자나 'KO'가 들어와도 항상 일관된 분기로 동작하도록 보장하기 위함입니다.
 */
export function normalizeLangCode(rawLang) {
    const up = String(rawLang || 'KR').trim().toUpperCase();
    if (up === 'TH' || up === 'THAI') return 'TH';
    if (up === 'EN' || up === 'ENG') return 'EN';
    return 'KR';
}

/**
 * 사장님이 입력한 주소 또는 아이디 문자열을 실제 브라우저에서 열리는 유효 URL로 정규화합니다.
 * 왜 필요한가: 사장님이 'https://'를 생략하거나 '@아이디', 전화번호만 입력하더라도
 * 고객 클릭 시 빈 페이지 오류 없이 각 메신저 앱의 대화창으로 직행시키기 위함입니다.
 */
export function normalizeChannelUrl(platform, rawInput) {
    const raw = String(rawInput || '').trim();
    if (!raw) return '';

    // 이미 http:// 또는 https:// 프로토콜이 있는 경우 그대로 사용
    if (/^https?:\/\//i.test(raw)) {
        return raw;
    }

    // 도메인 형태로 시작하는 경우 (예: open.kakao.com/..., m.me/..., lin.ee/...)
    if (/^(open\.kakao\.com|pf\.kakao\.com|m\.me|facebook\.com|fb\.com|line\.me|lin\.ee|ig\.me|instagram\.com|www\.instagram\.com|wa\.me|t\.me)\//i.test(raw)) {
        return `https://${raw}`;
    }

    const cleanHandle = raw.replace(/^@+/, '').trim();
    if (!cleanHandle) return '';

    switch (platform) {
        case 'facebook':
            return `https://m.me/${encodeURIComponent(cleanHandle)}`;
        case 'instagram':
            return `https://ig.me/m/${encodeURIComponent(cleanHandle)}`;
        case 'line':
            // 공식 계정(@포함)은 @를 유지해 OA 채팅/프로필로 연결하고 일반 아이디는 ~아이디 형식 지원
            if (raw.startsWith('@')) {
                return `https://line.me/R/ti/p/${encodeURIComponent(raw)}`;
            }
            return `https://line.me/ti/p/~${encodeURIComponent(cleanHandle)}`;
        case 'whatsapp': {
            const digitsOnly = raw.replace(/[^0-9]/g, '');
            return digitsOnly ? `https://wa.me/${digitsOnly}` : `https://${raw}`;
        }
        case 'telegram':
            return `https://t.me/${encodeURIComponent(cleanHandle)}`;
        case 'kakaotalk':
        default:
            return `https://${raw}`;
    }
}

/**
 * DB에 저장된 contact_channels(JSON 문자열 또는 배열)와 기존 kakao_url을 결합해
 * 유효한 상담 채널 배열을 안전하게 반환합니다.
 *
 * 왜 fallbackKakaoUrl을 지원하는가:
 * 아직 새 다중 메신저 설정을 저장하지 않은 기존 입점 매장들도 기존 등록된 카카오톡 주소만으로
 * 끊김 없이 상품 문의 연결이 유지되어야 하기 때문입니다.
 */
export function parseVendorContactChannels(rawChannels, fallbackKakaoUrl = '') {
    let parsed = [];
    if (Array.isArray(rawChannels)) {
        parsed = rawChannels;
    } else if (typeof rawChannels === 'string' && rawChannels.trim()) {
        try {
            const temp = JSON.parse(rawChannels);
            if (Array.isArray(temp)) parsed = temp;
        } catch {
            parsed = [];
        }
    }

    const validChannels = parsed
        .map((item, idx) => {
            if (!item || typeof item !== 'object') return null;
            const platform = MESSENGER_PLATFORMS[item.platform] ? item.platform : 'kakaotalk';
            const lang = normalizeLangCode(item.lang || 'KR');
            const rawUrl = String(item.url || '').trim();
            const normalizedUrl = normalizeChannelUrl(platform, rawUrl);
            if (!normalizedUrl) return null;
            return {
                id: item.id || `ch_${idx}_${platform}_${lang}`,
                platform,
                lang,
                rawUrl,
                url: normalizedUrl,
                isLegacyFallback: false,
            };
        })
        .filter(Boolean);

    if (validChannels.length > 0) {
        return validChannels;
    }

    const legacyUrl = normalizeChannelUrl('kakaotalk', fallbackKakaoUrl);
    if (legacyUrl) {
        return [
            {
                id: 'legacy_kakao_default',
                platform: 'kakaotalk',
                lang: 'KR',
                rawUrl: String(fallbackKakaoUrl || '').trim(),
                url: legacyUrl,
                isLegacyFallback: true,
            },
        ];
    }

    return [];
}

/**
 * 현재 고객의 화면 언어에 맞춰 상점의 다국어 필드(description, rules)를 반환합니다.
 *
 * 왜 다단계 폴백을 적용하는가:
 * 사장님이 한국어 소개만 작성하고 아직 영문/태국어 소개를 비워둔 경우에도,
 * 해외 고객 화면에서 빈 상점처럼 보이지 않고 기본 소개글이 안전하게 노출되도록 하기 위함입니다.
 */
export function getLocalizedVendorField(vendorObj, baseField, lang) {
    if (!vendorObj) return '';
    const norm = normalizeLangCode(lang);
    const krVal = String(vendorObj[baseField] || '').trim();
    const enVal = String(vendorObj[`${baseField}_en`] || '').trim();
    const thVal = String(vendorObj[`${baseField}_th`] || '').trim();

    if (norm === 'TH') {
        return thVal || enVal || krVal;
    }
    if (norm === 'EN') {
        return enVal || krVal || thVal;
    }
    return krVal || enVal || thVal;
}

/**
 * 플랫폼에 맞는 현재 UI 언어 기준 표시명을 반환합니다.
 */
export function getPlatformDisplayName(platformId, uiLang = 'KR') {
    const meta = MESSENGER_PLATFORMS[platformId] || MESSENGER_PLATFORMS.kakaotalk;
    const norm = normalizeLangCode(uiLang);
    if (norm === 'TH') return meta.nameTh;
    if (norm === 'EN') return meta.nameEn;
    return meta.nameKr;
}

