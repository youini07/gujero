/**
 * [brandGroup.js]
 * 추천 브랜드 그룹의 단일/다중 브랜드 문자열을 안전하게 분리·정규화하는 유틸리티입니다.
 * 왜 별도 모듈로 분리하는가:
 * 관리자 등록 화면(AdminRecommendedBrands), 고객 추천 카드(RecommendedBrandsList),
 * 전체보기 상세 화면(BrandMainPage) 세 곳에서 동일한 규칙으로 쉼표 구분 브랜드를 처리해
 * 공백·대소문자 중복 문제를 원천 차단하기 위함입니다.
 */

export function parseBrandNames(rawInput) {
    const rawList = Array.isArray(rawInput)
        ? rawInput
        : String(rawInput || '').split(',');
    const seen = new Set();
    const result = [];

    rawList.forEach((item) => {
        const cleaned = String(item || '').trim();
        if (!cleaned) return;
        const lowerKey = cleaned.toLowerCase();
        if (seen.has(lowerKey)) return;
        seen.add(lowerKey);
        result.push(cleaned);
    });

    return result;
}

export function formatBrandGroupTitle(rawInput) {
    const list = parseBrandNames(rawInput);
    return list.join(' · ');
}
