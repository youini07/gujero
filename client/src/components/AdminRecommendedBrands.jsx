import { useState, useEffect, useRef, useMemo } from 'react';
import { parseBrandNames, formatBrandGroupTitle } from '../services/brandGroup';

/**
 * [AdminRecommendedBrands.jsx]
 * 관리자 페이지의 '추천 브랜드 관리' 컴포넌트입니다.
 * 왜 단일 드롭다운에서 다중 선택 체크박스 + 직접 추가 구조로 개선했는가:
 * 'High-end street brands'처럼 하나의 히어로 배너 안에 Stone Island, C.P. Company, Off-White 등
 * 여러 브랜드를 함께 묶어 큐레이션하고 싶을 때 카드가 여러 개로 쪼개지지 않고 한 그룹 카드 안에서
 * 통합 관리·노출되도록 하기 위함입니다.
 */
const AdminRecommendedBrands = () => {
    const [brands, setBrands] = useState([]);
    const [availableBrands, setAvailableBrands] = useState({});
    const [activeBrandSet, setActiveBrandSet] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // 다중 브랜드 검색 및 카테고리 탭 필터 상태
    const [brandSearch, setBrandSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');

    // 폼 상태
    const [formData, setFormData] = useState(createInitialFormData);
    const formRef = useRef(null);

    function createInitialFormData() {
        return {
            id: null,
            group_name: '',
            selected_brands: [],
            description_kr: '',
            description_en: '',
            description_th: '',
            hero_image_url: '',
            logo_url: '',
            sort_order: 0,
        };
    }

    useEffect(() => {
        fetchBrands();
        fetchAvailableBrands();
    }, []);

    // 왜 include_preset=true 파라미터를 전달하는가:
    // 현재 재고가 일시 품절이거나 입고 예정인 브랜드(예: Stone Island)도 관리자가 미리 추천 그룹에
    // 포함해 둘 수 있도록 표준 브랜드 사전과 전체 DB 브랜드를 함께 불러오기 위함입니다.
    const fetchAvailableBrands = async () => {
        try {
            const res = await fetch('/api/brands/categorized?include_preset=true&t=' + Date.now());
            const data = await res.json();
            if (data.success && data.categorized) {
                setAvailableBrands(data.categorized);
                const liveSet = new Set(
                    (data.activeBrands || []).map((b) => String(b || '').trim().toLowerCase()).filter(Boolean)
                );
                setActiveBrandSet(liveSet);
            }
        } catch (err) {
            console.error('Failed to fetch available brands:', err);
        }
    };

    const fetchBrands = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/recommended_brands');
            const data = await res.json();
            if (data.success) {
                setBrands(data.brands || []);
            }
        } catch (err) {
            console.error('Failed to fetch recommended brands:', err);
            alert('데이터를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 카테고리 탭 및 검색어에 따라 화면에 표시할 브랜드 체크박스 후보 목록 계산
    const filteredBrandOptions = useMemo(() => {
        const keyword = brandSearch.trim().toLowerCase();
        const pool = [];
        const seen = new Set();

        const categoriesToScan =
            selectedCategory === 'ALL'
                ? Object.keys(availableBrands)
                : [selectedCategory];

        categoriesToScan.forEach((cat) => {
            (availableBrands[cat] || []).forEach((bName) => {
                const cleaned = String(bName || '').trim();
                if (!cleaned) return;
                const lower = cleaned.toLowerCase();
                if (seen.has(lower)) return;
                if (keyword && !lower.includes(keyword)) return;
                seen.add(lower);
                pool.push({ name: cleaned, category: cat });
            });
        });

        // 관리자가 직접 추가했거나 기존 DB에 들어있던 브랜드가 프리셋 목록에 없더라도 체크박스에서 확인할 수 있게 병합
        formData.selected_brands.forEach((selectedName) => {
            const lower = selectedName.toLowerCase();
            if (seen.has(lower)) return;
            if (keyword && !lower.includes(keyword)) return;
            if (selectedCategory !== 'ALL') return;
            seen.add(lower);
            pool.push({ name: selectedName, category: '직접 추가' });
        });

        return pool.sort((a, b) => {
            // 현재 재고가 있는 브랜드를 상단에 우선 배치해 관리 편의성 향상
            const aActive = activeBrandSet.has(a.name.toLowerCase()) ? 1 : 0;
            const bActive = activeBrandSet.has(b.name.toLowerCase()) ? 1 : 0;
            if (aActive !== bActive) return bActive - aActive;
            return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
        });
    }, [availableBrands, selectedCategory, brandSearch, formData.selected_brands, activeBrandSet]);

    // 동일한 그룹명으로 여러 개의 카드가 중복 생성된 경우를 감지 (원클릭 병합 지원용)
    const duplicateGroups = useMemo(() => {
        const map = new Map();
        brands.forEach((item) => {
            const key = String(item.group_name || '').trim().toLowerCase();
            if (!key) return;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
        });
        return Array.from(map.values()).filter((items) => items.length >= 2);
    }, [brands]);

    // 브랜드 개별 토글 (대소문자 중복 방지)
    const toggleBrandSelection = (brandName) => {
        const cleaned = String(brandName || '').trim();
        if (!cleaned) return;

        setFormData((prev) => {
            const exists = prev.selected_brands.some(
                (b) => b.toLowerCase() === cleaned.toLowerCase()
            );
            const nextSelected = exists
                ? prev.selected_brands.filter((b) => b.toLowerCase() !== cleaned.toLowerCase())
                : [...prev.selected_brands, cleaned];
            return { ...prev, selected_brands: nextSelected };
        });
    };

    // 검색창에서 새 브랜드명을 직접 추가할 때 호출
    const handleAddCustomBrand = () => {
        const customInput = brandSearch.trim();
        if (!customInput) return;

        // 쉼표로 여러 개를 한 번에 붙여넣은 경우(예: "Stone Island, C.P. Company")도 자동 분리 지원
        const parsedCustom = parseBrandNames(customInput);
        if (parsedCustom.length === 0) return;

        setFormData((prev) => {
            const merged = parseBrandNames([...prev.selected_brands, ...parsedCustom]);
            return { ...prev, selected_brands: merged };
        });
        setBrandSearch('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedGroupName = (formData.group_name || '').trim();
        const normalizedList = parseBrandNames(formData.selected_brands);

        if (!trimmedGroupName || normalizedList.length === 0) {
            alert('그룹명과 최소 1개 이상의 브랜드를 선택해주세요.');
            return;
        }

        const payload = {
            ...formData,
            group_name: trimmedGroupName,
            brand_names: normalizedList,
            brand_name: normalizedList.join(', '),
        };

        const url = isEditing
            ? `/api/admin/recommended_brands/${formData.id}`
            : '/api/admin/recommended_brands';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                alert(isEditing ? '추천 브랜드 그룹이 수정되었습니다.' : '새 추천 브랜드 그룹이 추가되었습니다.');
                setFormData(createInitialFormData());
                setBrandSearch('');
                setIsEditing(false);
                fetchBrands();
            } else {
                alert('오류 발생: ' + (data.message || '저장 실패'));
            }
        } catch (err) {
            console.error(err);
            alert('서버 통신 중 오류가 발생했습니다.');
        }
    };

    const handleEdit = (brand) => {
        setFormData({
            id: brand.id,
            group_name: brand.group_name || '',
            selected_brands: parseBrandNames(brand.brand_name),
            description_kr: brand.description_kr || '',
            description_en: brand.description_en || '',
            description_th: brand.description_th || '',
            hero_image_url: brand.hero_image_url || '',
            logo_url: brand.logo_url || '',
            sort_order: brand.sort_order || 0,
        });
        setIsEditing(true);
        if (formRef.current) {
            const y = formRef.current.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;
        try {
            const res = await fetch(`/api/admin/recommended_brands/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                alert('삭제되었습니다.');
                if (isEditing && formData.id === id) {
                    setIsEditing(false);
                    setFormData(createInitialFormData());
                }
                fetchBrands();
            } else {
                alert('삭제 실패: ' + data.message);
            }
        } catch (err) {
            console.error(err);
            alert('서버 오류');
        }
    };

    // 왜 중복 그룹 병합 기능을 제공하는가:
    // 기존 단일 선택 UI 때문에 동일한 그룹명(예: High-end street brands)으로 나뉘어 저장된 카드들을
    // 관리자가 일일이 재입력하지 않고 클릭 한 번으로 하나의 다중 브랜드 카드로 합칠 수 있도록 돕기 위함입니다.
    const handleMergeDuplicateGroup = async (groupItems) => {
        if (!groupItems || groupItems.length < 2) return;
        const groupTitle = groupItems[0].group_name;
        const mergedBrandList = parseBrandNames(
            groupItems.flatMap((item) => parseBrandNames(item.brand_name))
        );

        const confirmMsg =
            `"${groupTitle}" 그룹의 카드 ${groupItems.length}개를 하나로 합치시겠습니까?\n\n` +
            `통합 브랜드: ${mergedBrandList.join(', ')}\n` +
            `(첫 번째 카드의 이미지·설명을 유지하고 중복 카드는 정리됩니다.)`;
        if (!window.confirm(confirmMsg)) return;

        // 노출 순서가 빠르거나 먼저 생성된 대표 카드를 기준으로 병합
        const primary = groupItems[0];
        const others = groupItems.slice(1);
        const pickFirstFilled = (field) => {
            const found = groupItems.find((it) => String(it[field] || '').trim() !== '');
            return found ? found[field] : '';
        };

        try {
            const updateRes = await fetch(`/api/admin/recommended_brands/${primary.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    group_name: primary.group_name,
                    brand_names: mergedBrandList,
                    brand_name: mergedBrandList.join(', '),
                    description_kr: pickFirstFilled('description_kr'),
                    description_en: pickFirstFilled('description_en'),
                    description_th: pickFirstFilled('description_th'),
                    hero_image_url: pickFirstFilled('hero_image_url'),
                    logo_url: pickFirstFilled('logo_url'),
                    sort_order: Math.min(...groupItems.map((it) => Number(it.sort_order) || 0)),
                }),
            });
            const updateData = await updateRes.json();
            if (!updateData.success) {
                alert('병합 중 오류가 발생했습니다: ' + (updateData.message || ''));
                return;
            }

            for (const dup of others) {
                await fetch(`/api/admin/recommended_brands/${dup.id}`, { method: 'DELETE' });
            }

            alert(`"${groupTitle}" 그룹이 하나의 카드로 통합되었습니다! 추가할 브랜드가 있다면 [수정] 버튼을 눌러 더 선택하실 수 있습니다.`);
            fetchBrands();
        } catch (err) {
            console.error('Merge duplicate group error:', err);
            alert('카드 병합 중 서버 통신 오류가 발생했습니다.');
        }
    };

    const handleImageUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('image', file);

        try {
            const res = await fetch('/api/admin/upload_banner', {
                method: 'POST',
                body: uploadData,
            });
            const data = await res.json();
            if (data.success) {
                setFormData((prev) => ({ ...prev, [field]: data.imageUrl }));
            } else {
                alert('업로드 실패: ' + data.message);
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('이미지 업로드 중 오류가 발생했습니다.');
        }
    };

    const categoryKeys = Object.keys(availableBrands);

    return (
        <div className="p-4 text-sm space-y-12">
            {/* 등록 / 수정 폼 */}
            <div ref={formRef} className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">
                        {isEditing ? '추천 브랜드 그룹 수정' : '새 추천 브랜드 그룹 추가'}
                    </h3>
                    {isEditing && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                            수정 중 (ID: {formData.id})
                        </span>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-gray-700 font-bold mb-1">그룹명 *</label>
                        <input
                            type="text"
                            className="w-full border p-2.5 rounded focus:outline-none focus:border-black"
                            value={formData.group_name}
                            onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                            placeholder="예: High-end street brands / 주목받는 하이패션 브랜드"
                            required
                        />
                    </div>

                    {/* 다중 브랜드 선택 영역 */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/60 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="text-gray-800 font-bold flex items-center gap-2">
                                <span>그룹 내 포함할 브랜드 선택 (다중 선택 가능) *</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-black text-white font-bold">
                                    {formData.selected_brands.length}개 선택됨
                                </span>
                            </label>
                            {formData.selected_brands.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setFormData((prev) => ({ ...prev, selected_brands: [] }))}
                                    className="text-xs text-red-500 hover:text-red-700 font-bold underline"
                                >
                                    전체 선택 해제
                                </button>
                            )}
                        </div>

                        {/* 선택된 브랜드 태그(Chip) 표시 */}
                        <div className="min-h-[42px] p-2.5 bg-white border border-gray-200 rounded-lg flex flex-wrap items-center gap-1.5">
                            {formData.selected_brands.length === 0 ? (
                                <span className="text-xs text-gray-400">
                                    아래 목록에서 한 그룹에 묶을 브랜드들을 체크해주세요. (예: Stone Island, C.P. Company, Off-White)
                                </span>
                            ) : (
                                formData.selected_brands.map((bName) => (
                                    <span
                                        key={bName}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-white text-xs font-bold shadow-sm"
                                    >
                                        {bName}
                                        <button
                                            type="button"
                                            onClick={() => toggleBrandSelection(bName)}
                                            className="text-gray-300 hover:text-white leading-none font-black"
                                            title="선택 해제"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))
                            )}
                        </div>

                        {/* 브랜드 검색 및 직접 추가 입력창 */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 border border-gray-300 bg-white px-3 py-2 rounded text-sm focus:outline-none focus:border-black"
                                value={brandSearch}
                                onChange={(e) => setBrandSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCustomBrand();
                                    }
                                }}
                                placeholder="브랜드 검색 또는 직접 입력 (쉼표로 여러 개 입력 후 '+ 직접 추가' 가능)"
                            />
                            <button
                                type="button"
                                onClick={handleAddCustomBrand}
                                disabled={!brandSearch.trim()}
                                className="px-4 py-2 rounded bg-gray-800 hover:bg-black disabled:bg-gray-300 text-white text-xs font-bold whitespace-nowrap transition"
                            >
                                + 직접 추가
                            </button>
                        </div>

                        {/* 카테고리 빠른 필터 탭 */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('ALL')}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold border transition ${
                                    selectedCategory === 'ALL'
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                }`}
                            >
                                전체
                            </button>
                            {categoryKeys.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition ${
                                        selectedCategory === cat
                                            ? 'bg-black text-white border-black'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                    }`}
                                >
                                    {cat} ({(availableBrands[cat] || []).length})
                                </button>
                            ))}
                        </div>

                        {/* 다중 선택 체크박스 그리드 */}
                        <div className="max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg p-3">
                            {filteredBrandOptions.length === 0 ? (
                                <div className="py-6 text-center text-xs text-gray-400">
                                    검색 결과와 일치하는 브랜드가 없습니다. 상단 <b>[+ 직접 추가]</b> 버튼을 눌러 바로 추가하실 수 있습니다.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {filteredBrandOptions.map(({ name: bName }) => {
                                        const isChecked = formData.selected_brands.some(
                                            (sel) => sel.toLowerCase() === bName.toLowerCase()
                                        );
                                        const hasLiveStock = activeBrandSet.has(bName.toLowerCase());
                                        return (
                                            <label
                                                key={bName}
                                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded border cursor-pointer text-xs select-none transition ${
                                                    isChecked
                                                        ? 'bg-gray-900 text-white border-gray-900 font-bold'
                                                        : 'bg-gray-50/70 hover:bg-gray-100 text-gray-700 border-gray-200'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleBrandSelection(bName)}
                                                    className="accent-black rounded shrink-0"
                                                />
                                                <span className="truncate flex-1" title={bName}>
                                                    {bName}
                                                </span>
                                                {hasLiveStock && (
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                            isChecked ? 'bg-emerald-300' : 'bg-emerald-500'
                                                        }`}
                                                        title="현재 판매중 상품 보유 브랜드"
                                                    />
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-500">
                            💡 초록색 점(●)은 현재 재고 상품이 등록된 브랜드이며, 점이 없는 브랜드도 미리 그룹에 함께 묶어둘 수 있습니다.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 font-bold mb-1">
                                히어로(배경) 이미지{' '}
                                <span className="text-sm font-normal text-gray-500">(권장: 800 x 1200px 등 세로형)</span>
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    className="flex-1 border p-2 rounded"
                                    value={formData.hero_image_url}
                                    onChange={(e) => setFormData({ ...formData, hero_image_url: e.target.value })}
                                    placeholder="이미지 업로드 또는 URL 직접 입력"
                                />
                                <label className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded font-bold whitespace-nowrap">
                                    파일 선택
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload(e, 'hero_image_url')}
                                    />
                                </label>
                            </div>
                            {formData.hero_image_url && (
                                <img
                                    src={formData.hero_image_url}
                                    alt="hero preview"
                                    className="mt-2 h-24 object-contain border rounded p-1"
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-1">
                                브랜드/그룹 로고 이미지{' '}
                                <span className="text-sm font-normal text-gray-500">(권장: 400 x 400px 등 정방형)</span>
                            </label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    className="flex-1 border p-2 rounded"
                                    value={formData.logo_url}
                                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                                    placeholder="이미지 업로드 또는 URL 직접 입력"
                                />
                                <label className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded font-bold whitespace-nowrap">
                                    파일 선택
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload(e, 'logo_url')}
                                    />
                                </label>
                            </div>
                            {formData.logo_url && (
                                <img
                                    src={formData.logo_url}
                                    alt="logo preview"
                                    className="mt-2 h-16 w-16 object-contain border rounded-full p-1 bg-white"
                                />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mt-2 border-t pt-4">
                        <p className="text-gray-500 font-bold mb-2">언어별 그룹/브랜드 설명 멘트 (직접 입력)</p>
                        <div>
                            <label className="block text-gray-700 font-bold mb-1">한국어 설명 (KR)</label>
                            <textarea
                                className="w-full border p-2 rounded text-sm"
                                rows="2"
                                value={formData.description_kr}
                                onChange={(e) => setFormData({ ...formData, description_kr: e.target.value })}
                                placeholder="브랜드 그룹에 대한 설명을 입력하세요."
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-1">태국어 설명 (TH)</label>
                            <textarea
                                className="w-full border p-2 rounded text-sm"
                                rows="2"
                                value={formData.description_th}
                                onChange={(e) => setFormData({ ...formData, description_th: e.target.value })}
                                placeholder="번역기를 활용하여 태국어 설명을 입력하세요."
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-1">영어 설명 (EN)</label>
                            <textarea
                                className="w-full border p-2 rounded text-sm"
                                rows="2"
                                value={formData.description_en}
                                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                                placeholder="번역기를 활용하여 영어 설명을 입력하세요."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-1">노출 순서 (작을수록 상단)</label>
                        <input
                            type="number"
                            className="w-full border p-2 rounded"
                            value={formData.sort_order}
                            onChange={(e) =>
                                setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 0 })
                            }
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="submit"
                            className="bg-black text-white px-6 py-2.5 rounded font-bold flex-1 hover:bg-gray-800 transition"
                        >
                            {isEditing ? '수정 완료' : '추천 브랜드 그룹 추가'}
                        </button>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(false);
                                    setFormData(createInitialFormData());
                                    setBrandSearch('');
                                }}
                                className="bg-gray-200 text-gray-800 px-6 py-2.5 rounded font-bold flex-1 hover:bg-gray-300 transition"
                            >
                                취소
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* 등록된 추천 브랜드 리스트 */}
            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <h3 className="text-lg font-bold mb-4">등록된 추천 브랜드 목록</h3>

                {/* 동일 그룹명으로 나뉘어 등록된 카드 원클릭 통합 안내 */}
                {duplicateGroups.length > 0 && (
                    <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                        {duplicateGroups.map((groupItems) => {
                            const gName = groupItems[0].group_name;
                            const previewBrands = parseBrandNames(
                                groupItems.flatMap((it) => parseBrandNames(it.brand_name))
                            );
                            return (
                                <div
                                    key={gName}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900"
                                >
                                    <div>
                                        <span className="font-bold">💡 동일 그룹 감지:</span>{' '}
                                        <b>{gName}</b> 그룹에 카드 {groupItems.length}개({previewBrands.join(', ')})가 각각 나뉘어 있습니다.
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleMergeDuplicateGroup(groupItems)}
                                        className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold whitespace-nowrap transition"
                                    >
                                        하나의 카드로 합치기
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {loading ? (
                    <p>로딩중...</p>
                ) : brands.length === 0 ? (
                    <p className="text-gray-500">등록된 추천 브랜드가 없습니다.</p>
                ) : (
                    <div className="space-y-4">
                        {brands.map((brand) => {
                            const brandList = parseBrandNames(brand.brand_name);
                            return (
                                <div
                                    key={brand.id}
                                    className="border p-4 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50"
                                >
                                    <div className="flex-1 flex gap-4 items-start">
                                        <div className="w-20 h-28 bg-gray-200 rounded shrink-0 overflow-hidden relative">
                                            {brand.hero_image_url ? (
                                                <img
                                                    src={brand.hero_image_url}
                                                    alt="hero"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                                    NO IMG
                                                </div>
                                            )}
                                            {brand.logo_url && (
                                                <div className="absolute inset-0 m-auto w-10 h-10 bg-white rounded-full p-1 shadow-md">
                                                    <img
                                                        src={brand.logo_url}
                                                        alt="logo"
                                                        className="w-full h-full object-contain rounded-full"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-400 mb-1">
                                                {brand.group_name}
                                            </div>
                                            <h4 className="font-bold text-lg mb-1.5">
                                                {formatBrandGroupTitle(brandList) || brand.brand_name}
                                            </h4>
                                            {brandList.length > 1 && (
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {brandList.map((bName) => (
                                                        <span
                                                            key={bName}
                                                            className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[11px] font-bold"
                                                        >
                                                            {bName}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-600 line-clamp-2 max-w-lg mb-1">
                                                {brand.description_kr}
                                            </p>
                                            <div className="text-[10px] text-gray-500 font-mono">
                                                ID: {brand.id} | 브랜드 {brandList.length}개 | 순서: {brand.sort_order}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto shrink-0">
                                        <button
                                            onClick={() => handleEdit(brand)}
                                            className="flex-1 md:flex-none px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold transition"
                                        >
                                            수정
                                        </button>
                                        <button
                                            onClick={() => handleDelete(brand.id)}
                                            className="flex-1 md:flex-none px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-bold transition"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminRecommendedBrands;
