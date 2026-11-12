/* Lucian UX/UI Prompt #047 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#047 */
import React, { useMemo, useState, useEffect, useRef } from 'react';

const PERIODS = [
    { key: 'all', label: '전체 기간', days: 0 },
    { key: '30d', label: '최근 30일', days: 30 },
    { key: '7d', label: '최근 7일', days: 7 },
    { key: '1d', label: '오늘', days: 1 },
];

function parseSaleDate(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    const m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

const SalesAnalyticsTab = ({ sales, t }) => {
    const [periodIdx, setPeriodIdx] = useState(0);
    const [dir, setDir] = useState(0);
    const segRef = useRef(null);
    const knobRef = useRef(null);
    const optRefs = useRef([]);

    // Lucian #047: 세그먼트 손잡이 좌/우 탄성 이동
    useEffect(() => {
        const seg = segRef.current;
        const knob = knobRef.current;
        const btn = optRefs.current[periodIdx];
        if (!seg || !knob || !btn) return;
        seg.classList.toggle('go-r', dir > 0);
        seg.classList.toggle('go-l', dir < 0);
        knob.style.setProperty('--l', `${btn.offsetLeft}px`);
        knob.style.setProperty('--r', `${seg.clientWidth - btn.offsetLeft - btn.offsetWidth}px`);
    }, [periodIdx, dir]);

    const filteredSales = useMemo(() => {
        const p = PERIODS[periodIdx];
        if (!p || !p.days || !Array.isArray(sales)) return sales || [];
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const cutoff = new Date(startOfToday.getTime() - (p.days - 1) * 86400000);
        return sales.filter((s) => {
            const d = parseSaleDate(s['판매일자'] || s['주문일자'] || s['created_at'] || s['date']);
            return d ? d >= cutoff : true;
        });
    }, [sales, periodIdx]);

    const {
        totalRevenue,
        totalVolume,
        totalShippingExpense,
        asp,
        topBrands,
        topCategories,
        priceDistribution,
    } = useMemo(() => {
        let _totalRevenue = 0;
        const _productSales = filteredSales.filter((s) => s['상품코드'] !== 'SHIPPING_FEE');
        const _totalVolume = _productSales.length;

        const brandsCount = {};
        const brandsRevenue = {};
        const categoriesCount = {};
        const categoriesRevenue = {};

        const tiers = {
            '~ 500₩': 0,
            '500 ~ 1000₩': 0,
            '1000 ~ 1500₩': 0,
            '1500₩ +': 0,
        };

        const ordersMap = {};
        filteredSales.forEach((sale) => {
            const orderNum = sale['주문번호'];
            if (!ordersMap[orderNum]) {
                ordersMap[orderNum] = { hasShippingFee: false, hasProducts: false };
            }
            if (sale['상품코드'] === 'SHIPPING_FEE') {
                ordersMap[orderNum].hasShippingFee = true;
            } else {
                ordersMap[orderNum].hasProducts = true;

                const rawPriceStr = String(sale['판매가격'] || '0').replace(/[^0-9.]/g, '');
                const price = Number(rawPriceStr) || 0;
                _totalRevenue += price;

                const brand = sale['브랜드'] || '기타';
                brandsCount[brand] = (brandsCount[brand] || 0) + 1;
                brandsRevenue[brand] = (brandsRevenue[brand] || 0) + price;

                const cat = sale['category'] || '기타';
                categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
                categoriesRevenue[cat] = (categoriesRevenue[cat] || 0) + price;

                if (price < 500) tiers['~ 500₩']++;
                else if (price < 1000) tiers['500 ~ 1000₩']++;
                else if (price < 1500) tiers['1000 ~ 1500₩']++;
                else tiers['1500₩ +']++;
            }
        });

        const freeShippingCount = Object.values(ordersMap).filter((o) => o.hasProducts && !o.hasShippingFee).length;
        const _totalShippingExpense = freeShippingCount * 40;
        const _asp = _totalVolume > 0 ? Math.round(_totalRevenue / _totalVolume) : 0;

        const _topBrands = Object.keys(brandsRevenue)
            .map((b) => ({ name: b, count: brandsCount[b], revenue: brandsRevenue[b] }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const _topCategories = Object.keys(categoriesRevenue)
            .map((c) => ({ name: c, count: categoriesCount[c], revenue: categoriesRevenue[c] }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        return {
            totalRevenue: _totalRevenue,
            totalVolume: _totalVolume,
            totalShippingExpense: _totalShippingExpense,
            asp: _asp,
            topBrands: _topBrands,
            topCategories: _topCategories,
            priceDistribution: tiers,
        };
    }, [filteredSales]);

    if (!sales || sales.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <p className="text-sm font-semibold">{t('analytics_no_data') || '판매 데이터가 없습니다'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-5 tabular-nums">
            {/* Lucian #047 기간 세그먼트 컨트롤 */}
            <div ref={segRef} className="u047-seg max-w-md" role="radiogroup" aria-label="집계 기간 선택">
                <span ref={knobRef} className="u047-knob" aria-hidden="true" />
                {PERIODS.map((p, idx) => (
                    <button
                        key={p.key}
                        ref={(el) => { optRefs.current[idx] = el; }}
                        type="button"
                        role="radio"
                        aria-checked={periodIdx === idx}
                        onClick={() => {
                            if (idx === periodIdx) return;
                            setDir(idx > periodIdx ? 1 : -1);
                            setPeriodIdx(idx);
                        }}
                        className="u047-opt"
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* KPI 카드 (1px 헤어라인, 과도한 그림자·형광 텍스트 제거) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-[#E7E5E4] flex flex-col justify-between">
                    <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
                        {t('analytics_kpi_volume') || 'Total Volume'}
                    </p>
                    <p className="text-2xl font-extrabold text-[#18181B] mt-2">{totalVolume.toLocaleString()}</p>
                </div>
                <div className="bg-[#18181B] p-4 rounded-xl border border-[#18181B] text-white flex flex-col justify-between">
                    <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                        {t('analytics_kpi_sales') || 'Total Revenue'}
                    </p>
                    <p className="text-2xl font-extrabold text-white mt-2">₩{totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#E7E5E4] flex flex-col justify-between">
                    <p className="text-[11px] text-rose-600 font-bold uppercase tracking-wider">
                        {t('analytics_kpi_shipping_cost') || 'Shipping Expense'}
                    </p>
                    <p className="text-2xl font-extrabold text-rose-600 mt-2">₩{totalShippingExpense.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#E7E5E4] flex flex-col justify-between">
                    <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
                        {t('analytics_kpi_asp') || 'ASP'}
                    </p>
                    <p className="text-2xl font-extrabold text-[#18181B] mt-2">₩{asp.toLocaleString()}</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {/* Top Brands */}
                <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
                    <div className="bg-[#FAF9F6] px-4 py-3 border-b border-[#E7E5E4]">
                        <h3 className="font-extrabold text-[13px] text-[#18181B]">{t('analytics_top_brands') || 'Top Brands'}</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {topBrands.length > 0 ? topBrands.map((b, idx) => (
                            <div key={b.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-5 h-5 rounded-full bg-[#F4F3EF] flex items-center justify-center text-[11px] font-extrabold text-zinc-700 shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-bold text-[#18181B] truncate max-w-[160px]">{b.name}</p>
                                        <p className="text-[11px] text-zinc-400">{(t('analytics_sales_count') || '{count} items').replace('{count}', b.count)}</p>
                                    </div>
                                </div>
                                <span className="text-[13px] font-extrabold text-[#18181B] whitespace-nowrap">₩{b.revenue.toLocaleString()}</span>
                            </div>
                        )) : <p className="text-xs text-zinc-400 text-center py-4">데이터 없음</p>}
                    </div>
                </div>

                {/* Top Categories */}
                <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
                    <div className="bg-[#FAF9F6] px-4 py-3 border-b border-[#E7E5E4]">
                        <h3 className="font-extrabold text-[13px] text-[#18181B]">{t('analytics_top_categories') || 'Top Categories'}</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {topCategories.length > 0 ? topCategories.map((c, idx) => (
                            <div key={c.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-5 h-5 rounded-full bg-[#F4F3EF] flex items-center justify-center text-[11px] font-extrabold text-zinc-700 shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-bold text-[#18181B] truncate max-w-[160px]">{c.name}</p>
                                        <p className="text-[11px] text-zinc-400">{(t('analytics_sales_count') || '{count} items').replace('{count}', c.count)}</p>
                                    </div>
                                </div>
                                <span className="text-[13px] font-extrabold text-[#18181B] whitespace-nowrap">₩{c.revenue.toLocaleString()}</span>
                            </div>
                        )) : <p className="text-xs text-zinc-400 text-center py-4">데이터 없음</p>}
                    </div>
                </div>
            </div>

            {/* Price Tiers */}
            <div className="bg-white rounded-xl border border-[#E7E5E4] overflow-hidden">
                <div className="bg-[#FAF9F6] px-4 py-3 border-b border-[#E7E5E4]">
                    <h3 className="font-extrabold text-[13px] text-[#18181B]">{t('analytics_price_distribution') || 'Price Tier Distribution'}</h3>
                </div>
                <div className="p-4 space-y-3.5">
                    {Object.entries(priceDistribution).map(([tier, count]) => {
                        const percentage = totalVolume > 0 ? (count / totalVolume) * 100 : 0;
                        return (
                            <div key={tier} className="text-sm">
                                <div className="flex justify-between items-end mb-1.5">
                                    <span className="font-semibold text-zinc-700 text-xs">{tier}</span>
                                    <span className="font-bold text-xs text-[#18181B]">
                                        {count} <span className="text-zinc-400 font-normal text-[11px] ml-1">({percentage.toFixed(1)}%)</span>
                                    </span>
                                </div>
                                <div className="w-full bg-[#F4F3EF] rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-[#18181B] h-2 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SalesAnalyticsTab;
