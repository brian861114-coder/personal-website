/*
 * 腳本「搬運工程師」：內容都是角色用力氣搬進場的——拉繩、托舉、拋、踩滑板畫時間軸。
 * （A 魔法實驗室、C 靈感泡泡兩版的原始碼備份在 out/archive-abc/，不進 Git。）
 *
 * intro.html 會在字型載入、量完版面後呼叫 init(L)，再每格呼叫 apply(t)、fx(t)。
 *   path  角色位置關鍵格 [t, x, y, scale, 模式]（模式見 intro.html 的 EASE）
 *   face  面向 [[t, ±1]]；acts 動作時間軸 [[t0, 姿勢函式, 混合秒數]]；jumps 滑板跳 [[t, 長度, 高度px]]
 * 物件的位置都寫成「時間 → 位移」的純函式，慣性與回彈用 spring() 疊上去，動態模糊用 vel() 算速度。
 */
(function () {
  const P = POSES;
  const q1 = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
  const K = (fn, a, b) => (t, c) => fn(t, { ...c, k: seg(t, a, b) });          // 動作進度從 a 秒走到 b 秒
  // 拉繩：T 每一下開始的秒數、D 一下多久 → 給 P.pull 的 { n 第幾下, k 這一下的進度 }
  const tugState = (t, T, D) => { let n = 0; T.forEach((x, i) => { if (t >= x) n = i; }); return { n, k: t < T[0] ? 0 : seg(t, T[n], T[n] + D) }; };
  const pullAct = (T, D) => (t, c) => P.pull(t, { ...c, ...tugState(t, T, D) });
  const tugged = (t, T, D, start, incs) => start + incs.reduce((s, d, i) => s + d * outCubic(seg(t, T[i], T[i] + D)), 0);
  const step = T => τ => (τ >= T ? 1 : 0);
  const S = {};                                                                // init 後才知道的版面數值

  /* ---------------- 時間表 ---------------- */
  const T1 = [.3, .72, 1.14], D1 = .36, REL1 = 1.55;              // S1 拉標題
  const HEAVE2 = 4.85, REL2 = HEAVE2 + .45 * .75;                 // S2 托起後拋出「AI 系統」
  const T3 = [7.55, 7.9, 8.25, 8.6], D3 = .32, REL3 = 8.95;       // S3 拉數字卡
  const COUNT = 8.95;
  const RIDE = 620, LAND4 = 11.5;                                  // S4 滑板速度（px/s）與落上時間軸的時間
  const LIFTS = [[16.25, 2], [17.5, 1], [18.75, 0]];               // S5 [開始托, 第幾張論文]
  const T6a = [21.35, 21.7, 22.05], T6b = [22.55, 22.9, 23.25], D6 = .32, REL6a = 22.4, REL6b = 23.6;
  const REL7 = 27.7;                                               // S7 把聯絡方式推到定位、鬆手讓它滑過去

  const B = {
    name: '搬運工程師',
    init(L) {
      const SK = .3, lineY = L.lineTop - 8 * SK, x0 = L.lineLeft + 49 * SK, x1 = x0 + L.lineW, T4end = LAND4 + L.lineW / RIDE;
      S.sk = SK;
      S.lineY = lineY; S.T4end = T4end;
      S.hit = L.nodeX.map(x => LAND4 + (x - L.lineLeft) / RIDE);
      S.paperX = L.papers.map(p => p.x);
      this.path = [
        [0, 1640, 985, .72], [2.55, 1640, 985, .72], [3.3, 2140, 985, .72, 'depart'],
        [3.3, 2080, 1075, .8, 'cut'], [HEAVE2, 1640, 1075, .8, 'arrive'],
        [6.75, 1640, 1075, .8], [7.45, 1825, 1075, .6, 'go'],
        [10.35, 1825, 1075, .6], [11.0, 2090, 1075, .6, 'depart'],
        [11.05, -40, lineY - 260, SK, 'cut'], [LAND4, x0, lineY, SK, 'fall'], [T4end, x1, lineY, SK, 'walk'],
        [T4end + .55, 2150, 1180, SK, 'leap'],
        [15.45, 2020, 1075, .6, 'cut'], [16.25, S.paperX[2], 1075, .6, 'arrive'],
        [16.8, S.paperX[2], 1075, .6], [17.5, S.paperX[1], 1075, .6, 'go'],
        [18.05, S.paperX[1], 1075, .6], [18.75, S.paperX[0], 1075, .6, 'go'],
        [19.3, S.paperX[0], 1075, .6], [19.85, 92, 1075, .6, 'go'],
        [25.55, 92, 1075, .6], [26.35, -150, 1075, .6, 'depart'],
        [26.45, 2200, 1060, .8, 'cut'], [REL7, 1600, 1060, .8, 'arrive'],
      ];
      this.face = [[0, 1], [19.9, -1], [26.4, 1]];
      this.jumps = S.hit.map(h => [h - .22, .44, 56]);
      this.shakes = [[REL2 + .5, 5], [8.93, 4], [22.4, 3], [23.6, 4]];
      const ride = (t, c) => {
        if (c.jump >= 0) return P.ollie(t, { ...c, k: c.jump });
        const land = this.jumps.map(([T, d]) => seg(t, T + d, T + d + .16)).find(p => p > 0 && p < 1);
        const r = P.ride(t, c);
        return land ? { ...r, hL: r.hL + 10 * Math.sin(Math.PI * land), kL: r.kL - 20 * Math.sin(Math.PI * land),
          hR: r.hR - 10 * Math.sin(Math.PI * land), kR: r.kR + 20 * Math.sin(Math.PI * land) } : r;
      };
      this.acts = [
        [0, P.brace], [T1[0], pullAct(T1, D1), .15],
        [REL1, K(P.wipe, REL1, REL1 + .6), .15], [2.15, P.wave], [2.55, P.jog, .15],
        [3.3, P.carryWalk, 0], [HEAVE2 - .05, K(P.heaveToss, HEAVE2, HEAVE2 + .75), .12],
        [5.6, K(P.cheer, 5.6, 6.2), .1], [6.2, K(P.present, 6.2, 6.7)],
        [6.75, P.walk, .2], [7.4, P.brace, .15], [T3[0], pullAct(T3, D3), .12],
        [REL3, K(P.cheer, REL3, REL3 + .65), .12], [9.62, K(P.present, 9.62, 10.1)], [10.3, P.jog, .2],
        [11.05, ride, 0], [T4end - .02, K(P.ollie, T4end, T4end + .55), .08],
        [15.45, P.jog, 0],
        ...LIFTS.flatMap(([T]) => [[T, K(P.liftUp, T, T + .55), .12], [T + .55, P.jog, .15]]),
        [19.85, P.idle, .15], [19.95, K(P.present, 19.95, 20.4)],
        [21.1, P.brace, .2], [T6a[0], pullAct(T6a, D6), .12], [REL6a, P.brace, .12], [T6b[0], pullAct(T6b, D6), .12],
        [REL6b, K(P.cheer, REL6b, REL6b + .65), .12], [24.28, K(P.present, 24.28, 24.8)], [25.55, P.jog, .2],
        [26.45, P.push, 0], [REL7 - .12, K(P.push, REL7 - .12, REL7 + .3), .1],
        [28.2, K(P.present, 28.2, 28.7), .2], [29.0, K(P.glasses, 29.05, 29.7), .15],
      ];
    },

    apply(t) {
      /* S1：用繩子把標題拉進來 */
      { const p = seg(t, .05, .7);
        q1('#photo').style.transform = `scale(${.6 + .4 * outBack(p)})`; q1('#photo').style.opacity = outCubic(p);
        q1('#ring').setAttribute('stroke-dashoffset', 911 * (1 - inOut(seg(t, .2, 1.2))));
        const raw = τ => tugged(τ, T1, D1, -1500, [480, 480, 540]), X = τ => spring(raw, τ, 2.4, .42);
        const v = vel(X, t), el = q1('#helloText');
        place(el, X(t), 0, 1, `rotate(${clamp(v * .0035, -5, 5).toFixed(2)}deg)`); blurBy(el, v);
        reveal(q1('#name1'), seg(t, 1.75, 2.35), .15); }

      /* S2：「AI 系統」托在頭上走進來 → 蹲下蓄力往上拋 → 和「半導體物理」接上 */
      { const w2 = q1('#w2'), n = natural(w2);
        const pos = τ => { if (τ < REL2) { const h = handsMid(τ); return { x: h.x - n.x, y: h.y - 62 - n.y, r: 0 }; }
          const h = handsMid(REL2), p = seg(τ, REL2, REL2 + .5), sx = h.x - n.x, sy = h.y - 62 - n.y;
          return { x: sx * (1 - p), y: sy * (1 - p) - 4 * 130 * p * (1 - p), r: -8 * (1 - p) }; };
        const a = pos(t), vx = vel(τ => pos(τ).x, t), vy = vel(τ => pos(τ).y, t);
        const land = Math.sin(Math.PI * seg(t, REL2 + .5, REL2 + .72));
        place(w2, a.x, a.y, 1, `rotate(${a.r}deg) scale(${1 + .05 * land}, ${1 - .08 * land})`); blurBy(w2, vx, vy);
        reveal(q1('#w1'), seg(t, 5.3, 5.9), .1);
        const px = seg(t, 5.8, 6.15);
        q1('#wx').style.transform = `rotate(${(1 - outCubic(px)) * 180}deg) scale(${outBack(px)})`; q1('#wx').style.opacity = px;
        reveal(q1('#tagline'), seg(t, 5.9, 6.45), .04);
        reveal(q1('#tagline2'), seg(t, 6.1, 6.6), .05); }

      /* S3：拉繩把四張數字卡像火車一樣拖進來（綁在最右邊那張，後面的有彈性連結） */
      { reveal(q1('#s3 .kicker'), seg(t, 7.35, 7.95), .03);
        const lead = τ => tugged(τ, T3, D3, -1760, [440, 440, 440, 440]);
        qa('#s3 .stat').forEach((el, i) => {
          const X = i === 3 ? τ => spring(lead, τ, 3, .5) : τ => spring(τ2 => lead(τ2 - (3 - i) * .05), τ, 2.2, .3);
          const v = vel(X, t);
          place(el, X(t), 0, 1, `rotate(${clamp(v * .0025, -5, 5).toFixed(2)}deg)`); blurBy(el, v);
          const vEl = el.querySelector('.v');
          vEl.textContent = (+vEl.dataset.to * outCubic(seg(t, COUNT + i * .12, COUNT + 1.1 + i * .12))).toFixed(+vEl.dataset.dec);
        }); }

      /* S4：滑板沿時間軸滑過去、線跟著畫出來，經過節點就跳一下 */
      { reveal(q1('#s4 .kicker'), seg(t, 11.15, 11.75), .04); reveal(q1('#s4 .h2'), seg(t, 11.3, 11.9), .12);
        q1('#tlLine').style.width = (1560 * seg(t, LAND4, S.T4end)) + 'px';
        qa('#s4 .node').forEach((el, i) => { const h = S.hit[i];
          pop(el.querySelector('.dot'), seg(t, h - .05, h + .4), 0, 0);
          pop(el.querySelector('.date'), seg(t, h + .1, h + .65), 20, 1);
          pop(el.querySelector('.card'), seg(t, h + .2, h + .9), 40, .9); }); }

      /* S5：跑到每張論文底下，蹲下再往上托，論文從畫面下方彈上來 */
      { reveal(q1('#s5 .kicker'), seg(t, 15.6, 16.2), .04); reveal(q1('#s5 .h2'), seg(t, 15.75, 16.4), .06);
        qa('#s5 .paper').forEach((el, i) => {
          const T = LIFTS.find(l => l[1] === i)[0] + .3 * .55;
          const Y = τ => 760 * (1 - spring(step(T), τ, 2.2, .68));
          const v = vel(Y, t);
          place(el, 0, Y(t), t >= T ? 1 : 0); blurBy(el, 0, v); }); }

      /* S6：轉身往右拉繩，兩排專案卡一排一排被拉進來 */
      { reveal(q1('#s6 .kicker'), seg(t, 21.15, 21.75), .04); reveal(q1('#s6 .h2'), seg(t, 21.3, 21.95), .08);
        qa('#s6 .proj').forEach((el, i) => {
          const T = i < 3 ? T6a : T6b, j = i % 3, lead = τ => tugged(τ, T, D6, 1820, [-600, -600, -620]);
          const X = j === 0 ? τ => spring(lead, τ, 3, .5) : τ => spring(τ2 => lead(τ2 - j * .05), τ, 2.2, .3);
          const v = vel(X, t);
          place(el, X(t), 0, 1, `rotate(${clamp(v * .0025, -5, 5).toFixed(2)}deg)`); blurBy(el, v); }); }

      /* S7：托著聯絡方式走進來，拋到定位；最後推一下眼鏡 */
      { pop(q1('#outroPhoto'), seg(t, 26.6, 27.2), 0, .6);
        reveal(q1('#outroName'), seg(t, 26.75, 27.3));
        reveal(q1('#outroEn'), seg(t, 26.9, 27.45), .12);
        reveal(q1('#outroLine'), seg(t, 27.05, 27.9), .02);
        q1('#outroName .rvi').style.backgroundPosition = `${100 - 100 * inOut(seg(t, 28.9, 29.6))}% 0`;
        // 兩顆標籤排成一列被推著走（右邊那顆貼著手），鬆手後靠慣性減速滑到定位
        const chips = qa('#s7 .chip'), right = natural(chips[1]).right;
        const DX = τ => { const d = τ2 => handsMid(τ2).x - 6 - right; return τ < REL7 ? d(τ) : d(REL7) * (1 - outCubic(seg(τ, REL7, REL7 + .6))); };
        const v = vel(DX, t);
        chips.forEach(el => { place(el, DX(t), 0, t >= 26.45 ? 1 : 0); blurBy(el, v); }); }
    },

    fx(t) {
      // 繩子：從綁點經過前手、後手，多出來的一段垂到地上
      const ropeTo = (anchor, sag, alpha = 1) => {
        const st = charAt(t), hs = [handAt(t, 'L'), handAt(t, 'R')];
        const far = Math.abs(hs[0].x - anchor.x) < Math.abs(hs[1].x - anchor.x) ? hs[0] : hs[1], near = far === hs[0] ? hs[1] : hs[0];
        const g = groundAt(t), back = Math.sign(near.x - far.x) || 1, tail = { x: st.x + back * 120 * st.s, y: g };
        rope([anchor, far, near, tail], [sag, 6, 55 * st.s], alpha);
      };
      // 放手：繩子從綁點鬆脫，綁點那端甩向角色、兩端都掉到地上，然後淡出
      const dropped = (anchor0, T) => {
        const τ = t - T, g = groundAt(T), h = handsMid(T), fallY = y0 => Math.min(g, y0 + 1500 * τ * τ);
        const a = { x: lerp(anchor0.x, h.x, .55 * outCubic(clamp(τ * 2))), y: fallY(anchor0.y) };
        const b = { x: h.x, y: fallY(h.y) };
        rope([a, b], 30 + 60 * clamp(τ * 3), 1 - seg(t, T + .3, T + .65));
      };
      const tension = (T, D) => { const { k } = tugState(t, T, D); return 26 - 22 * Math.sin(Math.PI * k); };

      /* S1 */
      { const r = q1('#helloText').getBoundingClientRect(), a = { x: r.right + 4, y: r.top + r.height * .56 };
        if (t < REL1) ropeTo(a, tension(T1, D1)); else if (t < REL1 + .8) dropped(a, REL1); }
      /* S2：拋出去落定的閃光、× 接上的閃光 */
      { const n = q1('#w2').getBoundingClientRect(); burst(n.left + n.width / 2, n.top + n.height / 2, seg(t, REL2 + .45, REL2 + 1.05), 21, 12, 150);
        const x = q1('#wx').getBoundingClientRect(); burst(x.left + x.width / 2, x.top + x.height / 2, seg(t, 5.85, 6.45), 22, 10, 90); }
      /* S3 */
      { const r = qa('#s3 .stat')[3].getBoundingClientRect(), a = { x: r.right - 2, y: r.top + r.height / 2 };
        if (t > 7.3 && t < REL3) ropeTo(a, tension(T3, D3), seg(t, 7.3, 7.45)); else if (t >= REL3 && t < REL3 + .8) dropped(a, REL3);
        qa('#s3 .v').forEach((v, i) => { const te = COUNT + 1.1 + i * .12, b = v.getBoundingClientRect();
          burst(b.left + b.width / 2, b.top + b.height / 2, seg(t, te - .05, te + .7), 100 + i); }); }
      /* S4：輪子在線上擦出火花、每次落地的小灰塵 */
      { const st = charAt(t);
        if (t > LAND4 && t < S.T4end && st.air <= 0) { const w = { x: st.x - 49 * S.sk, y: S.lineY + 8 * S.sk };
          for (let k = 0; k < 4; k++) star(w.x - 10 - k * 13, w.y - 3 + Math.sin(t * 40 + k) * 3, 4.2 - k * .7, t * 9 + k, SPARK[k % 3], 1 - k * .2); }
        B.jumps.forEach(([T, d], i) => dust(charAt(T + d).x, S.lineY + 8 * S.sk, seg(t, T + d, T + d + .45), 40 + i));
        dust(LAYOUT.lineLeft + 20, S.lineY + 8 * S.sk, seg(t, LAND4, LAND4 + .45), 39); }
      /* S5：論文彈到定位的閃光、托起時腳邊的灰塵 */
      { qa('#s5 .paper').forEach((el, i) => { const T = LIFTS.find(l => l[1] === i)[0], r = el.getBoundingClientRect();
          dust(S.paperX[i], 1075 - 10, seg(t, T + .12, T + .6), 50 + i);
          burst(r.left + r.width / 2, r.top + 40, seg(t, T + .7, T + 1.3), 60 + i, 12, 170); }); }
      /* S6 */
      { const rows = [[T6a, REL6a, 0], [T6b, REL6b, 3]];
        for (const [T, REL, lead] of rows) {
          const r = qa('#s6 .proj')[lead].getBoundingClientRect(), a = { x: r.left + 2, y: r.top + r.height / 2 };
          if (t > T[0] - .2 && t < REL) ropeTo(a, tension(T, D6), seg(t, T[0] - .2, T[0] - .05));
          else if (t >= REL && t < REL + .8) dropped(a, REL);
        } }
      /* S7：標籤滑停時的閃光 */
      { qa('#s7 .chip').forEach((el, i) => { const r = el.getBoundingClientRect();
          burst(r.left + r.width / 2, r.top + r.height / 2, seg(t, REL7 + .5, REL7 + 1.1), 80 + i, 10, 130); }); }
    },
  };

  window.SCRIPT = B;
})();
