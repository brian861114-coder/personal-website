"""
介紹動畫的配樂與音效（全部用 numpy 原創合成，沒有外部音源，也就沒有授權問題）。

用法（通常由 render.mjs 自動呼叫）：
    py tools/intro-video/audio.py out/cues.json out/soundtrack.wav

cues.json 由 render.mjs 從 scripts.js 產生（時間已換算成影片時間）：
    { "dur": 30, "sync": { "bpm", "offset", "cuts": [...] }, "cues": [ { "t", "type", "x", "x2", "g", "d", "p", "mute" } ] }

配樂：108.5 BPM、C 大調 C–G–Am–F，馬林巴 + 撥弦 + 貝斯 + 鼓組 + 鐘琴。
  開場（S1）只有馬林巴和彈指，換到 S2 時整組進來；S4 加開放鈸與鐘琴；S6 加主旋律；
  S7 抽掉鼓和貝斯，最後一拍（第 52 拍，角色推眼鏡的瞬間）全體重擊收尾。
音效：依 cue 類型合成，x 決定左右聲道，移動類音效（x → x2）會跟著移動。
"""
import json
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


# ---------------------------------------------------------------- 基本工具
def tarr(d):
    return np.arange(max(1, int(d * SR))) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def noise(d):
    return rng.standard_normal(max(1, int(d * SR)))


def spectral(x, lo=None, hi=None, order=2):
    """零相位的高通 / 低通（FFT 上乘幅度響應）。"""
    n = len(x)
    nfft = 1 << max(8, (n - 1).bit_length())
    X = np.fft.rfft(x, nfft)
    f = np.fft.rfftfreq(nfft, 1 / SR)
    H = np.ones_like(f)
    if hi:
        H /= np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        H /= np.sqrt(1 + (lo / np.maximum(f, 1.0)) ** (2 * order))
    return np.fft.irfft(X * H, nfft)[:n]


def sweep(x, fc_fn, bw_oct=1.2):
    """時變帶通（STFT 逐格改中心頻率），做呼嘯聲用。fc_fn(相對秒數) → Hz。"""
    win, hop = 1024, 256
    w = np.hanning(win)
    out = np.zeros(len(x) + win)
    norm = np.zeros(len(x) + win)
    f = np.fft.rfftfreq(win, 1 / SR)
    lf = np.log2(np.maximum(f, 20.0))
    for s in range(0, len(x), hop):
        seg = x[s:s + win]
        if len(seg) < win:
            seg = np.pad(seg, (0, win - len(seg)))
        fc = max(40.0, fc_fn((s + win / 2) / SR))
        H = np.exp(-0.5 * ((lf - np.log2(fc)) / (bw_oct / 2)) ** 2)
        out[s:s + win] += np.fft.irfft(np.fft.rfft(seg * w) * H, win) * w
        norm[s:s + win] += w * w
    return (out / np.maximum(norm, 1e-3))[:len(x)]


def norm_rms(x, target=0.2):
    r = np.sqrt(np.mean(x ** 2)) + 1e-12
    return x * (target / r)


def fade(x, a=0.003, r=0.01):
    n = len(x)
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return x * e


def mix(*parts):
    """(權重, 訊號) 相加，長度不同時補零到最長。"""
    n = max(len(x) for _, x in parts)
    out = np.zeros(n)
    for w, x in parts:
        out[:len(x)] += w * x
    return out


def modal(freqs, amps, decays, d=0.5):
    t = tarr(d)
    return sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / dc) for f, a, dc in zip(freqs, amps, decays)) * np.minimum(1, t / 0.0008)


class Bus:
    def __init__(self, n):
        self.n = n
        self.L = np.zeros(n)
        self.R = np.zeros(n)

    def add(self, sig, t, pan=0.0, gain=1.0, pan2=None):
        """pan -1（左）..1（右），等功率；給 pan2 時聲像在音效期間線性移動。"""
        i = int(round(t * SR))
        if i < 0:
            sig, i = sig[-i:], 0
        if i >= self.n or len(sig) == 0:
            return
        m = min(len(sig), self.n - i)
        s = sig[:m] * gain
        p = np.full(m, pan) if pan2 is None else np.linspace(pan, pan2, m)
        a = (np.clip(p, -1, 1) + 1) * np.pi / 4
        self.L[i:i + m] += s * np.cos(a)
        self.R[i:i + m] += s * np.sin(a)


def xpan(x):
    return float(np.clip((x - 960) / 960, -1, 1)) * 0.75


# ---------------------------------------------------------------- 樂器
def marimba(m, vel=1.0, d=1.4):
    f, t = mtof(m), tarr(d)
    tau = 0.55 * (261.6 / f) ** 0.35
    y = (np.sin(2 * np.pi * f * t) * np.exp(-t / tau)
         + 0.3 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / (tau * 0.2))
         + 0.08 * np.sin(2 * np.pi * f * 9.3 * t) * np.exp(-t / (tau * 0.07)))
    y *= np.minimum(1, t / 0.0015)
    c = spectral(noise(0.006), 900, 5000)
    y[:len(c)] += norm_rms(c, 0.04) * np.linspace(1, 0, len(c))
    return y * vel


def glock(m, vel=1.0, d=2.0):
    f, t = mtof(m), tarr(d)
    parts = [(1, 1, 1.3), (2.76, .4, .4), (5.40, .22, .18), (8.93, .1, .08)]
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / dc) for r, a, dc in parts) * np.minimum(1, t / 0.0008) * vel


def pluck(m, vel=1.0, d=1.0, bright=0.55, decay=0.996):
    """Karplus–Strong 撥弦；用內插修正整數延遲造成的音高誤差。"""
    f = mtof(m)
    Lx = SR / f
    L = int(Lx)
    n = int(d * SR * Lx / L) + 2 * L
    y = np.zeros(n)
    exc = spectral(rng.standard_normal(L * 4), hi=1500 + 6000 * bright)[:L]
    y[:L] = exc - exc.mean()
    for s in range(L, n, L):
        e = min(s + L, n)
        k = e - s
        a = y[s - L:s - L + k]
        b = np.concatenate(([y[s - L - 1]] if s - L - 1 >= 0 else [0.0], y[s - L:s - L + k - 1]))
        y[s:e] = decay * 0.5 * (a + b)
    out = np.interp(np.arange(int(d * SR)) * (L / Lx), np.arange(n), y)
    out = fade(out, 0.001, 0.03)
    return out / (np.abs(out).max() + 1e-9) * vel


def bass(m, d, vel=1.0):
    f, t = mtof(m), tarr(d + 0.08)
    y = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) + 0.22 * np.sin(6 * np.pi * f * t)
    e = np.minimum(1, t / 0.004) * (0.6 + 0.4 * np.exp(-t / 0.12)) * np.clip((d + 0.08 - t) / 0.08, 0, 1)
    return np.tanh(1.6 * y * e) / np.tanh(1.6) * vel


def kick(vel=1.0):
    t = tarr(0.45)
    f = 56 + 120 * np.exp(-t / 0.03)                   # 收在 56Hz、鼓身在 80–150Hz，手機喇叭也聽得到
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.13) * np.minimum(1, t / 0.001)
    y += norm_rms(spectral(noise(0.45), 1500, 7000), 0.4) * np.exp(-t / 0.005)
    return y * vel


def clap(vel=1.0):
    t = tarr(0.35)
    nz = norm_rms(spectral(noise(0.35), 800, 3400), 0.5)
    e = sum((t >= o) * np.exp(-np.maximum(0, t - o) / 0.005) for o in (0, .010, .021)) * 0.7
    e += (t >= .028) * np.exp(-np.maximum(0, t - .028) / 0.09) * 0.55
    return nz * e * vel


def snap(vel=1.0):
    t = tarr(0.12)
    return (norm_rms(spectral(noise(0.12), 1800, 5500), 0.6) * np.exp(-t / 0.012)
            + 0.3 * np.sin(2 * np.pi * 1850 * t) * np.exp(-t / 0.01)) * vel


def shaker(vel=1.0):
    t = tarr(0.08)
    return norm_rms(spectral(noise(0.08), 5500, 12000), 0.4) * np.minimum(1, t / 0.006) * np.exp(-t / 0.025) * vel


def openhat(vel=1.0):
    t = tarr(0.35)
    return norm_rms(spectral(noise(0.35), 7000, 14000), 0.4) * np.exp(-t / 0.12) * vel


def crash(vel=1.0, d=2.2):
    t = tarr(d)
    y = norm_rms(spectral(noise(d), 3500, 13000), 0.4) * np.exp(-t / 0.7)
    y += sum(0.05 * np.sin(2 * np.pi * f * t) for f in (3120, 4230, 5310, 6620)) * np.exp(-t / 0.5)
    return y * np.minimum(1, t / 0.002) * vel


def boom(vel=1.0, d=1.2):
    t = tarr(d)
    f = 44 + 40 * np.exp(-t / 0.18)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.45) * np.minimum(1, t / 0.003) * vel


def pad(notes, d, vel=1.0):
    t = tarr(d)
    y = np.zeros(len(t))
    for m in notes:
        for det in (-0.07, 0, 0.07):
            f = mtof(m + det)
            y += 2 * ((f * t + rng.random()) % 1) - 1
    y = spectral(y, 120, 1300)
    e = np.minimum(1, t / 0.35) * np.clip((d - t) / 0.4, 0, 1)
    return norm_rms(y, 0.2) * e * vel


def riser(d, vel=1.0):
    t = tarr(d)
    y = sweep(noise(d), lambda s: 300 * (6000 / 300) ** (s / d), 1.4)
    y = norm_rms(y, 0.3) * (t / d) ** 2
    return fade(y, 0.05, 0.02) * vel


# ---------------------------------------------------------------- 音效
def sfx(c):
    k, d = c['type'], c.get('d', 0.4)
    if k in ('whoosh', 'cut'):
        y = sweep(noise(d), lambda s: 500 * (3000 / 500) ** np.sin(np.pi * min(1, s / d)), 1.3)
        return norm_rms(y, 0.3) * np.sin(np.pi * np.clip(tarr(d) / d, 0, 1)) ** 1.6
    if k == 'whooshUp':
        y = sweep(noise(d), lambda s: 300 * (3500 / 300) ** (s / d), 1.2)
        tt = tarr(d) / d
        return norm_rms(y, 0.3) * np.minimum(1, tt * 4) * (1 - tt) ** 0.7
    if k == 'fall':
        y = sweep(noise(d), lambda s: 3200 * (350 / 3200) ** (s / d), 1.2)
        return norm_rms(y, 0.28) * np.sin(np.pi * np.clip(tarr(d) / d, 0, 1))
    if k == 'tug':
        t = tarr(0.16)
        thump = np.sin(2 * np.pi * np.cumsum(55 + 45 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.05)
        fr = norm_rms(spectral(noise(0.16), 1300, 3600), 0.18) * np.minimum(1, t / 0.01) * np.exp(-t / 0.035)
        creak = np.sin(2 * np.pi * (170 * t + 8 * np.sin(2 * np.pi * 35 * t))) * np.exp(-t / 0.04) * 0.12
        return 0.8 * thump + fr + creak
    if k == 'drag':
        t = tarr(d)
        v = np.exp(-t / (d * 0.35))                    # 拉一下：先快後慢
        return norm_rms(spectral(noise(d), 900, 4200), 0.16) * v * np.minimum(1, t / 0.01)
    if k == 'roll':
        t = tarr(d)
        puls = 0.6 + 0.4 * np.abs(np.sin(np.pi * t / 0.35))
        y = norm_rms(spectral(noise(d), 250, 1600), 0.2) * puls
        return fade(y, 0.08, 0.15)
    if k == 'slide':
        y = norm_rms(spectral(noise(d), 1400, 5000), 0.1) * (0.7 + 0.3 * np.sin(2 * np.pi * 3.1 * tarr(d)))
        return fade(y, 0.1, 0.05)
    if k == 'thud':
        t = tarr(0.4)
        y = np.sin(2 * np.pi * np.cumsum(55 + 60 * np.exp(-t / 0.04)) / SR) * np.exp(-t / 0.14)
        y += norm_rms(spectral(noise(0.4), 60, 420), 0.35) * np.exp(-t / 0.03)
        return y
    if k == 'clunk':
        y = modal([205, 470, 1040, 1730], [1, .6, .35, .18], [.12, .06, .03, .015], 0.45)
        return mix((0.7, y), (0.6, sfx({'type': 'thud'})))
    if k == 'clack':
        return modal([880, 2100, 3650], [1, .5, .25], [.05, .025, .012], 0.2) * 0.8
    if k == 'ollie':
        y = modal([1150, 2600, 4100], [1, .5, .3], [.03, .015, .008], 0.15)
        y += norm_rms(spectral(noise(0.15), 2000, 7000), 0.08) * np.exp(-tarr(0.15) / 0.04)
        return y
    if k == 'land':
        return mix((0.7, sfx({'type': 'clack'})), (0.5, sfx({'type': 'thud'})))
    if k == 'skate':
        t = tarr(d)
        y = norm_rms(spectral(noise(d), 60, 380), 0.25) * (1 + 0.25 * np.sin(2 * np.pi * 7 * t))
        y += norm_rms(spectral(noise(d), 900, 1600), 0.03)
        for j in np.arange(0.12, d, 0.29):            # 地面接縫
            i = int(j * SR)
            seam = modal([700, 1500], [.4, .2], [.015, .008], 0.05)
            y[i:i + len(seam)] += seam[:len(y) - i]
        e = np.ones(len(t))
        for a, b in c.get('mute', []):                # 跳起來時輪子離地
            e[(t >= a) & (t <= b)] = 0.08
        e = np.convolve(e, np.ones(960) / 960, 'same')
        return fade(y * e, 0.05, 0.08)
    if k == 'pop':
        t = tarr(0.18)
        f = mtof(c.get('p', 79))
        y = np.sin(2 * np.pi * np.cumsum(f * (0.72 + 0.33 * np.minimum(1, t / 0.035))) / SR) * np.exp(-t / 0.06)
        return y * np.minimum(1, t / 0.002) * 0.7
    if k == 'ding':
        return glock(c.get('p', 84), 0.8, 1.6)
    if k == 'sparkle':
        y = np.zeros(int(0.9 * SR))
        for j, m in enumerate([88, 91, 93, 96]):
            n = glock(m, 0.35 * (1 - j * 0.12), 0.7)
            i = int(j * 0.045 * SR)
            y[i:i + len(n)] += n[:len(y) - i]
        return y
    if k == 'shine':
        y = np.zeros(int(1.4 * SR))
        for j, m in enumerate([84, 86, 88, 91, 93, 96, 100]):
            n = glock(m, 0.28, 0.9)
            i = int(j * 0.06 * SR)
            y[i:i + len(n)] += n[:len(y) - i]
        air = sweep(noise(0.7), lambda s: 3000 * 3 ** (s / 0.7), 1.0)
        y[:len(air)] += norm_rms(air, 0.05) * np.sin(np.pi * tarr(0.7) / 0.7)
        return y
    if k == 'reveal':
        t = tarr(0.35)
        return norm_rms(spectral(noise(0.35), 3000, 9000), 0.12) * np.sin(np.pi * np.clip(t / 0.35, 0, 1)) ** 2
    if k == 'count':
        y = np.zeros(int((d + 0.1) * SR))
        tt = 0.0
        while tt < d:
            t = tarr(0.03)
            f = 2600 + 1400 * tt / d
            tick = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) * (0.25 + 0.2 * tt / d)
            i = int(tt * SR)
            y[i:i + len(tick)] += tick
            tt += 0.07 * (1 + 0.8 * tt / d)            # 越跑越慢（跟數字的 easing 一致）
        return y
    if k == 'ropeDrop':
        t = tarr(0.2)
        return mix((1, norm_rms(spectral(noise(0.2), 150, 1200), 0.2) * np.exp(-t / 0.04)), (0.3, sfx({'type': 'thud'})))
    if k == 'heave':
        t = tarr(0.25)
        return 0.5 * np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.06) + norm_rms(spectral(noise(0.25), 2000, 6000), 0.05) * np.exp(-t / 0.08)
    if k == 'click':
        return modal([2400, 4100, 6300], [1, .5, .25], [.012, .007, .004], 0.08) * 0.6
    raise ValueError('unknown cue type ' + k)


# ---------------------------------------------------------------- 配樂
PROG = [  # (撥弦和弦, 貝斯根音)：C–G–Am–F，撥弦用平順的轉位
    ([60, 64, 67], 36), ([59, 62, 67], 43), ([60, 64, 69], 45), ([60, 65, 69], 41)]
HOOK = [[84, 88, 86, 84], [83, 86, 83, 79], [84, 88, 91, 88], [89, 88, 86, 84]]


def music(bus, sync, dur):
    b = 60 / sync['bpm']
    T = lambda n: sync['offset'] + n * b              # 第 n 拍的時間
    cut_beats = [round((c - sync['offset']) / b) for c in sync['cuts']]
    S2, S3, S4, S5, S6, S7 = cut_beats                 # 5, 12, 19, 27, 37, 47
    END = S7 + 5                                       # 第 52 拍：最後重擊
    kicks = []

    # 前奏：鋪底 + 弱起
    bus.add(pad([60, 64, 67], T(S2) + 0.3), 0, 0, 0.05)
    bus.add(marimba(79, 0.5), T(0), 0.1, 0.3)
    bus.add(riser(T(S2) - T(2)), T(2), 0, 0.28)
    for n in range(1, END):
        bar, beat = (n - 1) // 4, (n - 1) % 4
        chord, root = PROG[bar % 4]
        arp = sorted(x + 12 for x in chord) + [chord[0] + 24]
        intro, outro = n < S2, n >= S7
        step = b / 4
        # 馬林巴：前奏四分音符，之後八分音符分解和弦
        if intro or outro:
            bus.add(marimba(arp[beat % 4], 0.55), T(n), -0.25 + 0.15 * beat, 0.3)
        else:
            for e, idx in enumerate([[0, 2], [1, 3], [2, 1], [3, 2]][beat]):
                bus.add(marimba(arp[idx], 0.5 if e else 0.6), T(n) + e * 2 * step, -0.3 + 0.2 * idx, 0.3)
        if intro:
            if beat in (1, 3):
                bus.add(snap(0.8), T(n), 0.2, 0.35)
            continue
        if outro:                                     # 收尾前：只留拍手和鋪底
            if beat in (1, 3):
                bus.add(clap(0.7), T(n), 0, 0.3)
            continue
        # 鼓組
        for s in [0, 6, 8] + ([10] if bar % 2 else []):
            if s // 4 == beat:
                kicks.append(T(n) + (s % 4) * step)
                bus.add(kick(1.0), T(n) + (s % 4) * step, 0, 0.6)
        if beat in (1, 3):
            bus.add(clap(1.0), T(n), 0, 0.42)
        for s in range(4):
            bus.add(shaker(1.0 if s % 2 else 0.5), T(n) + s * step, 0.35, 0.2)
        if S4 <= n < S5:
            bus.add(openhat(1.0), T(n) + 2 * step, -0.3, 0.12)
        # 貝斯（切分）
        for s, dn, iv in [(0, 3, 0), (3, 2, 0), (6, 2, 0), (8, 3, 0), (11, 2, 7), (14, 2, 12)]:
            if s // 4 == beat:
                bus.add(bass(root + iv, dn * step * 0.9, 1.0), T(n) + (s % 4) * step, 0, 0.26)
        # 撥弦：反拍刷和弦
        for j, m in enumerate(chord):
            bus.add(pluck(m, 0.8, 0.35, 0.5, 0.985), T(n) + 2 * step + j * 0.008, -0.4 + 0.4 * j, 0.2)
        # 鐘琴：S4 分解和弦、S6 主旋律
        if S4 <= n < S5:
            bus.add(glock(arp[(beat + 2) % 4] + 12, 0.5, 1.0), T(n) + 2 * step, 0.4, 0.12)
        if S6 <= n < S7:
            bus.add(glock(HOOK[bar % 4][beat], 0.8, 1.2), T(n), 0.15, 0.2)
    # 重音：S2 進場、S6 換段
    for n in (S2, S6):
        bus.add(crash(0.9), T(n), 0.3, 0.3)
    bus.add(boom(1.0), T(S2), 0, 0.3)
    bus.add(riser(T(END) - T(END - 3)), T(END - 3), 0, 0.22)
    # 最後一拍全體重擊
    t = T(END)
    kicks.append(t)
    bus.add(kick(1.0), t, 0, 0.7)
    bus.add(boom(1.0, 1.5), t, 0, 0.3)
    bus.add(crash(1.0, 2.5), t, 0.2, 0.35)
    for j, m in enumerate([48, 60, 64, 67, 72]):
        bus.add(pluck(m, 0.9, 1.6, 0.6), t + j * 0.01, -0.4 + 0.2 * j, 0.22)
    for m in (72, 76, 79, 84):
        bus.add(marimba(m, 0.6, 1.6), t, 0, 0.25)
    for m in (84, 91, 96):
        bus.add(glock(m, 0.6, 1.8), t, 0.2, 0.14)
    bus.add(bass(36, 0.8, 1.0), t, 0, 0.28)
    return kicks


# ---------------------------------------------------------------- 殘響與混音
def master_eq(x):
    """總線等化：去掉 30Hz 以下、110Hz 以下架降 3dB、3.5kHz 以上架升 3.5dB（手機與筆電喇叭上比較清楚）。"""
    n = len(x)
    nfft = 1 << (n - 1).bit_length()
    X = np.fft.rfft(x, nfft)
    f = np.maximum(np.fft.rfftfreq(nfft, 1 / SR), 1.0)
    H = 1 / np.sqrt(1 + (30 / f) ** 6)
    H *= 10 ** (-3 / 20 * (1 / (1 + (f / 110) ** 2)))
    H *= 10 ** (3.5 / 20 * (1 / (1 + (3500 / f) ** 2)))
    return np.fft.irfft(X * H, nfft)[:n]


def reverb(x, dur=1.6, rt=0.42, seed=3):
    r = np.random.default_rng(seed)
    t = tarr(dur)
    ir = r.standard_normal(len(t)) * np.exp(-t / rt)
    ir = spectral(ir, 200, 6000)
    ir = np.concatenate([np.zeros(int(0.015 * SR)), ir])
    ir /= np.sqrt(np.sum(ir ** 2))
    n = len(x) + len(ir) - 1
    nfft = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:len(x)]


def main(cue_path, out_path):
    info = json.load(open(cue_path, encoding='utf-8'))
    dur = info['dur']
    n = int(dur * SR)
    mus, fx = Bus(n), Bus(n)
    kicks = music(mus, info['sync'], dur)
    for c in info['sync']['cuts']:                      # 換場的呼嘯聲：由右往左（跟畫面滑動方向一致）
        fx.add(sfx({'type': 'cut', 'd': 0.7}), c - 0.45, 0.6, 0.3, -0.6)
    for c in info['cues']:
        y = sfx(c)
        p1 = xpan(c.get('x', 960))
        p2 = xpan(c['x2']) if 'x2' in c else None
        fx.add(y, c['t'], p1, c.get('g', 1.0) * 0.55, p2)

    # 側鏈：大鼓打下去時音樂其他部分讓一下（聽起來更有律動）
    t = np.arange(n) / SR
    duck = np.ones(n)
    for k in kicks:
        i = int(k * SR)
        m = min(n - i, int(0.3 * SR))
        if m > 0:
            duck[i:i + m] = np.minimum(duck[i:i + m], 1 - 0.35 * np.exp(-t[:m] / 0.09))
    ML, MR = mus.L * duck, mus.R * duck
    ML += 0.2 * reverb(ML, seed=3)
    MR += 0.2 * reverb(MR, seed=4)
    FL = fx.L + 0.12 * reverb(fx.L, 1.2, 0.3, 5)
    FR = fx.R + 0.12 * reverb(fx.R, 1.2, 0.3, 6)
    MUSIC = 0.45                                        # 配樂相對音效的音量（原本 0.75，Brian 要求再小聲一點）
    L, R = master_eq(MUSIC * ML + FL), master_eq(MUSIC * MR + FR)
    # 母帶：柔性削峰、結尾淡出
    L, R = np.tanh(1.2 * L) / 1.2, np.tanh(1.2 * R) / 1.2
    tail = np.clip((dur - t) / 0.25, 0, 1)
    L, R = L * tail, R * tail
    peak = max(np.abs(L).max(), np.abs(R).max()) + 1e-9
    L, R = L / peak * 0.89, R / peak * 0.89
    pcm = (np.stack([L, R], 1) * 32767).astype('<i2')
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print('wrote', out_path, f'{dur:.2f}s')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
