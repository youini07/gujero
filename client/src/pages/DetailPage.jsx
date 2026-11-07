import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { fetchProductDetail } from '../services/api';
import { getTranslation } from '../services/i18n';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';

const DetailPage = ({ lang }) => {
    const { code } = useParams();
    const navigate = useNavigate();
    const { addItem } = useCart();
    const { isWished, toggleWishlist } = useWishlist();
    const { isLoggedIn } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [addedToCart, setAddedToCart] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [activeImgIdx, setActiveImgIdx] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxImgIdx, setLightboxImgIdx] = useState(0);
    const [kakaoInquiryModal, setKakaoInquiryModal] = useState(null);
    const [inquiryCopiedToast, setInquiryCopiedToast] = useState(false);
    const carouselRef = useRef(null);

    // 뷰포트 맨 위로
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [code]);

    const tLang = lang;
    const tBack = getTranslation(tLang, 'back_to_catalog');
    const tBuy = getTranslation(tLang, 'inquiry_line');
    const tMessenger = getTranslation(tLang, 'inquiry_messenger');
    const curr = getTranslation(tLang, 'currency');
    const tReleasePrice = getTranslation(tLang, 'release_price');

    const fallbackImg = '/static/nophoto.png';

    useEffect(() => {
        const loadDetail = async () => {
            setLoading(true);
            try {
                const item = await fetchProductDetail(code);
                setProduct(item);
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        loadDetail();
        window.scrollTo(0, 0);
    }, [code]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
            <div className="font-bold text-lg">{getTranslation(tLang, 'loading')}</div>
        </div>
    );

    if (!product) return (
        <div className="p-20 text-center flex flex-col items-center justify-center min-h-[50vh]">
            <div className="text-6xl mb-6">🔍</div>
            <div className="text-2xl text-red-500 font-black mb-2">{getTranslation(tLang, 'no_products')}</div>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {tLang === 'TH' ? (
                    <>ไม่สามารถโหลดข้อมูลสินค้าได้<br />กรุณาตรวจสอบรหัสสินค้า (<b>{code}</b>) หรือลองใหม่อีกครั้ง</>
                ) : tLang === 'EN' ? (
                    <>Failed to load product details.<br />Please check the product code (<b>{code}</b>) or try again below.</>
                ) : (
                    <>상품 정보를 불러오지 못했습니다. <br />상품 코드(<b>{code}</b>)가 정확한지 확인하시거나 아래 버튼을 눌러 다시 시도해주세요.</>
                )}
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-gray-100 text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                    {tLang === 'TH' ? 'รีเฟรช' : tLang === 'EN' ? 'Refresh' : (getTranslation(tLang, 'refresh') || '새로고침')}
                </button>
                <button
                    onClick={() => navigate(`/?lang=${lang}`)}
                    className="px-8 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
                >
                    {getTranslation(tLang, 'back_to_catalog')}
                </button>
            </div>
        </div>
    );

    const { brand, name, price, original_price, size, category, description, image_url, stock, discount_rate, product_images, name_en, name_th, description_en, description_th, sku, nukki_url } = product;
    const displayName =
        tLang === 'TH'
            ? (name_th || name_en || name)
            : tLang === 'EN'
                ? (name_en || name)
                : name;
    const normalizedStockStr = String(stock ?? '').trim().toLowerCase();
    const isSoldOut = normalizedStockStr === '0' || ['sold', 'out', '품절', '판매완료'].some(kw => normalizedStockStr.includes(kw));
    const isReserved = normalizedStockStr === 'reserved';
    // 'onsale', 'sold out', '0', '1'이 아닌 상태이고, reserved도 아니면 예약 가능 대상
    const isPreorderTarget = !isReserved && (
        isNaN(Number(price)) || 
        String(price).trim() === '' || 
        String(price).toUpperCase() === 'TBD' || 
        (!isSoldOut && !['onsale', '1', ''].includes(normalizedStockStr.replace(/\s+/g, '')))
    );
    const isScheduledProduct = product.arrival_date && String(product.arrival_date).trim() !== '';

    // [Cache-Buster] 이미지 갱신을 위해 쿼리 스트링 추가
    const cacheBuster = `v=${new Date().toISOString().split('T')[0]}`;
    let mainImgUrl = fallbackImg;
    if (image_url) {
        if (typeof image_url === 'string' && image_url.startsWith('[')) {
            try {
                const parsed = JSON.parse(image_url);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    mainImgUrl = parsed[0];
                }
            } catch (e) { }
        } else {
            mainImgUrl = image_url;
        }
    }

    // [NEW] 누끼 이미지가 있으면 첫 화면에 사용, 없으면 기존 mainImgUrl 유지
    // 왜: 누끼(배경 제거) 이미지를 첫 화면에 보여주면 상품이 깔끔하게 보이므로
    const hasNukki = nukki_url && nukki_url.trim() !== '' && nukki_url.toLowerCase() !== 'nan';
    const heroImage = hasNukki ? nukki_url : mainImgUrl;

    let rawImageList = [];
    if (Array.isArray(product_images) && product_images.length > 0) {
        // [수정] 쿼리 파라미터를 무시하고 순수 URL 경로만 비교하여 중복 제거 (대소문자 무관)
        const getBasePath = (url) => typeof url === 'string' ? url.split('?')[0].toLowerCase() : '';
        const heroBasePath = getBasePath(heroImage);
        // (누끼가 없으면 heroImage === mainImgUrl 이므로 hero 중복 제거만으로 충분)
        
        const filteredProductImages = product_images.filter(img => {
            const imgBasePath = getBasePath(img);
            // 첫 화면(hero)과 같은 이미지만 중복 제거
            if (imgBasePath === heroBasePath) return false;
            // [수정] 누끼가 있을 때 1번 사진(mainImgUrl)을 빼지 않는다 → 누끼, 1, 2, 3… 순서 유지
            // 로컬 정적 경로의 main{코드}.jpg(누끼 원본 파일)만 중복 노출 방지로 제외
            // 왜 경로 조건을 좁혔나: 예전처럼 'main' 포함 여부만 보면 무작위 이름의 R2 URL이 우연히 걸릴 수 있음
            if (hasNukki && imgBasePath.startsWith('/static/') && /\/main[^/]*\.(jpe?g|png|webp)$/.test(imgBasePath)) return false;
            return true;
        });
        rawImageList = [heroImage, ...filteredProductImages];
    } else {
        rawImageList = [heroImage];
    }

    const imageList = rawImageList.filter(Boolean).map(url => {
        // 로컬 정적 자산(/static)인 경우에만 캐시 버스터 적용
        if (url && url.startsWith('/static')) {
            return `${url}${url.includes('?') ? '&' : '?'}${cacheBuster}`;
        }
        return url;
    });


    // 중복 누적된 [구매전 필독] / 영문·태국어 안내 블록을 1회만 남기도록 정제합니다.
    const dedupeNoticeParagraphs = (rawText) => {
        if (!rawText) return '';
        const paras = String(rawText)
            .replace(/\r\n/g, '\n')
            .split(/\n{2,}/)
            .map(p => p.trim())
            .filter(Boolean);
        const seen = new Set();
        let noticeCount = 0;
        const out = [];
        for (const p of paras) {
            const firstLine = p.split('\n')[0].trim();
            const isNotice =
                /^(?:[\[\(<【※★◈■▶•\-*\s]*)(?:구매\s*전\s*필독|구매전\s*필독|필독\s*사항|구매\s*시\s*필독|구매\s*필독|IMPORTANT NOTICE|NOTICE BEFORE PURCHASE|PLEASE READ|ข้อควรอ่าน)/i.test(firstLine) ||
                p.includes('빈티지 제품으로 자연스러운 사용감이나 미세하자는 있을 수 있습니다');
            const norm = p.replace(/\s+/g, ' ').trim();
            if (seen.has(norm)) continue;
            if (isNotice) {
                if (noticeCount >= 1) continue;
                noticeCount += 1;
            }
            seen.add(norm);
            out.push(p);
        }
        return out.join('\n\n');
    };

    // 구버전 DB 상품(영문 1줄 요약 또는 태국어 미생성 상태)도 한국어 스펙 정보를 기반으로 3개국어 완성형 설명으로 보강합니다.
    const buildStructuredEnThFallback = (targetLng, rawDescKr, rawDescEn, rawDescTh) => {
        const kr = String(rawDescKr || '');
        const condMatch = kr.match(/(?:사용감정도|제품상태|\[상태)\s*:\s*([^\]\n/]+)/);
        const defectMatch = kr.match(/(?:하자여부|\[결함)\s*:\s*([^\]\n]+)/);
        const authMatch = kr.match(/정가품여부\s*:\s*([^\n]+)/);
        const condRaw = (condMatch ? condMatch[1] : '').replace(/\s+/g, '');
        const defectRaw = (defectMatch ? defectMatch[1] : '').trim();
        const authRaw = (authMatch ? authMatch[1] : '').trim();

        const mapCond = () => {
            if (condRaw.includes('새상품') || condRaw.includes('미사용')) {
                return targetLng === 'TH' ? 'สินค้าใหม่มือหนึ่ง (ยังไม่ผ่านการใช้งาน)' : 'Brand New (Unused)';
            }
            if (condRaw.includes('사용감없음')) {
                return targetLng === 'TH' ? 'สภาพเหมือนใหม่ (แทบไม่มีร่องรอยการใช้งาน)' : 'Like New (Minimal Signs of Wear)';
            }
            if (condRaw.includes('사용감많음')) {
                return targetLng === 'TH' ? 'มีร่องรอยการใช้งานตามสไตล์วินเทจ' : 'Visible Signs of Vintage Wear';
            }
            return targetLng === 'TH' ? 'สภาพดี (มีร่องรอยการใช้งานเล็กน้อย)' : 'Gently Used (Good Vintage Condition)';
        };

        const isAuthentic = authRaw.includes('정품') && !authRaw.includes('모름') && !authRaw.includes('가품');
        const authLabel = targetLng === 'TH'
            ? (isAuthentic ? 'ของแท้ 100%' : 'ไม่ทราบแน่ชัด (สินค้าวินเทจ)')
            : (isAuthentic ? '100% Authentic' : 'Authenticity Unverified (Vintage Item)');

        const isNoDefect = !defectRaw || defectRaw === '없음' || /하자가\s*없는|하자\s*없음|깨끗한/.test(defectRaw);
        const defectLabel = targetLng === 'TH'
            ? (isNoDefect ? 'ไม่มีตำหนิหรือคราบสกปรก สภาพสะอาดเรียบร้อย' : 'มีร่องรอยการใช้งานเล็กน้อยตามสไตล์วินเทจ (กรุณาตรวจสอบรูปภาพเพิ่มเติม)')
            : (isNoDefect ? 'No stains or damages — clean vintage condition.' : 'Minor signs of vintage wear may be present (please check detail photos).');

        let measLine = '';
        const rawActual = String(product.measured_size || product.actual_size || '').trim();
        if (rawActual && rawActual.toLowerCase() !== 'nan') {
            const parts = rawActual.split(',').map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
                const wNum = parseFloat(parts[0]);
                const lNum = parseFloat(parts[1]);
                const wStr = !isNaN(wNum) ? `${wNum}${targetLng === 'TH' ? ' ซม.' : 'cm'} (${Number((wNum / 2.54).toFixed(1))}")` : parts[0];
                const lStr = !isNaN(lNum) ? `${lNum}${targetLng === 'TH' ? ' ซม.' : 'cm'} (${Number((lNum / 2.54).toFixed(1))}")` : parts[1];
                measLine = targetLng === 'TH'
                    ? `รอบอก/เอว : ${wStr} / ความยาวรวม : ${lStr}`
                    : `Chest/Waist : ${wStr} / Total Length : ${lStr}`;
            } else if (parts.length === 1) {
                measLine = targetLng === 'TH' ? `ขนาดวัดจริง : ${parts[0]}` : `Measured Size : ${parts[0]}`;
            }
        }

        const catTranslated = category ? getTranslation(targetLng, String(category).trim()) : '';
        if (targetLng === 'TH') {
            const cleanTh = rawDescTh && !/[가-힣]/.test(rawDescTh) ? dedupeNoticeParagraphs(rawDescTh) : '';
            if (cleanTh && (cleanTh.includes('▪ ชื่อสินค้า') || (cleanTh.length >= 140 && cleanTh.includes('ข้อควรอ่าน')))) {
                return cleanTh;
            }
            const titleTh = (name_th && !/[가-힣]/.test(name_th) ? name_th : '') || (name_en && !/[가-힣]/.test(name_en) ? name_en : '') || `${brand || 'Vintage'} ${catTranslated || ''}`.trim();
            const narrativeTh = cleanTh || `สินค้าวินเทจคัดสรรจากแบรนด์ ${brand || 'Vintage'}${catTranslated ? ` (${catTranslated})` : ''} ดีไซน์คลาสสิกและสภาพพร้อมสวมใส่ กรุณาตรวจสอบขนาดวัดจริงและรูปภาพรายละเอียดก่อนสั่งซื้อ`;
            return [
                [
                    `▪ ชื่อสินค้า : ${titleTh}`,
                    `▪ แบรนด์ : ${brand || 'Unknown'}`,
                    size ? `▪ ไซส์ป้าย : ${size}` : '',
                    measLine ? `▪ ขนาดวัดจริง : ${measLine}` : '',
                    `▪ การรับรองของแท้ : ${authLabel}`,
                    `▪ สภาพสินค้า : ${mapCond()}`,
                    `▪ ตำหนิ/ร่องรอย : ${defectLabel}`,
                ].filter(Boolean).join('\n'),
                narrativeTh,
                `[ข้อควรอ่านก่อนสั่งซื้อ]\nสินค้าชิ้นนี้เป็นสินค้าวินเทจมือสอง อาจมีร่องรอยการใช้งานตามธรรมชาติหรือตำหนิเล็กน้อย กรุณาตรวจสอบรูปภาพและขนาดวัดจริงอย่างละเอียดก่อนสั่งซื้อ`,
            ].filter(Boolean).join('\n\n');
        }

        const cleanEn = rawDescEn && !/[가-힣]/.test(rawDescEn) ? dedupeNoticeParagraphs(rawDescEn) : '';
        if (cleanEn && (cleanEn.includes('▪ Product Name') || (cleanEn.length >= 160 && /IMPORTANT NOTICE|NOTICE BEFORE PURCHASE/i.test(cleanEn)))) {
            return cleanEn;
        }
        const titleEn = (name_en && !/[가-힣]/.test(name_en) ? name_en : '') || `${brand || 'Vintage'} ${catTranslated || 'Item'}`.trim();
        const narrativeEn = cleanEn || `Curated vintage piece from ${brand || 'a classic label'}${catTranslated ? ` (${catTranslated})` : ''}, featuring timeless styling and well-preserved vintage character. Please check the detailed photos and actual measurements below.`;
        return [
            [
                `▪ Product Name : ${titleEn}`,
                `▪ Brand : ${brand || 'Unknown'}`,
                size ? `▪ Tagged Size : ${size}` : '',
                measLine ? `▪ Measurements : ${measLine}` : '',
                `▪ Authenticity : ${authLabel}`,
                `▪ Condition : ${mapCond()}`,
                `▪ Defect / Wear : ${defectLabel}`,
            ].filter(Boolean).join('\n'),
            narrativeEn,
            `[IMPORTANT NOTICE BEFORE PURCHASE]\nAs this is a pre-owned vintage item, minor signs of natural wear or subtle imperfections may be present. Please review the photos and actual measurements carefully before purchasing.`,
        ].filter(Boolean).join('\n\n');
    };

    const getFilteredDescription = (desc, lng) => {
        const upLng = String(lng || 'KR').toUpperCase();
        if (upLng === 'EN') {
            return buildStructuredEnThFallback('EN', desc, description_en, description_th);
        }
        if (upLng === 'TH') {
            return buildStructuredEnThFallback('TH', desc, description_en, description_th);
        }
        if (!desc || desc === 'nan') return "-";

        // 3개 국어 태그 지원 ([한국어], [영어], [태국어])
        const extractBlock = (langTag) => {
            const regex = new RegExp(`\\[${langTag}\\]([\\s\\S]*?)(?=\\[(?:한국어|영어|태국어)\\]|$)`, 'i');
            const match = String(desc).match(regex);
            return match ? match[1].trim() : null;
        };

        const korPart = extractBlock('한국어');
        if (korPart) {
            return dedupeNoticeParagraphs(korPart);
        }

        // "(한국어 번역)" 텍스트를 기준으로 태국어와 한국어 분리
        const splitKeyword = "(한국어 번역)";
        if (String(desc).includes(splitKeyword)) {
            const parts = String(desc).split(splitKeyword);
            const fallbackKr = parts[1].trim();
            return dedupeNoticeParagraphs(fallbackKr || desc);
        }

        const altSplitKeyword = "한국어 번역";
        if (String(desc).includes(altSplitKeyword)) {
            const parts = String(desc).split(altSplitKeyword);
            let fallbackKr = parts[1].trim();
            if (fallbackKr.startsWith(':')) fallbackKr = fallbackKr.substring(1).trim();
            if (fallbackKr.endsWith(')')) fallbackKr = fallbackKr.substring(0, fallbackKr.length - 1).trim();
            return dedupeNoticeParagraphs(fallbackKr || desc);
        }

        return dedupeNoticeParagraphs(desc);
    };
    const filteredDesc = getFilteredDescription(description, tLang);

    const calculateDiscount = (orig, cur) => {
        if (!orig || orig <= cur) return 0;
        return Math.round(((orig - cur) / orig) * 100);
    };
    const discount = calculateDiscount(original_price, price);
    const rawPrice = Number(price);
    const hasSpecialDiscount = discount_rate && discount_rate > 0;
    const specialDiscountedPrice = hasSpecialDiscount && !isNaN(rawPrice)
        ? Math.round(rawPrice * (1 - discount_rate / 100))
        : rawPrice;
    const displayPrice = !isNaN(rawPrice) ? specialDiscountedPrice.toLocaleString() : price;

    const normalizeKakaoUrl = (rawUrl) => {
        const trimmed = String(rawUrl || '').trim();
        if (!trimmed) return '';
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
    };

    const buildInquiryMessage = () => {
        const productUrl = window.location.href;
        const cleanCode = code.startsWith('TEMP_') ? (tLang === 'TH' ? 'รอกำหนด' : tLang === 'EN' ? 'TBD' : '도착예정') : code;
        const storeLabel = product.vendor_store_name || product.vendor_code || (tLang === 'TH' ? 'ผู้ขาย' : tLang === 'EN' ? 'Seller' : '판매자');
        if (tLang === 'TH') {
            return [
                `📦 [สอบถามสินค้า GUJERO]`,
                `• ร้านค้า: ${storeLabel}`,
                `• สินค้า: [${brand}] ${displayName}`,
                size ? `• ไซส์: ${size}` : null,
                `• รหัสสินค้า: ${cleanCode}`,
                `• ราคา: ${curr}${displayPrice}`,
                `• ลิงก์สินค้า: ${productUrl}`,
                ``,
                `สวัสดีครับ/ค่ะ สนใจสอบถามสินค้าชิ้นนี้จากเว็บไซต์ GUJERO :)`
            ].filter(v => v !== null).join('\n');
        }
        if (tLang === 'EN') {
            return [
                `📦 [GUJERO Product Inquiry]`,
                `• Store: ${storeLabel}`,
                `• Item: [${brand}] ${displayName}`,
                size ? `• Size: ${size}` : null,
                `• Code: ${cleanCode}`,
                `• Price: ${curr}${displayPrice}`,
                `• Product Link: ${productUrl}`,
                ``,
                `Hello! I saw this item on GUJERO and would like to inquire about it :)`
            ].filter(v => v !== null).join('\n');
        }
        return [
            `📦 [구제로(GUJERO) 상품 문의]`,
            `• 상품명: [${brand}] ${displayName}`,
            size ? `• 사이즈: ${size}` : null,
            `• 상품코드: ${cleanCode}`,
            `• 판매가격: ${curr}${displayPrice}`,
            `• 문의 상품 링크: ${productUrl}`,
            ``,
            `안녕하세요 사장님! 위 상품 링크 보고 문의드립니다 :)`
        ].filter(v => v !== null).join('\n');
    };

    const copyTextSafe = async (text) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (err) {
            console.warn('Clipboard API 실패, fallback 시도:', err);
        }
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            return true;
        } catch (e) {
            return false;
        }
    };

    const handleInquiry = async () => {
        const textToCopy = buildInquiryMessage();
        const kakaoUrl = normalizeKakaoUrl(product.vendor_kakao_url);

        await copyTextSafe(textToCopy);
        setInquiryCopiedToast(true);
        setTimeout(() => setInquiryCopiedToast(false), 3000);

        // 자동완성된 문의 메시지 확인 + 사장님 카카오톡 연결 모달 표시
        setKakaoInquiryModal({
            text: textToCopy,
            kakaoUrl,
            storeName: product.vendor_store_name || product.vendor_code || '입점 사장님',
        });

        // 사장님 카카오톡 주소가 등록되어 있으면 즉시 새 창으로도 연결
        if (kakaoUrl) {
            window.open(kakaoUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: `[${brand}] ${displayName} - Gujero`,
            text: `ลองดูสินค้า ${brand} ${displayName} ที่ Gujero สิ!`,
            url: window.location.href,
        };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (err) { }
        } else {
            try {
                await navigator.clipboard.writeText(window.location.href);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
            } catch (err) { }
        }
    };

    const getThaiDescForSEO = (desc) => {
        if (!desc || desc === 'nan') return "";
        return getFilteredDescription(desc, 'TH');
    };

    const productSchema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": `[${brand}] ${displayName}`,
        "image": imageList,
        "description": getThaiDescForSEO(description),
        "sku": code,
        "brand": { "@type": "Brand", "name": brand || "Gujero" },
        "offers": {
            "@type": "Offer",
            "url": window.location.href,
            "priceCurrency": "KRW",
            "price": !isNaN(rawPrice) ? (specialDiscountedPrice || rawPrice) : 0,
            "availability": isSoldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
        }
    };

    const handleCarouselScroll = () => {
        if (!carouselRef.current) return;
        const scrollLeft = carouselRef.current.scrollLeft;
        const width = carouselRef.current.offsetWidth;
        const newIdx = Math.round(scrollLeft / width);
        if (newIdx !== activeImgIdx) {
            setActiveImgIdx(newIdx);
        }
    };

    const openLightbox = (idx) => {
        setLightboxImgIdx(idx);
        setIsLightboxOpen(true);
        document.body.style.overflow = 'hidden'; // 스크롤 방지
    };

    const closeLightbox = () => {
        setIsLightboxOpen(false);
        document.body.style.overflow = 'auto';
    };

    return (
        <div className="max-w-5xl mx-auto px-4 md:px-8 mt-4 pb-20">
            <Helmet>
                <title>{`[${brand}] ${displayName} - Gujero`}</title>
                <meta name="description" content={`${brand} ${displayName}: ${getThaiDescForSEO(description).substring(0, 100)} ${product.hashtags || ''}`} />
                <link rel="canonical" href={`https://www.gujero.com/product/${code}`} />
                <meta property="og:title" content={`[${brand}] ${displayName} - Gujero`} />
                <meta property="og:description" content={`가격: ${curr}${typeof price === 'number' ? price.toLocaleString() : price} - ${brand} ${displayName}`} />
                <meta property="og:image" content={imageList[0] || fallbackImg} />
                <meta property="og:url" content={window.location.href} />
                <meta name="twitter:title" content={`[${brand}] ${displayName}`} />
                <meta name="twitter:description" content={`${curr}${typeof price === 'number' ? price.toLocaleString() : price} - ${brand} ${displayName}`} />
                <meta name="twitter:image" content={imageList[0] || fallbackImg} />
                <script type="application/ld+json">
                    {JSON.stringify(productSchema)}
                </script>
            </Helmet>

            <div className="fixed top-2 right-2 w-2 h-2 bg-green-500 rounded-full z-[10001] shadow-sm animate-pulse opacity-50" title="V5-Live"></div>

            {/* Back 버튼 */}
            <button onClick={() => navigate(-1)} className="btn-minimal mb-6 border-none px-0 text-gray-400 hover:text-black bg-transparent flex items-center gap-2 text-[13px]">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                {tBack}
            </button>

            {/* ─── 제품 정보 상단 영역 (웹/모바일 동시 최적화) ─── */}
            <div className="mb-8">
                {isScheduledProduct && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm animate-pulse-slow">
                        <div className="bg-red-500 text-white rounded-full p-2.5 flex-none">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h4 className="text-red-700 font-extrabold text-[15px] md:text-[17px] mb-1">
                                {tLang === 'KR' ? '도착 예정 상품 안내 (당장 구매 불가)' : (tLang === 'TH' ? 'ประกาศสินค้ากำหนดเข้า (ไม่สามารถซื้อทันทีได้)' : 'Scheduled Product Notice (Cannot be purchased immediately)')}
                            </h4>
                            <p className="text-red-600 font-medium text-[13px] md:text-[14px]">
                                {tLang === 'KR' 
                                    ? `이 상품은 아직 입고되지 않은 "도착 예정" 상품입니다. 당장 구매는 불가능하며 도착 시점(${product.arrival_date}) 이후부터 구매가 가능합니다.`
                                    : (tLang === 'TH' 
                                        ? `สินค้านี้ยังมาไม่ถึงและยังไม่สามารถซื้อได้ในขณะนี้ จะพร้อมจำหน่ายเมื่อมาถึง (${product.arrival_date})` 
                                        : `This product has not arrived yet. It will be available for purchase after arrival (${product.arrival_date}).`)}
                            </p>
                        </div>
                    </div>
                )}
                {/* 1. 제품명 */}
                <h1 className="text-2xl md:text-4xl font-black uppercase leading-tight tracking-tight text-gray-900 mb-6 md:mb-8">
                    [{brand}] {displayName}
                </h1>

                {/* ─── 이미지 캐러셀 (웹/모바일 공통 스와이프형) ─── */}
                <div className="relative group mb-10 md:max-w-xl md:mx-auto">
                    <div className="relative -mx-4 md:mx-0 md:rounded-3xl overflow-hidden bg-gray-50 border border-gray-50 md:border-gray-200 md:shadow-sm">
                        <div 
                            ref={carouselRef}
                            onScroll={handleCarouselScroll}
                            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {imageList.map((img, idx) => (
                                <div 
                                    key={idx} 
                                    className="flex-none w-full snap-center relative aspect-[3/4] flex items-center justify-center cursor-zoom-in"
                                    onClick={() => openLightbox(idx)}
                                >
                                    <img
                                        src={img}
                                        alt={`${product.name} - ${idx + 1}`}
                                        className="w-full h-full object-contain mix-blend-multiply"
                                        loading={idx === 0 ? "eager" : "lazy"}
                                        onError={(e) => { e.target.src = fallbackImg; }}
                                    />
                                    {isSoldOut && idx === 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10">
                                            <div className="bg-white/90 text-black px-8 py-3 font-black text-xl tracking-[0.2em] shadow-xl border border-black/5 rounded-lg uppercase">
                                                {getTranslation(tLang, 'sold_out')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {/* 캐러셀 인디케이터 (Dots) */}
                        {imageList.length > 1 && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                                {imageList.map((_, idx) => (
                                    <div 
                                        key={idx}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            activeImgIdx === idx ? 'w-6 bg-black' : 'w-1.5 bg-black/20'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* 슬라이드 힌트 (모바일 전용) */}
                        {imageList.length > 1 && activeImgIdx === 0 && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-bounce-x pointer-events-none opacity-50 md:hidden">
                                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                        )}

                        {/* 데스크탑 좌우 이동 화살표 (md 이상) */}
                        {imageList.length > 1 && (
                            <>
                                <button 
                                    className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full items-center justify-center shadow-md text-black opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (carouselRef.current) {
                                            carouselRef.current.scrollBy({ left: -carouselRef.current.offsetWidth, behavior: 'smooth' });
                                        }
                                    }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button 
                                    className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full items-center justify-center shadow-md text-black opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (carouselRef.current) {
                                            carouselRef.current.scrollBy({ left: carouselRef.current.offsetWidth, behavior: 'smooth' });
                                        }
                                    }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* 2. 핵심 정보 라인 (사이즈/실측 | 코드 | 가격) - 모바일/웹 모두 가로 배치 */}
                <div className="flex flex-row justify-between items-start w-full gap-2 md:gap-6 mb-8 md:mb-10 pb-6 border-b border-gray-50">
                    {/* [좌] 사이즈 및 실측 */}
                    <div className="flex flex-col gap-3 text-gray-800 flex-[1.2]">
                        <div className="flex items-center gap-3">
                            <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px] md:text-[13px] whitespace-nowrap">
                                {getTranslation(tLang, 'size_label')}
                            </span>
                            <span className="font-black text-[15px] md:text-[18px] whitespace-nowrap">{size}</span>
                        </div>
                        {product.actual_size && String(product.actual_size).trim() !== '' && String(product.actual_size).toLowerCase() !== 'nan' && (
                            <div className="flex flex-col gap-1.5 mt-1">
                                <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px] md:text-[13px] whitespace-nowrap">
                                    {tLang === 'KR' ? '실측사이즈' : (tLang === 'TH' ? 'ขนาดจริง' : 'Actual Size')}
                                </span>
                                <div className="flex flex-col gap-1 mt-0.5">
                                    {(() => {
                                        const raw = String(product.actual_size).replace('(', '').replace(')', '').trim();
                                        if (!raw) return null;
                                        const parts = raw.includes(',') ? raw.split(',') : raw.split(/\s+/);
                                        const width = parts[0]?.trim();
                                        const length = parts[1]?.trim();
                                        const tWidth = tLang === 'KR' ? '가슴둘레(허리)' : (tLang === 'TH' ? 'รอบอก(เอว)' : 'Chest(Waist)');
                                        const tLength = tLang === 'KR' ? '총장' : (tLang === 'TH' ? 'ความยาว' : 'Total Length');
                                        return (
                                            <>
                                                {width && (
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-gray-400 font-bold text-[11px] md:text-[13px] whitespace-nowrap w-20 md:w-24">{tWidth}</span> 
                                                        <span className="font-bold text-gray-800 text-[14px] md:text-[16px] whitespace-nowrap">
                                                            {isNaN(parseFloat(width)) ? width : `${parseFloat(width)}cm (${Number((parseFloat(width) / 2.54).toFixed(1))}")`}
                                                        </span>
                                                    </div>
                                                )}
                                                {length && (
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-gray-400 font-bold text-[11px] md:text-[13px] whitespace-nowrap w-20 md:w-24">{tLength}</span> 
                                                        <span className="font-bold text-gray-800 text-[14px] md:text-[16px] whitespace-nowrap">
                                                            {isNaN(parseFloat(length)) ? length : `${parseFloat(length)}cm (${Number((parseFloat(length) / 2.54).toFixed(1))}")`}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* [중] 상품 코드 */}
                    <div className="flex flex-col items-center justify-start gap-1 flex-1 pt-1">
                        <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px] md:text-[13px] whitespace-nowrap">
                            {getTranslation(tLang, 'code_label')}
                        </span>
                        <span className="font-black text-black text-[18px] md:text-[22px] whitespace-nowrap">
                            {code.startsWith('TEMP_') ? (tLang === 'KR' ? '도착 예정' : tLang === 'TH' ? 'รอกำหนด' : 'TBD') : code}
                        </span>
                    </div>

                    {/* [우] 가격 정보 */}
                    <div className="flex flex-col items-end flex-[1.5]">
                        {Number(original_price) > 0 && (
                            <span className="text-[13px] md:text-[16px] text-gray-400 line-through font-medium italic mb-0.5">
                                {curr}{Number(original_price).toLocaleString()}
                            </span>
                        )}
                        {Boolean(discount > 0 || hasSpecialDiscount) && !isNaN(rawPrice) && (
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-red-500 text-[10px] md:text-[12px] font-black uppercase italic whitespace-nowrap">
                                    {hasSpecialDiscount ? `SALE -${discount_rate}%` : `SALE -${discount}%`}
                                </span>
                                <span className="text-[9px] md:text-[10px] text-gray-300 whitespace-nowrap">*{tReleasePrice}*</span>
                            </div>
                        )}
                        <span className="text-3xl md:text-5xl font-black text-black tracking-tighter leading-none mt-1 whitespace-nowrap">
                            {curr}{displayPrice}
                        </span>
                    </div>
                </div>

                {/* 3. 액션 버튼 라인 (가로 1열 유지) */}
                <div className="flex flex-col gap-3 mb-10">
                    <div className="flex flex-row items-center gap-2 md:gap-3 h-10 md:h-12 w-full">
                        {/* 1. Wishlist 버튼 (가장 좌측 고정 사이즈) */}
                        <button 
                            onClick={() => toggleWishlist(code)}
                            className={`w-12 md:w-14 h-full flex-none rounded-lg transition-all flex items-center justify-center shadow-sm border ${
                                isWished(code) 
                                ? 'bg-red-50 border-red-200 text-red-500' 
                                : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                            }`}
                        >
                            <svg className={`w-5 h-5 md:w-6 md:h-6 ${isWished(code) ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                {isWished(code) && (
                                    <path stroke="none" fill="currentColor" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                )}
                            </svg>
                        </button>

                        {/* 2. 장바구니 버튼 (flex-1) */}
                        {isReserved ? (
                            <button
                                disabled
                                className="flex-1 h-full font-black rounded-lg bg-blue-100 text-blue-500 cursor-not-allowed flex items-center justify-center gap-2 text-[11px] md:text-[13px] uppercase tracking-wider border border-blue-200"
                            >
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                {tLang === 'KR' ? '예약 완료' : tLang === 'TH' ? 'จองแล้ว' : 'Reserved'}
                            </button>
                        ) : isScheduledProduct ? (
                            <button
                                disabled
                                className="flex-1 h-full font-black rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed flex items-center justify-center gap-2 text-[11px] md:text-[13px] uppercase tracking-wider border border-gray-200"
                            >
                                {tLang === 'KR' ? '도착 전 구매 불가' : (tLang === 'TH' ? 'ยังไม่สามารถซื้อได้' : 'Cannot buy yet')}
                            </button>
                        ) : isPreorderTarget ? (
                            isLoggedIn ? (
                                <button
                                    onClick={async () => {
                                        const success = await addItem(product);
                                        if (success) {
                                            setAddedToCart(true);
                                            setTimeout(() => setAddedToCart(false), 2000);
                                        }
                                    }}
                                    className={`flex-1 h-full font-black rounded-lg transition-all flex items-center justify-center gap-2 text-[11px] md:text-[13px] uppercase tracking-wider ${
                                        addedToCart ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100'
                                    }`}
                                >
                                    {addedToCart 
                                        ? (tLang === 'KR' ? '예약 장바구니 추가됨' : tLang === 'TH' ? 'เพิ่มในตะกร้าจองแล้ว' : 'Added') 
                                        : (tLang === 'KR' ? '구매예약 신청' : tLang === 'TH' ? 'สั่งจองล่วงหน้า' : 'Preorder')}
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate(`/login?lang=${lang}&redirect=/product/${code}`)}
                                    className="flex-1 h-full font-black rounded-lg bg-gray-800 hover:bg-black text-white transition-all flex items-center justify-center gap-2 text-[11px] md:text-[13px] uppercase tracking-wider"
                                >
                                    {tLang === 'KR' ? '로그인 후 구매예약' : tLang === 'TH' ? 'เข้าสู่ระบบเพื่อสั่งจอง' : 'Login to Preorder'}
                                </button>
                            )
                        ) : (
                            <button
                                onClick={async () => {
                                    if (isSoldOut) return;
                                    const success = await addItem(product);
                                    if (success) {
                                        setAddedToCart(true);
                                        setTimeout(() => setAddedToCart(false), 2000);
                                    }
                                }}
                                disabled={isSoldOut}
                                className={`flex-1 h-full font-black rounded-lg transition-all flex items-center justify-center gap-2 text-[11px] md:text-[13px] uppercase tracking-wider ${
                                    isSoldOut ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : addedToCart ? 'bg-green-600 text-white' : 'bg-[#12151f] hover:bg-black text-white shadow-lg shadow-gray-200'
                                }`}
                            >
                                {isSoldOut ? getTranslation(tLang, 'sold_out') : (addedToCart ? getTranslation(tLang, 'added_to_cart') : getTranslation(tLang, 'add_to_cart'))}
                            </button>
                        )}

                        {/* 3. 카카오톡 문의 버튼 (업로드한 각 사장님의 카카오톡으로 연결 + 상품 링크/정보 자동완성) */}
                        {!isSoldOut && (
                            <button 
                                onClick={handleInquiry}
                                className="flex-1 h-full bg-[#FEE500] hover:bg-[#F4DC00] text-[#371D1E] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 text-[11px] md:text-[13px] shadow-sm px-2 border border-[#E5CE00]"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 md:w-4.5 md:h-4.5 flex-none">
                                    <path d="M12 3C6.477 3 2 6.477 2 10.765c0 2.772 1.868 5.205 4.682 6.57-.154.553-.992 3.553-1.028 3.788 0 0-.02.167.088.231.108.064.235.015.235.015.31-.043 3.593-2.353 4.162-2.753.602.087 1.224.134 1.861.134 5.523 0 10-3.477 10-7.765S17.523 3 12 3z" />
                                </svg>
                                <span className="whitespace-nowrap">
                                    {tLang === 'KR' ? '카카오톡 문의' : tLang === 'TH' ? 'สอบถามทาง KakaoTalk' : 'KakaoTalk Inquiry'}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* 추가 안내 문구 */}
                    {isPreorderTarget && !isScheduledProduct && (
                        <div className="text-[11px] md:text-[12px] text-blue-600 font-medium bg-blue-50/50 border border-blue-100/50 rounded-lg px-3 py-2 flex items-center gap-1.5">
                            <span className="text-sm">ℹ️</span>
                            {tLang === 'KR' 
                                ? '현재 가격 미정 상품으로, 구매예약 후 관리자가 최종 가격을 책정한 뒤 주문이 확정됩니다.' 
                                : tLang === 'TH'
                                    ? 'สินค้านี้ยังไม่ได้กำหนดราคา หลังจากสั่งจองแล้วผู้ดูแลจะแจ้งราคาสุทธิและยืนยันคำสั่งซื้อ'
                                    : 'This item has no fixed price yet. After booking, the admin will set the final price and confirm your preorder.'}
                        </div>
                    )}
                    {isReserved && (
                        <div className="text-[11px] md:text-[12px] text-gray-500 font-medium bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
                            <span className="text-sm">🔒</span>
                            {tLang === 'KR'
                                ? '이 상품은 이미 다른 고객님의 구매예약이 확정된 상태입니다.'
                                : tLang === 'TH'
                                    ? 'สินค้าชิ้นนี้ถูกจองโดยลูกค้าท่านอื่นเรียบร้อยแล้ว'
                                    : 'This item has already been reserved by another customer.'}
                        </div>
                    )}
                </div>

                {/* 4. 스타일 & 해시태그 */}
                <div className="flex flex-col gap-4 md:gap-6">
                    {product.style && (
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] md:text-[12px] font-bold text-gray-300 uppercase tracking-[0.2em] whitespace-nowrap">Fashion Style</span>
                            <span className="px-6 md:px-8 py-2 md:py-2.5 bg-gray-50 text-gray-900 rounded-full text-[12px] md:text-[14px] font-black uppercase tracking-wider border border-gray-100">
                                {product.style}
                            </span>
                        </div>
                    )}
                    {product.hashtags && (
                        <div className="flex flex-wrap gap-x-3 md:gap-x-4 gap-y-1 md:gap-y-2">
                            {product.hashtags.split(' ').map((tag, idx) => (
                                <span key={idx} className="text-black text-[13px] md:text-[15px] font-bold hover:underline transition-all cursor-default">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 5. 상세 설명 */}
            <div className="mb-16">
                <h3 className="font-bold mb-4 uppercase tracking-[0.2em] text-[11px] md:text-[13px] text-gray-300">{getTranslation(tLang, 'description_label')}</h3>
                <p className="text-gray-800 leading-[1.8] text-[16px] md:text-[17px] whitespace-pre-wrap font-medium">
                    {filteredDesc}
                </p>
            </div>

            {/* ─── 라이트박스 모달 (전체 화면 확대) ─── */}
            {isLightboxOpen && (
                <div 
                    className="fixed inset-0 z-[20000] bg-black/95 flex flex-col items-center justify-center p-4 md:p-10 animate-in fade-in duration-200"
                    onClick={closeLightbox}
                >
                    {/* 닫기 버튼 */}
                    <button 
                        className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-[20001]"
                        onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
                    >
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* 확대된 이미지 */}
                    <div 
                        className="relative max-w-full max-h-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img 
                            src={imageList[lightboxImgIdx]} 
                            alt="Full View" 
                            className="max-w-full max-h-[85vh] object-contain select-none shadow-2xl"
                        />
                        
                        {/* 이미지 이동 버튼 (이미지가 여러 개일 때) */}
                        {imageList.length > 1 && (
                            <>
                                <button 
                                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full md:-translate-x-16 p-4 text-white/30 hover:text-white transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxImgIdx((prev) => (prev - 1 + imageList.length) % imageList.length);
                                    }}
                                >
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button 
                                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full md:translate-x-16 p-4 text-white/30 hover:text-white transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxImgIdx((prev) => (prev + 1) % imageList.length);
                                    }}
                                >
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </>
                        )}
                    </div>

                    {/* 이미지 정보 / 하단 인디케이터 */}
                    <div className="mt-8 text-white/50 text-sm font-bold tracking-widest uppercase">
                        {lightboxImgIdx + 1} / {imageList.length}
                    </div>
                </div>
            )}

            {/* ─── 카카오톡 상품 문의 자동완성 & 연결 모달 ─── */}
            {kakaoInquiryModal && (
                <div
                    className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                    onClick={() => setKakaoInquiryModal(null)}
                >
                    <div
                        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-[#FEE500] px-5 py-4 flex items-center justify-between text-[#371D1E]">
                            <div className="flex items-center gap-2 font-black text-base">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M12 3C6.477 3 2 6.477 2 10.765c0 2.772 1.868 5.205 4.682 6.57-.154.553-.992 3.553-1.028 3.788 0 0-.02.167.088.231.108.064.235.015.235.015.31-.043 3.593-2.353 4.162-2.753.602.087 1.224.134 1.861.134 5.523 0 10-3.477 10-7.765S17.523 3 12 3z" />
                                </svg>
                                <span>
                                    {tLang === 'TH'
                                        ? 'เชื่อมต่อแชท KakaoTalk กับผู้ขาย'
                                        : tLang === 'EN'
                                            ? 'Seller KakaoTalk Product Inquiry'
                                            : '사장님 카카오톡 상품 문의 연결'}
                                </span>
                            </div>
                            <button
                                onClick={() => setKakaoInquiryModal(null)}
                                className="w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center font-bold text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-emerald-900 text-xs font-bold leading-relaxed flex items-start gap-2">
                                <span className="text-base leading-none">✅</span>
                                <div>
                                    {tLang === 'TH' ? (
                                        <>คัดลอกข้อมูลสินค้าและลิงก์ไปยังคลิปบอร์ดเรียบร้อยแล้ว!<br />กรุณาวางข้อความ (<b>Paste / Ctrl+V</b>) ในห้องแชท KakaoTalk เพื่อสอบถามผู้ขาย</>
                                    ) : tLang === 'EN' ? (
                                        <>Product details and link have been <b>automatically copied to your clipboard</b>!<br />Simply <b>paste (Ctrl+V or Long Press → Paste)</b> into the KakaoTalk chat room and send.</>
                                    ) : (
                                        <>어떤 상품에서 문의하셨는지 사장님이 바로 알아보실 수 있도록 <b>아래 상품 정보와 링크가 클립보드에 자동 완성(복사)</b>되었습니다!<br />열린 카카오톡 채팅방 입력창에 <b>붙여넣기(Ctrl+V 또는 길게 눌러 붙여넣기)</b> 후 전송해 주세요.</>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-black text-gray-700">
                                        {tLang === 'TH'
                                            ? '📋 ข้อความสอบถามอัตโนมัติ (คัดลอกแล้ว)'
                                            : tLang === 'EN'
                                                ? '📋 Auto-Completed Inquiry Message (Copied)'
                                                : '📋 자동 완성된 문의 메시지 (복사 완료)'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await copyTextSafe(kakaoInquiryModal.text);
                                            setInquiryCopiedToast(true);
                                            setTimeout(() => setInquiryCopiedToast(false), 2500);
                                        }}
                                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
                                    >
                                        {inquiryCopiedToast
                                            ? (tLang === 'TH' ? '✓ คัดลอกแล้ว!' : tLang === 'EN' ? '✓ Copied!' : '✓ 복사됨!')
                                            : (tLang === 'TH' ? 'คัดลอกอีกครั้ง' : tLang === 'EN' ? 'Copy Again' : '다시 복사')}
                                    </button>
                                </div>
                                <pre className="w-full p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-800 whitespace-pre-wrap break-all font-sans leading-relaxed max-h-48 overflow-y-auto">
                                    {kakaoInquiryModal.text}
                                </pre>
                            </div>

                            {kakaoInquiryModal.kakaoUrl ? (
                                <a
                                    href={kakaoInquiryModal.kakaoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={async () => {
                                        await copyTextSafe(kakaoInquiryModal.text);
                                    }}
                                    className="w-full py-3.5 px-4 bg-[#FEE500] hover:bg-[#F4DC00] text-[#371D1E] font-black rounded-2xl shadow-sm flex items-center justify-center gap-2 text-sm transition-all border border-[#E5CE00]"
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M12 3C6.477 3 2 6.477 2 10.765c0 2.772 1.868 5.205 4.682 6.57-.154.553-.992 3.553-1.028 3.788 0 0-.02.167.088.231.108.064.235.015.235.015.31-.043 3.593-2.353 4.162-2.753.602.087 1.224.134 1.861.134 5.523 0 10-3.477 10-7.765S17.523 3 12 3z" />
                                    </svg>
                                    <span>
                                        {tLang === 'TH'
                                            ? `เปิดแชท KakaoTalk ของ ${kakaoInquiryModal.storeName}`
                                            : tLang === 'EN'
                                                ? `Open ${kakaoInquiryModal.storeName} KakaoTalk Chat`
                                                : `${kakaoInquiryModal.storeName} 카카오톡 채팅방 열기`}
                                    </span>
                                </a>
                            ) : (
                                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold leading-relaxed text-center">
                                    {tLang === 'TH' ? (
                                        <>⚠️ ผู้ขายยังไม่ได้ตั้งค่าลิงก์ KakaoTalk สำหรับร้านค้านี้</>
                                    ) : tLang === 'EN' ? (
                                        <>⚠️ The seller has not configured a KakaoTalk chat link for this store yet.</>
                                    ) : (
                                        <>⚠️ 이 상품을 업로드한 사장님의 카카오톡 상담 주소가 아직 설정되지 않았습니다.<br />(사장님께서 [마이페이지 → 매장 프로필 관리] 또는 [밴드어드민 → 오픈마켓 설정]에서 카카오톡 주소를 입력하시면 즉시 연결됩니다.)</>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setKakaoInquiryModal(null)}
                                className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
                            >
                                {tLang === 'TH' ? 'ปิด' : tLang === 'EN' ? 'Close' : '닫기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── 하단 멘트 (정품 안내 및 문의) ─── */}
            <div className="mt-16 text-center py-10 border-t border-gray-100">
                <p className="text-gray-500 text-sm md:text-base font-medium leading-relaxed max-w-lg mx-auto">
                    {getTranslation(tLang, 'authentic_notice')}
                </p>
            </div>
        </div>
    );
};

export default DetailPage;
