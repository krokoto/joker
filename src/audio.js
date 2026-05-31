/**
 * audio.js — 音效系统
 *
 * 职责：
 * 1. AudioContext 管理 + Autoplay 解锁（首次用户交互后才初始化）
 * 2. 17 个 SFX 全部 Web Audio API 代码合成（零音频文件）
 * 3. BGM 用 HTMLAudioElement 加载 public/ 目录的 MP3 文件，静默降级
 * 4. 音量由外部传入（sfxVolume / bgmVolume，0–100 整数）
 */

// ===== 内部状态 =====
let audioCtx = null   // 单例 AudioContext
let unlocked = false  // 是否已完成 autoplay 解锁

let bgmAudio = null   // HTMLAudioElement for BGM
let bgmUnlocked = false // BGM 是否已尝试启动

// 外部通过 setSfxVolume / setBgmVolume 更新这两个值
let sfxVol = 0.7  // 0.0–1.0
let bgmVol = 0.5  // 0.0–1.0

// SFX-16 AI 思考脉冲定时器
let aiPulseTimer = null

// ===== 初始化 AudioContext（首次交互时调用） =====
function ensureContext() {
  if (audioCtx) {
    // 如果被浏览器暂停就 resume
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    return audioCtx
  }
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  } catch {
    // 浏览器不支持，静默降级
    audioCtx = null
  }
  return audioCtx
}

// ===== Autoplay 解锁（全局 click 一次性监听） =====
export function setupAutoplayUnlock(getBgmVolume) {
  const handler = () => {
    unlocked = true
    ensureContext()
    // 尝试启动 BGM
    startBgm(getBgmVolume())
    document.removeEventListener('click', handler)
    document.removeEventListener('pointerdown', handler)
  }
  document.addEventListener('click', handler, { once: false })
  document.addEventListener('pointerdown', handler, { once: false })
  // 实际上 { once: true } 不能同时用两个事件都 once，所以手动 removeEventListener
}

// ===== BGM 控制 =====
export function initBgm() {
  // 只初始化一次 Audio 元素，不自动播放
  if (bgmAudio) return
  const base = import.meta.env.BASE_URL
  const src = base + 'Warzone - Anno Domini Beats.mp3'
  try {
    bgmAudio = new Audio(src)
    bgmAudio.loop = true
    bgmAudio.volume = bgmVol
    bgmAudio.addEventListener('error', () => {
      // BGM 文件加载失败，静默降级
      bgmAudio = null
    }, { once: true })
  } catch {
    bgmAudio = null
  }
}

function startBgm(vol) {
  bgmVol = Math.max(0, Math.min(1, (vol ?? 50) / 100))
  if (!bgmAudio) return
  bgmAudio.volume = bgmVol
  if (bgmVol === 0) {
    // 音量为 0 时暂停
    bgmAudio.pause()
  } else {
    bgmAudio.play().catch(() => {
      // Autoplay 策略阻止，静默降级
    })
    bgmUnlocked = true
  }
}

// 外部调用：实时更新 BGM 音量（watch settings.bgmVolume）
export function setBgmVolume(vol100) {
  bgmVol = Math.max(0, Math.min(1, vol100 / 100))
  if (!bgmAudio) return
  bgmAudio.volume = bgmVol
  if (bgmVol === 0) {
    bgmAudio.pause()
  } else if (unlocked && bgmAudio.paused) {
    bgmAudio.play().catch(() => {})
  }
}

// 外部调用：实时更新 SFX 音量
export function setSfxVolume(vol100) {
  sfxVol = Math.max(0, Math.min(1, vol100 / 100))
}

// ===== SFX 合成工具 =====

/**
 * 播放一个简单振荡器音
 * @param {object} opts
 * @param {string} opts.type - 波形: sine/square/sawtooth/triangle
 * @param {number} opts.freq - 起始频率 Hz
 * @param {number} opts.freqEnd - 结束频率（可选，用于频率滑动）
 * @param {number} opts.dur - 持续时间 s
 * @param {number} opts.gainPeak - 峰值增益（0–1，会与 sfxVol 相乘）
 * @param {number} opts.attackT - 攻击时间 s
 * @param {number} opts.decayT - 衰减时间 s
 * @param {number} opts.startDelay - 延迟启动 s（默认 0）
 */
function playTone(opts) {
  if (!unlocked) return  // 未解锁则静默
  const ctx = ensureContext()
  if (!ctx) return
  if (sfxVol <= 0) return

  const {
    type = 'sine',
    freq = 440,
    freqEnd,
    dur = 0.1,
    gainPeak = 0.5,
    attackT = 0.005,
    decayT,
    startDelay = 0,
  } = opts

  const now = ctx.currentTime + startDelay
  const decay = decayT ?? (dur - attackT)

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  if (freqEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(freqEnd, now + dur)
  }

  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(gainPeak * sfxVol, now + attackT)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attackT + decay)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + dur + 0.01)
}

/**
 * 叠加多个音符（同时播放），每个 note = playTone opts
 */
function playChord(notes) {
  notes.forEach(n => playTone(n))
}

// ===== 17 个 SFX 实现 =====

// SFX-01: 选牌 — 短促上扬单音「滴」，80ms
export function sfx01SelectCard() {
  playTone({ type: 'sine', freq: 880, freqEnd: 1100, dur: 0.08, gainPeak: 0.4, attackT: 0.005 })
}

// SFX-02: 取消选牌 — 下行单音「嗒」，80ms
export function sfx02DeselectCard() {
  playTone({ type: 'sine', freq: 660, freqEnd: 440, dur: 0.08, gainPeak: 0.35, attackT: 0.005 })
}

// SFX-03: 出牌飞牌 — 快速下扫「嗖」，200ms
export function sfx03PlayFly() {
  // 高频扫到低频，sawtooth 更有「嗖」感
  playTone({ type: 'sawtooth', freq: 1200, freqEnd: 200, dur: 0.18, gainPeak: 0.45, attackT: 0.005 })
  // 叠加白噪近似（用高频 triangle 模拟）
  playTone({ type: 'triangle', freq: 2400, freqEnd: 400, dur: 0.15, gainPeak: 0.15, attackT: 0.003 })
}

// SFX-04: 逐张高亮计分 — 音高递增，100ms × 张数
// index: 0–4, 第 0 张最低，第 4 张最高（约一个八度）
const SFX04_FREQS = [330, 440, 554, 659, 880]  // E4→A4→C#5→E5→A5（约 1.5 octave）
export function sfx04ScoreTick(index) {
  const freq = SFX04_FREQS[Math.min(index, SFX04_FREQS.length - 1)]
  playTone({ type: 'square', freq, dur: 0.1, gainPeak: 0.3, attackT: 0.003, decayT: 0.09 })
}

// SFX-05: Joker 金光 — 神秘感「嗡叮」，350ms
export function sfx05JokerGlow() {
  // 低沉嗡声
  playTone({ type: 'sine', freq: 110, freqEnd: 220, dur: 0.2, gainPeak: 0.35, attackT: 0.02 })
  // 高频叮声（延迟 150ms）
  playTone({ type: 'sine', freq: 880, freqEnd: 1320, dur: 0.2, gainPeak: 0.25, attackT: 0.005, startDelay: 0.15 })
  // 轻微混响感：再来一个稍低的回声（延迟 60ms）
  playTone({ type: 'sine', freq: 660, dur: 0.12, gainPeak: 0.1, attackT: 0.005, startDelay: 0.06 })
}

// SFX-06: 计分公式爆出 — 「砰嗡」冲击音，500ms，全局最响
export function sfx06ScoreBoom() {
  const ctx = ensureContext()
  if (!ctx || !unlocked || sfxVol <= 0) return

  // 低频冲击（bass thump）
  playTone({ type: 'sine', freq: 60, freqEnd: 30, dur: 0.35, gainPeak: 0.7, attackT: 0.003 })
  // 中频厚重
  playTone({ type: 'triangle', freq: 120, freqEnd: 60, dur: 0.3, gainPeak: 0.5, attackT: 0.003 })
  // 高频亮点
  playTone({ type: 'square', freq: 1760, freqEnd: 880, dur: 0.15, gainPeak: 0.35, attackT: 0.003 })
  // 加一个下扫噪音感
  playTone({ type: 'sawtooth', freq: 800, freqEnd: 80, dur: 0.25, gainPeak: 0.3, attackT: 0.003 })
}

// SFX-07: 发牌入手 — 轻柔「啪」，100ms
export function sfx07Deal() {
  // 短促中频冲击感
  playTone({ type: 'triangle', freq: 300, freqEnd: 150, dur: 0.09, gainPeak: 0.3, attackT: 0.003 })
  playTone({ type: 'sine', freq: 800, freqEnd: 400, dur: 0.06, gainPeak: 0.15, attackT: 0.003 })
}

// SFX-08: 通关胜利 — 上行琶音，1200ms
export function sfx08Win() {
  // 5 个上行音节，最后一个长音
  const notes = [
    { freq: 523, dur: 0.15 },   // C5
    { freq: 659, dur: 0.15 },   // E5
    { freq: 784, dur: 0.15 },   // G5
    { freq: 1047, dur: 0.15 },  // C6
    { freq: 1319, dur: 0.15 },  // E6
    { freq: 1568, dur: 0.55 },  // G6（长尾）
  ]
  let t = 0
  notes.forEach((n, i) => {
    const gainPeak = i < 5 ? 0.4 : 0.55
    playTone({ type: 'square', freq: n.freq, dur: n.dur + 0.05, gainPeak, attackT: 0.005, startDelay: t })
    // 叠加 triangle 增加温暖感
    playTone({ type: 'triangle', freq: n.freq * 0.5, dur: n.dur + 0.05, gainPeak: gainPeak * 0.4, attackT: 0.005, startDelay: t })
    t += 0.18
  })
}

// SFX-09: 关卡失败 — 下行 3 音「呜哦唔」，800ms
export function sfx09Lose() {
  const notes = [
    { freq: 392, dur: 0.25 },  // G4
    { freq: 294, dur: 0.25 },  // D4
    { freq: 196, dur: 0.4 },   // G3（渐弱消散）
  ]
  let t = 0
  notes.forEach((n, i) => {
    const gainPeak = i < 2 ? 0.45 : 0.35
    playTone({ type: 'sine', freq: n.freq, freqEnd: n.freq * 0.85, dur: n.dur, gainPeak, attackT: 0.01, startDelay: t })
    t += 0.28
  })
}

// SFX-10: 进入商店 — 上扬双音「叮咚」，400ms
export function sfx10EnterShop() {
  playTone({ type: 'sine', freq: 880, dur: 0.18, gainPeak: 0.4, attackT: 0.005, startDelay: 0 })
  playTone({ type: 'sine', freq: 1320, dur: 0.22, gainPeak: 0.45, attackT: 0.005, startDelay: 0.18 })
}

// SFX-11: 金币到账 — 硬币碰撞「叮」，连响 n 次（间隔 120ms）
export function sfx11Coins(amount) {
  let count = 1
  if (amount >= 8) count = 3
  else if (amount >= 6) count = 2
  for (let i = 0; i < count; i++) {
    // 音高稍微随机微变
    const freqJitter = 1400 + Math.random() * 200
    playTone({ type: 'sine', freq: freqJitter, freqEnd: freqJitter * 0.9, dur: 0.1, gainPeak: 0.4, attackT: 0.003, startDelay: i * 0.12 })
    playTone({ type: 'triangle', freq: freqJitter * 0.5, dur: 0.08, gainPeak: 0.15, attackT: 0.003, startDelay: i * 0.12 })
  }
}

// SFX-12: 买卡成功 — 上行双音「叮当」，300ms
export function sfx12BuyJoker() {
  playTone({ type: 'sine', freq: 784, dur: 0.14, gainPeak: 0.45, attackT: 0.005, startDelay: 0 })
  playTone({ type: 'triangle', freq: 784, dur: 0.14, gainPeak: 0.2, attackT: 0.005, startDelay: 0 })
  playTone({ type: 'sine', freq: 1175, dur: 0.18, gainPeak: 0.5, attackT: 0.005, startDelay: 0.13 })
  playTone({ type: 'triangle', freq: 1175, dur: 0.18, gainPeak: 0.22, attackT: 0.005, startDelay: 0.13 })
}

// SFX-13: 按钮通用反馈 — 短促中性「咔哒」，60ms
export function sfx13ButtonClick() {
  playTone({ type: 'square', freq: 220, freqEnd: 180, dur: 0.06, gainPeak: 0.2, attackT: 0.003 })
}

// SFX-14: 弃牌 — 低沉短促「噗」，120ms
export function sfx14Discard() {
  playTone({ type: 'triangle', freq: 180, freqEnd: 80, dur: 0.1, gainPeak: 0.45, attackT: 0.005 })
  playTone({ type: 'sine', freq: 120, freqEnd: 60, dur: 0.08, gainPeak: 0.3, attackT: 0.003 })
}

// SFX-15: UI 滑块/设置反馈 — 极短轻柔「嘀」，40ms，带节流
let _sfx15LastTime = 0
export function sfx15Slider() {
  const now = Date.now()
  if (now - _sfx15LastTime < 100) return  // 节流 100ms
  _sfx15LastTime = now
  playTone({ type: 'sine', freq: 1200, dur: 0.04, gainPeak: 0.15, attackT: 0.003 })
}

// SFX-16: AI 思考脉冲 — 科技感低频「嘟」，200ms
// 外部用 startAiPulse / stopAiPulse 管理循环
function playAiPulseTone() {
  playTone({ type: 'square', freq: 180, freqEnd: 160, dur: 0.18, gainPeak: 0.3, attackT: 0.01 })
  // 叠加金属感泛音
  playTone({ type: 'sawtooth', freq: 360, freqEnd: 320, dur: 0.12, gainPeak: 0.12, attackT: 0.005 })
}

export function startAiPulse() {
  stopAiPulse()  // 先清掉旧的
  playAiPulseTone()
  aiPulseTimer = setInterval(playAiPulseTone, 400)
}

export function stopAiPulse() {
  if (aiPulseTimer !== null) {
    clearInterval(aiPulseTimer)
    aiPulseTimer = null
  }
}

// SFX-17: AI 决策完成 — 上扬确定的「叮」，200ms
export function sfx17AiDecide() {
  playTone({ type: 'sine', freq: 880, freqEnd: 1320, dur: 0.18, gainPeak: 0.5, attackT: 0.005 })
  playTone({ type: 'triangle', freq: 880, freqEnd: 1320, dur: 0.18, gainPeak: 0.25, attackT: 0.005 })
}
