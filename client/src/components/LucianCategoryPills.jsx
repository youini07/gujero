/* Lucian UX/UI Prompt #039 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#039 */
import { useEffect, useRef } from 'react';

/**
 * 구제로(Gujero) 카테고리 및 마이페이지 탭 전환용 Lucian #039 미끄러지는 알약 탭 컴포넌트
 * 왜 가로 스크롤 래퍼와 스프링 물리를 결합했는가:
 * 375px 모바일 화면에서도 대분류 탭이 줄바꿈으로 화면 절반을 차지하지 않고 한 줄로 매끄럽게 탐색되도록 하기 위함입니다.
 */
export default function LucianCategoryPills({ items = [], value, onChange, ariaLabel = '카테고리 선택' }) {
    const barRef = useRef(null);
    const btnRefs = useRef([]);
    const animRef = useRef({ x: 0, w: 64, vx: 0, vw: 0, raf: 0, ready: false });

    useEffect(() => {
        const bar = barRef.current;
        if (!bar || !items.length) return;
        const idx = Math.max(0, items.findIndex((it) => it.value === value));
        const targetBtn = btnRefs.current[idx];
        if (!targetBtn) return;

        // 선택된 탭이 가로 스크롤 영역 밖에 있으면 중앙 근처로 부드럽게 스크롤
        try {
            targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } catch (e) {}

        const tx = targetBtn.offsetLeft;
        const tw = targetBtn.offsetWidth;
        const st = animRef.current;
        const rm = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        if (!st.ready || rm) {
            st.ready = true;
            st.x = tx;
            st.w = tw;
            st.vx = 0;
            st.vw = 0;
            bar.style.setProperty('--x', `${tx}px`);
            bar.style.setProperty('--w', `${tw}px`);
            bar.style.setProperty('--sx', '1');
            bar.style.setProperty('--sy', '1');
            return;
        }

        const step = () => {
            st.vx = (st.vx + (tx - st.x) * 0.18) * 0.68;
            st.vw = (st.vw + (tw - st.w) * 0.2) * 0.68;
            st.x += st.vx;
            st.w += st.vw;
            const stretch = Math.min(0.14, Math.abs(st.vx) / 150);
            bar.style.setProperty('--x', `${st.x.toFixed(2)}px`);
            bar.style.setProperty('--w', `${st.w.toFixed(2)}px`);
            bar.style.setProperty('--sx', (1 + stretch).toFixed(3));
            bar.style.setProperty('--sy', (1 - stretch * 0.45).toFixed(3));

            if (Math.abs(tx - st.x) > 0.35 || Math.abs(tw - st.w) > 0.35 || Math.abs(st.vx) > 0.35) {
                st.raf = requestAnimationFrame(step);
            } else {
                st.x = tx;
                st.w = tw;
                st.vx = 0;
                st.vw = 0;
                st.raf = 0;
                bar.style.setProperty('--x', `${tx}px`);
                bar.style.setProperty('--w', `${tw}px`);
                bar.style.setProperty('--sx', '1');
                bar.style.setProperty('--sy', '1');
            }
        };

        if (st.raf) cancelAnimationFrame(st.raf);
        st.raf = requestAnimationFrame(step);
        return () => {
            if (st.raf) cancelAnimationFrame(st.raf);
            st.raf = 0;
        };
    }, [value, items]);

    return (
        <div className="w-full overflow-x-auto no-scrollbar pb-0.5">
            <div ref={barRef} className="u039-bar" role="tablist" aria-label={ariaLabel}>
                <span className="u039-pill" aria-hidden="true" />
                {items.map((it, idx) => {
                    const selected = it.value === value;
                    return (
                        <button
                            key={String(it.value)}
                            ref={(el) => { btnRefs.current[idx] = el; }}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            onClick={() => onChange(it.value)}
                            className="u039-tab"
                        >
                            {it.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
