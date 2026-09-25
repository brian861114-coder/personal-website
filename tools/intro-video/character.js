/*
 * 介紹動畫的角色：畫風參考 LottieFiles「Scientist」（Sagar Soni）的扁平插畫
 * ——正常比例、白色實驗袍、細灰線條——外型換成 Brian（凌亂黑髮、黑框眼鏡、深藍上衣）。
 * 全部自己畫的 SVG，有關節骨架。
 *
 * 座標系：viewBox 0 0 300 600，腳底約在 y=582，畫面錨點是底部中心 (150, 600)。
 *
 * 姿勢是一個純資料物件（見 base()）；POSES.xxx(t, c) 產生姿勢：
 *   t  時間（呼吸、眨眼、揮動）
 *   c  情境 { dist 累積走過的距離（viewBox 單位；步伐相位由它算，腳才不會滑）, dir 前進方向 ±1, k 動作進度 0..1 }
 * 腳不會穿地：腿彎曲造成的高度差會自動把身體往下放（rootDy）。
 */
(function () {
  const SKIN = '#f1c6a3', SKIN_D = '#d9a07e', HAIR = '#26201d', COAT = '#ffffff', LINE = '#7d8794',
        SHIRT = '#2f4a7a', PANTS = '#3a4050', SHOE = '#252525';
  const S_L = [108, 168], S_R = [192, 168];   // 肩關節
  const UPPER = 86, FORE = 84;                // 上臂、前臂（到手掌中心）
  const H_L = [134, 338], H_R = [166, 338];   // 髖關節
  const THIGH = 118, SHIN = 116, LEG = THIGH + SHIN;
  const D2R = Math.PI / 180;

  const shoe = (ax, ay) => `M${ax - 10},${ay - 3} Q${ax - 11},${ay - 12} ${ax + 2},${ay - 12} Q${ax + 20},${ay - 11} ${ax + 25},${ay + 1}
    Q${ax + 25},${ay + 10} ${ax + 4},${ay + 10} L${ax - 9},${ay + 10} Q${ax - 15},${ay + 8} ${ax - 10},${ay - 3} Z`;

  function leg(side, [hx, hy]) {
    const ky = hy + THIGH, ay = ky + SHIN;
    return `
    <g id="c-leg${side}">
      <rect x="${hx - 15}" y="${hy - 8}" width="30" height="${THIGH + 16}" rx="14" fill="${PANTS}"/>
      <g id="c-knee${side}">
        <rect x="${hx - 14}" y="${ky - 8}" width="28" height="${SHIN + 10}" rx="13" fill="${PANTS}"/>
        <g id="c-foot${side}"><path d="${shoe(hx, ay)}" fill="${SHOE}"/></g>
      </g>
    </g>`;
  }

  function arm(side, [sx, sy]) {
    const ey = sy + UPPER, hx = sx, hy = ey + FORE, ts = side === 'L' ? 1 : -1;   // 拇指朝身體中線
    return `
      <g>
        <g id="c-arm${side}">
          <rect x="${sx - 14}" y="${sy - 10}" width="28" height="${UPPER + 18}" rx="14" fill="${COAT}" stroke="${LINE}" stroke-width="2"/>
        </g>
        <g id="c-fore${side}">
          <rect x="${sx - 12}" y="${ey - 10}" width="24" height="${FORE - 6}" rx="12" fill="${COAT}" stroke="${LINE}" stroke-width="2"/>
          <path d="M${sx - 12},${hy - 22} L${sx + 12},${hy - 22}" stroke="${LINE}" stroke-width="1.6"/>
          <g id="c-fist${side}">
            <ellipse cx="${hx}" cy="${hy}" rx="11.5" ry="13" fill="${SKIN}"/>
            <ellipse cx="${hx + ts * 8.5}" cy="${hy - 4}" rx="4.4" ry="7.5" fill="${SKIN}" stroke="${SKIN_D}" stroke-width="1"
              transform="rotate(${-ts * 22} ${hx + ts * 8.5} ${hy - 4})"/>
          </g>
          <g id="c-open${side}" style="display:none">
            ${[0, 1, 2, 3].map(i => `<rect x="${hx - 11 + i * 5.8}" y="${hy + 2}" width="5.4" height="${[15, 18, 17, 13][i]}" rx="2.7" fill="${SKIN}" stroke="${SKIN_D}" stroke-width=".8"/>`).join('')}
            <ellipse cx="${hx}" cy="${hy}" rx="12.5" ry="11.5" fill="${SKIN}"/>
            <ellipse cx="${hx + ts * 11}" cy="${hy - 1}" rx="4.4" ry="8.5" fill="${SKIN}" stroke="${SKIN_D}" stroke-width=".8"
              transform="rotate(${-ts * 42} ${hx + ts * 11} ${hy - 1})"/>
          </g>
        </g>
      </g>`;
  }

  const svg = `
<svg viewBox="0 0 300 600" width="300" height="600" style="overflow:visible">
  <ellipse id="c-shadow" cx="150" cy="588" rx="72" ry="9" fill="#0b2b55" opacity=".13"/>
  <g id="c-board" style="display:none">
    <rect x="72" y="582" width="156" height="9" rx="4.5" fill="#1f3b63"/>
    <path d="M76,583 L224,583" stroke="#0d1c33" stroke-width="2"/>
    <rect x="94" y="590" width="14" height="5" fill="#8a96a3"/><rect x="192" y="590" width="14" height="5" fill="#8a96a3"/>
    <g id="c-wheelA"><circle cx="101" cy="600" r="8" fill="#ffc24a"/><path d="M95,600 L107,600" stroke="#c98a10" stroke-width="2"/></g>
    <g id="c-wheelB"><circle cx="199" cy="600" r="8" fill="#ffc24a"/><path d="M193,600 L205,600" stroke="#c98a10" stroke-width="2"/></g>
  </g>
  <g id="c-root">
    ${leg('R', H_R)}
    ${leg('L', H_L)}
    <g id="c-upper">
      <rect x="139" y="112" width="22" height="50" rx="8" fill="${SKIN_D}"/>
      <path d="M112,160 Q150,150 188,160 L196,330 Q150,338 104,330 Z" fill="${SHIRT}"/>
      <g id="c-coat">
        <path d="M104,162 Q124,152 140,150 L146,236 L140,420 Q112,418 90,410 L96,300 Z" fill="${COAT}" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M196,162 Q176,152 160,150 L154,236 L160,420 Q188,418 210,410 L204,300 Z" fill="${COAT}" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M140,150 L128,190 L146,206 M160,150 L172,190 L154,206" fill="none" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M100,262 L100,286 M200,262 L200,286" stroke="${LINE}" stroke-width="1.6"/>
        <rect x="166" y="222" width="24" height="26" rx="3" fill="none" stroke="${LINE}" stroke-width="1.8"/>
        <rect x="171" y="208" width="5" height="22" rx="2" fill="#0075de"/>
        <rect x="179" y="212" width="5" height="18" rx="2" fill="#5ab0ff"/>
      </g>
      <g id="c-head">
        <circle cx="113" cy="88" r="8" fill="${SKIN}"/><circle cx="187" cy="88" r="8" fill="${SKIN}"/>
        <path d="M113,82 Q112,40 150,38 Q188,40 187,82 Q188,124 150,130 Q112,124 113,82 Z" fill="${SKIN}"/>
        <g id="c-hair" fill="${HAIR}">
          <path d="M110,86 C102,46 122,24 152,24 C184,22 202,44 190,86 C188,70 184,62 176,56
            C168,64 156,62 150,52 C142,62 128,64 120,58 C114,66 112,74 110,86 Z"/>
          <path d="M122,34 C114,16 132,6 142,22 Z M140,24 C144,4 166,4 164,24 Z M160,22 C174,8 194,18 186,36 Z
            M178,34 C198,30 204,48 192,58 Z M112,52 C98,44 104,28 122,34 Z"/>
        </g>
        <g id="c-brows" fill="none" stroke="${HAIR}" stroke-width="3.2" stroke-linecap="round">
          <path d="M126,70 Q134,66 142,69"/><path d="M158,69 Q166,66 174,70"/>
        </g>
        <g id="c-eyes" fill="#1e1e1e"><circle cx="135" cy="84" r="3.4"/><circle cx="165" cy="84" r="3.4"/></g>
        <path id="c-eyesHappy" d="M130,86 Q135,80 140,86 M160,86 Q165,80 170,86" stroke="#1e1e1e" stroke-width="2.6" fill="none" stroke-linecap="round" style="display:none"/>
        <g fill="rgba(255,255,255,.2)" stroke="#161616" stroke-width="3">
          <rect x="122" y="74" width="25" height="20" rx="6"/><rect x="153" y="74" width="25" height="20" rx="6"/>
        </g>
        <path d="M147,82 Q150,79 153,82 M122,81 L114,79 M178,81 L186,79" stroke="#161616" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <path d="M150,90 L147,101 L152,102" stroke="${SKIN_D}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path id="c-mSmile" d="M141,111 Q150,118 159,111" stroke="#7a3b2b" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <g id="c-mGrin"><path d="M139,108 Q150,124 161,108 Z" fill="#7a3b2b"/><path d="M141,108.6 L159,108.6 L157.5,112 L142.5,112 Z" fill="#fff"/></g>
        <path id="c-mOpen" d="M141,109 Q150,122 159,109 Q150,113 141,109 Z" fill="#7a3b2b"/>
        <ellipse id="c-mO" cx="150" cy="113" rx="4" ry="5" fill="#7a3b2b"/>
        <path id="c-mFlat" d="M143,113 Q150,111.5 157,113" stroke="#7a3b2b" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      </g>
      ${arm('L', S_L)}
      ${arm('R', S_R)}
    </g>
  </g>
</svg>`;

  // 兩節 IK：給手的目標點，回傳 [肩角, 肘角]（度，SVG rotate 方向；0 = 手臂自然下垂）
  // f < 1：上臂朝鏡頭前伸的透視縮短（例如托下巴）
  // bend = 0：自動挑手肘朝外（遠離身體中線、稍微偏下）的那個解，避免手臂在胸前交叉
  function ik(S, T, bend = 0, f = 1) {
    if (bend === 0) {
      const out = b => { const [s] = ik(S, T, b, f), r = s * D2R, ex = S[0] - Math.sin(r) * UPPER * f, ey = S[1] + Math.cos(r) * UPPER * f;
        return (S[0] < 150 ? -ex : ex) + .5 * ey; };
      bend = out(1) >= out(-1) ? 1 : -1;
    }
    const [sx, sy] = S, [tx, ty] = T;
    const U = UPPER * f;
    let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
    const max = U + FORE - .5, min = Math.abs(U - FORE) + 1;
    const k = Math.min(max, Math.max(min, d)) / d; dx *= k; dy *= k; d = Math.hypot(dx, dy);
    const a = (U * U - FORE * FORE + d * d) / (2 * d), h = Math.sqrt(Math.max(0, U * U - a * a));
    const ux = dx / d, uy = dy / d;
    const ex = sx + a * ux - bend * h * uy, ey = sy + a * uy + bend * h * ux;
    const ang = (vx, vy) => Math.atan2(-vx, vy) / D2R;
    const s = ang(ex - sx, ey - sy), fa = ang(sx + dx - ex, sy + dy - ey);
    let e = fa - s; while (e > 180) e -= 360; while (e < -180) e += 360;
    return [s, e];
  }

  // 腿彎曲後身體要往下放多少，站地的那隻腳才會貼地
  function rootDy(p) {
    const ext = (h, k) => THIGH * Math.cos(h * D2R) + SHIN * Math.cos((h + k) * D2R);
    return LEG - Math.max(ext(p.hL, p.kL), ext(p.hR, p.kR)) - p.bob;
  }

  const rot = (el, deg, x, y) => el.setAttribute('transform', `rotate(${deg.toFixed(2)} ${x} ${y})`);
  function setArm(upper, fore, [sx, sy], s, e, f) {
    upper.setAttribute('transform', `rotate(${s.toFixed(2)} ${sx} ${sy}) translate(${sx} ${sy}) scale(1 ${f}) translate(${-sx} ${-sy})`);
    const r = s * D2R, ex = sx - Math.sin(r) * UPPER * f, ey = sy + Math.cos(r) * UPPER * f;
    fore.setAttribute('transform', `translate(${(ex - sx).toFixed(2)} ${(ey - sy - UPPER).toFixed(2)}) rotate(${(s + e).toFixed(2)} ${sx} ${sy + UPPER})`);
  }
  // 腳掌保持水平（貼地），toe = ±1 決定鞋尖方向；0 = 外八（正面站姿）
  function setLeg(legEl, kneeEl, footEl, [hx, hy], h, k, toe, side) {
    rot(legEl, h, hx, hy); rot(kneeEl, k, hx, hy + THIGH);
    const ax = hx, ay = hy + THIGH + SHIN, dirX = toe || (side === 'L' ? -1 : 1);
    footEl.setAttribute('transform', `rotate(${(-(h + k)).toFixed(2)} ${ax} ${ay}) translate(${ax} 0) scale(${dirX} 1) translate(${-ax} 0)`);
  }

  function createCharacter(container) {
    container.innerHTML = svg;
    const q = id => container.querySelector('#c-' + id);
    const el = {
      root: q('root'), upper: q('upper'), head: q('head'), shadow: q('shadow'), coat: q('coat'), hair: q('hair'),
      armL: q('armL'), armR: q('armR'), foreL: q('foreL'), foreR: q('foreR'),
      fistL: q('fistL'), fistR: q('fistR'), openL: q('openL'), openR: q('openR'),
      legL: q('legL'), legR: q('legR'), kneeL: q('kneeL'), kneeR: q('kneeR'), footL: q('footL'), footR: q('footR'),
      eyes: q('eyes'), eyesHappy: q('eyesHappy'), brows: q('brows'),
      board: q('board'), wheelA: q('wheelA'), wheelB: q('wheelB'),
      mouths: { smile: q('mSmile'), grin: q('mGrin'), open: q('mOpen'), o: q('mO'), flat: q('mFlat') },
    };
    let last = null;
    return {
      set(p) {
        last = p;
        const board = p.board > .5, lift = board ? -8 : 0;
        el.root.setAttribute('transform', `translate(0 ${(rootDy(p) + lift).toFixed(2)})`);
        rot(el.upper, p.lean, 150, 340);
        rot(el.head, p.tilt, 150, 130);
        el.coat.setAttribute('transform', `translate(0 150) skewX(${p.coat.toFixed(2)}) translate(0 -150)`);
        el.hair.setAttribute('transform', `translate(0 ${p.hair.toFixed(2)}) rotate(${(p.hair * .6).toFixed(2)} 150 60)`);
        setArm(el.armL, el.foreL, S_L, p.sL, p.eL, p.fL);
        setArm(el.armR, el.foreR, S_R, p.sR, p.eR, p.fR);
        el.fistL.style.display = p.handL === 'open' ? 'none' : ''; el.openL.style.display = p.handL === 'open' ? '' : 'none';
        el.fistR.style.display = p.handR === 'open' ? 'none' : ''; el.openR.style.display = p.handR === 'open' ? '' : 'none';
        setLeg(el.legL, el.kneeL, el.footL, H_L, p.hL, p.kL, p.toe, 'L');
        setLeg(el.legR, el.kneeR, el.footR, H_R, p.hR, p.kR, p.toe, 'R');
        const happy = p.eyes === 'happy';
        el.eyes.style.display = happy ? 'none' : ''; el.eyesHappy.style.display = happy ? '' : 'none';
        el.eyes.setAttribute('transform', `translate(${p.lookX} ${84 + p.lookY}) scale(1 ${p.blink ? .12 : 1}) translate(0 -84)`);
        el.brows.setAttribute('transform', `translate(0 ${-p.brow})`);
        for (const [k, m] of Object.entries(el.mouths)) m.style.display = p.mouth === k ? '' : 'none';
        el.board.style.display = board ? '' : 'none';
        el.board.setAttribute('transform', `rotate(${p.boardTilt.toFixed(2)} ${p.boardTilt > 0 ? 80 : 220} 600)`);
        rot(el.wheelA, p.wheel, 101, 600); rot(el.wheelB, p.wheel, 199, 600);
        // 影子留在地上：身體跳起（bob）或整個角色被路徑抬高（p.air）時都往下補回去、並縮小
        const gy = (board ? 610 : 588) + (p.air || 0), air = Math.max(0, -rootDy(p)) + (p.air || 0);
        el.shadow.setAttribute('transform', `translate(150 ${gy.toFixed(2)}) scale(${(1 - Math.min(.55, air / 150)).toFixed(3)} 1) translate(-150 -588)`);
      },
      handLocal: side => handOf(last, side),
    };
  }

  // 不經 DOM 算手的位置（viewBox 座標）
  function handOf(p, side) {
    const S = side === 'L' ? S_L : S_R, f = side === 'L' ? p.fL : p.fR;
    const s = (side === 'L' ? p.sL : p.sR) * D2R, e = (side === 'L' ? p.eL : p.eR) * D2R;
    let x = S[0] - Math.sin(s) * UPPER * f - Math.sin(s + e) * FORE;
    let y = S[1] + Math.cos(s) * UPPER * f + Math.cos(s + e) * FORE;
    const l = p.lean * D2R, cx = 150, cy = 340;
    [x, y] = [cx + (x - cx) * Math.cos(l) - (y - cy) * Math.sin(l), cy + (x - cx) * Math.sin(l) + (y - cy) * Math.cos(l)];
    return { x, y: y + rootDy(p) + (p.board > .5 ? -8 : 0) };
  }

  /* ---------------- 姿勢庫 ---------------- */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const seg = (k, a, b) => clamp((k - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = x => x * x * (3 - 2 * x);
  // 不規則眨眼
  const blinkAt = t => ((t + .4) % 3.3) < .11 || ((t + 2.1) % 5.9) < .11;

  const base = t => ({
    sL: 5, eL: -5 + Math.sin(t * 1.7) * 2, sR: -5, eR: 5 - Math.sin(t * 1.7) * 2, fL: 1, fR: 1,
    hL: 1.5 + Math.sin(t * .9) * 1.2, kL: 0, hR: -1.5 + Math.sin(t * .9) * 1.2, kR: 0, toe: 0,
    lean: Math.sin(t * .9) * .8, tilt: Math.sin(t * 1.3) * 1.5, bob: 0, coat: 0, hair: 0,
    lookX: 0, lookY: 0, brow: 0, blink: blinkAt(t), eyes: 'open', mouth: 'smile', handL: 'fist', handR: 'fist',
    board: 0, boardTilt: 0, wheel: 0,
  });
  const withArm = (p, side, target, bend = 0, f = 1) => { const [s, e] = ik(side === 'L' ? S_L : S_R, target, bend, f);
    return side === 'L' ? { ...p, sL: s, eL: e, fL: f } : { ...p, sR: s, eR: e, fR: f }; };
  // 蹲：膝蓋往外、身體下沉（q = 0..1）
  const squat = (p, q) => { const a = 26 * q; return { ...p, hL: p.hL + a, kL: p.kL - 2 * a, hR: p.hR - a, kR: p.kR + 2 * a }; };

  // 步態：A 擺腿角度、K 抬膝、R 擺臂、E 手肘、L 前傾、B 額外起伏、C 一個步伐週期（兩步）走多遠
  const phaseOf = (c, C) => (c.dist || 0) / C * 2 * Math.PI;
  function gait(t, c, { A, K, R, E, L, B, C }) {
    const d = c.dir || 1, ph = phaseOf(c, C), s = Math.sin(ph), co = Math.cos(ph);
    return {
      ...base(t),
      hL: -d * A * s, kL: d * K * Math.max(0, co) ** 1.4, hR: d * A * s, kR: d * K * Math.max(0, -co) ** 1.4, toe: d,
      sL: 5 + d * R * s, sR: -5 - d * R * s, eL: -d * E, eR: -d * E,
      lean: d * L, tilt: -d * 1.5 + Math.sin(2 * ph) * 1.2, bob: B * Math.abs(co),
    };
  }

  const POSES = {
    idle: t => base(t),
    walk: (t, c) => gait(t, c, { A: 22, K: 34, R: 14, E: 12, L: 3.5, B: 3, C: 350 }),
    jog: (t, c) => ({ ...gait(t, c, { A: 30, K: 62, R: 28, E: 78, L: 8, B: 12, C: 640 }), mouth: 'open' }),
    // 托重物走：步子小、膝蓋軟、雙手在頭上
    carryWalk: (t, c) => { const g = gait(t, c, { A: 15, K: 26, R: 0, E: 0, L: 0, B: 2, C: 300 });
      const w = Math.sin(phaseOf(c, 300) * 2) * 3;
      return withArm(withArm(squat({ ...g, mouth: 'flat', brow: 2, lookY: -2, handL: 'open', handR: 'open' }, .18),
        'L', [98 + w, 6]), 'R', [202 + w, 6]); },
    carry: t => withArm(withArm(squat({ ...base(t), mouth: 'flat', brow: 2, lookY: -2, handL: 'open', handR: 'open' }, .15),
      'L', [98, 6]), 'R', [202, 6]),
    // 蹲下蓄力後把頭上的東西往左上拋（k: 0..1）
    heaveToss: (t, c) => { const k = c.k || 0, crouch = smooth(seg(k, 0, .35)) * (1 - smooth(seg(k, .35, .55))), up = smooth(seg(k, .35, .6));
      const x = lerp(0, -28, up), y = lerp(0, -40, up);
      return withArm(withArm(squat({ ...base(t), mouth: up > .2 ? 'open' : 'flat', brow: 3, lookX: -2, lookY: -3,
        lean: -6 * up, bob: 10 * Math.sin(Math.PI * seg(k, .4, .75)), handL: 'open', handR: 'open' }, .9 * crouch),
        'L', [98 + x, 6 + y + crouch * 10]), 'R', [202 + x, 6 + y + crouch * 10]); },
    // 雙手輪流拉繩：k = 目前這一下的進度，n = 第幾下（決定哪隻手在前）
    pull: (t, c) => { const k = c.k || 0, e = smooth(k), odd = (c.n || 0) % 2;
      let p = squat({ ...base(t), hL: 20, kL: -8, hR: -14, kR: 12, mouth: 'flat', brow: -1, lookX: -2,
        lean: 9 + 7 * Math.sin(Math.PI * k), tilt: -5 }, .35);
      const pullX = lerp(22, 132, e), reachX = lerp(132, 22, e), reachY = 284 - Math.sin(Math.PI * k) * 22;
      p = withArm(p, odd ? 'R' : 'L', [pullX, 300]);
      return withArm(p, odd ? 'L' : 'R', [reachX, reachY]); },
    // 站定拉住（繩子還在手上、還沒開始拉）
    brace: t => withArm(withArm(squat({ ...base(t), hL: 20, kL: -8, hR: -14, kR: 12, mouth: 'flat', lean: 9, tilt: -4, lookX: -2 }, .3),
      'L', [30, 290]), 'R', [128, 300]),
    // 從下方把東西往上托（k: 0..1）
    liftUp: (t, c) => { const k = c.k || 0, crouch = smooth(seg(k, 0, .3)) * (1 - smooth(seg(k, .3, .5))), up = smooth(seg(k, .3, .55));
      return withArm(withArm(squat({ ...base(t), mouth: up > .1 ? 'open' : 'flat', brow: 3 * up, lookY: -3 * up,
        bob: 8 * Math.sin(Math.PI * seg(k, .32, .65)), handL: 'open', handR: 'open' }, crouch),
        'L', [lerp(112, 94, up), lerp(360, 30, up)]), 'R', [lerp(188, 206, up), lerp(360, 30, up)]); },
    // 歡呼：蹲 → 跳 → 落地（k: 0..1）
    cheer: (t, c) => { const k = c.k ?? 1, pre = seg(k, 0, .25), air = Math.sin(Math.PI * seg(k, .25, .7)), land = Math.sin(Math.PI * seg(k, .7, .9));
      return withArm(squat({ ...base(t), mouth: 'grin', eyes: k > .25 ? 'happy' : 'open', brow: 4, bob: 38 * air,
        hL: 1.5 + 8 * air, hR: -1.5 - 8 * air }, .7 * Math.sin(Math.PI * pre) * (k < .25 ? 1 : 0) + .5 * land),
        'R', [lerp(206, 222, air), lerp(330, 40, smooth(seg(k, .1, .45)))]); },
    // 擦汗：右手從右往左抹過額頭
    wipe: (t, c) => { const k = c.k || 0;
      return withArm({ ...base(t), mouth: k > .6 ? 'grin' : 'o', eyes: k > .6 ? 'happy' : 'open', tilt: 4, handR: 'open' },
        'R', [lerp(186, 118, smooth(seg(k, .15, .7))), 66], -1, .5); },
    // 推眼鏡（招牌動作）
    glasses: (t, c) => { const k = c.k || 0, push = Math.sin(Math.PI * seg(k, .25, .6));
      return withArm({ ...base(t), mouth: 'smile', eyes: k > .5 ? 'happy' : 'open', tilt: -3 + 2 * push, brow: 2 * push },
        'R', [151, lerp(86, 78, push)], -1, .36); },
    // 介紹：左手往畫面左側攤開、右手叉腰（k 控制手從低處揮出）
    present: (t, c) => { const k = c.k ?? 1, e = smooth(seg(k, 0, 1));
      return withArm(withArm({ ...base(t), tilt: -5, lookX: -2, lean: -2, handL: 'open' },
        'L', [lerp(80, -6, e) + Math.sin(t * 2) * 3, lerp(330, 222, e)]), 'R', [212, 316], -1); },
    wave: t => withArm({ ...base(t), mouth: 'grin', eyes: 'happy', tilt: 5, brow: 2, handR: 'open' }, 'R', [262 + Math.sin(t * 11) * 22, 60]),
    // 推：邊走邊用雙手在腰的高度往左推；k 讓最後一下推出去（手往前伸）
    push: (t, c) => { const g = gait(t, c, { A: 16, K: 28, R: 0, E: 0, L: 0, B: 2, C: 300 }), ext = 34 * Math.sin(Math.PI * (c.k || 0));
      return withArm(withArm({ ...g, lean: -7 - 4 * Math.sin(Math.PI * (c.k || 0)), mouth: 'flat', lookX: -2, brow: -1, handL: 'open', handR: 'open' },
        'L', [26 - ext, 292]), 'R', [52 - ext, 286]); },
    // 丟出去（k: 0..1，右手由右下甩到左上）
    toss: (t, c) => { const k = c.k || 0, wind = smooth(seg(k, 0, .4)), fling = smooth(seg(k, .4, .6));
      const x = lerp(lerp(206, 250, wind), 40, fling), y = lerp(lerp(330, 360, wind), 120, fling);
      return withArm(squat({ ...base(t), mouth: fling > 0 ? 'open' : 'flat', lean: 5 * wind - 9 * fling, tilt: -4, handR: fling > .3 ? 'open' : 'fist' },
        .5 * wind * (1 - fling)), 'R', [x, y], -1); },
    // 滑板：側站、雙手張開平衡
    ride: (t, c) => { const w = Math.sin(t * 3.1) * 6, d = c.dir || 1;
      return withArm(withArm(squat({ ...base(t), hL: 14, hR: -14, toe: d, lean: d * 2 + w * .3, tilt: -w * .4, board: 1,
        mouth: 'grin', handL: 'open', handR: 'open', wheel: (c.dist || 0) / 8 * 57.3 }, .32),
        'L', [18, 236 + w]), 'R', [282, 236 - w]); },
    // 滑板跳（ollie）：k 0..1
    ollie: (t, c) => { const k = c.k || 0, air = Math.sin(Math.PI * k), d = c.dir || 1;
      return { ...squat(POSES.ride(t, c), .32 + .6 * air), boardTilt: -d * 14 * Math.sin(Math.PI * seg(k, 0, .5)) + d * 6 * Math.sin(Math.PI * seg(k, .5, 1)),
        mouth: 'open', eyes: 'open' }; },
  };

  function mixPose(a, b, k) {
    const o = {};
    for (const key of Object.keys(b)) {
      const va = a[key], vb = b[key];
      o[key] = typeof va === 'number' && typeof vb === 'number' ? va + (vb - va) * k : (k < .5 ? va ?? vb : vb);
    }
    return o;
  }

  window.handOf = handOf;
  window.createCharacter = createCharacter;
  window.POSES = POSES;
  window.mixPose = mixPose;
})();
