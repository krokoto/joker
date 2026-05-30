// ============================================================
// 游戏核心逻辑 · 纯函数 / 数据定义，不依赖 Vue
// ============================================================

// ===== 牌组 =====
export const SUITS = ['♠', '♥', '♦', '♣']
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

// 点数计算：A=11, J/Q/K=10, 其他=数字
export function cardValue(rank) {
  if (rank === 'A') return 11
  if (['J', 'Q', 'K'].includes(rank)) return 10
  return parseInt(rank)
}

export function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit}` })
    }
  }
  return deck
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ===== 牌型识别（按基础筹码降序） =====
export const HAND_TYPES = [
  { key: 'straight_flush', name: '同花顺', chips: 100, mult: 8 },
  { key: 'four_of_a_kind', name: '四条',   chips: 60,  mult: 7 },
  { key: 'full_house',     name: '葫芦',   chips: 40,  mult: 4 },
  { key: 'flush',          name: '同花',   chips: 35,  mult: 4 },
  { key: 'straight',       name: '顺子',   chips: 30,  mult: 4 },
  { key: 'three_of_a_kind',name: '三条',   chips: 30,  mult: 3 },
  { key: 'two_pair',       name: '两对',   chips: 20,  mult: 2 },
  { key: 'pair',           name: '对子',   chips: 10,  mult: 2 },
  { key: 'high_card',      name: '高牌',   chips: 5,   mult: 1 },
]

function rankIndex(rank) {
  return RANKS.indexOf(rank) // 0=A,1=2,...,12=K
}

function isFlush(cards) {
  return cards.length === 5 && cards.every(c => c.suit === cards[0].suit)
}

function isStraight(cards) {
  if (cards.length !== 5) return false
  const idxs = cards.map(c => rankIndex(c.rank)).sort((a, b) => a - b)
  // normal straight
  const normal = idxs.every((v, i) => i === 0 || v === idxs[i-1] + 1)
  if (normal) return true
  // A-2-3-4-5: idxs=[0,1,2,3,4] => A(0),2(1),3(2),4(3),5(4) ✓ already handled
  // 10-J-Q-K-A: [0,9,10,11,12] => A at idx 0, 10=idx9, J=10, Q=11, K=12
  if (JSON.stringify(idxs) === JSON.stringify([0, 9, 10, 11, 12])) return true
  return false
}

function rankCounts(cards) {
  const counts = {}
  for (const c of cards) counts[c.rank] = (counts[c.rank] || 0) + 1
  return Object.values(counts).sort((a, b) => b - a)
}

export function identifyHand(cards) {
  const n = cards.length
  if (n === 0) return HAND_TYPES[8] // high card fallback

  const counts = rankCounts(cards)
  const flush = isFlush(cards)
  const straight = isStraight(cards)

  if (n === 5 && flush && straight) return HAND_TYPES[0] // 同花顺
  if (counts[0] === 4)              return HAND_TYPES[1] // 四条
  if (counts[0] === 3 && counts[1] === 2) return HAND_TYPES[2] // 葫芦
  if (n === 5 && flush)             return HAND_TYPES[3] // 同花
  if (n === 5 && straight)          return HAND_TYPES[4] // 顺子
  if (counts[0] === 3)              return HAND_TYPES[5] // 三条
  if (counts[0] === 2 && counts[1] === 2) return HAND_TYPES[6] // 两对
  if (counts[0] === 2)              return HAND_TYPES[7] // 对子
  return HAND_TYPES[8] // 高牌
}

// ===== 盲注配置 =====
export const BLINDS = [
  { index: 0, name: '小盲注', icon: '🔵', target: 300, reward: 5 },
  { index: 1, name: '中盲注', icon: '🟡', target: 500, reward: 5 },
  { index: 2, name: '大盲注', icon: '🔴', target: 800, reward: 5 },
]

// 通关奖励
export function calcReward(blind, handsLeft) {
  return 5 + handsLeft
}

// ===== Joker 候选库（共 6 张，字段+数值锁定） =====
export const JOKER_LIBRARY = [
  {
    id: 'jester',
    name: '小丑',
    rarity: 'common',   // 普通
    rarityColor: '#6cb4d3',
    price: 3,
    art: '🃏',
    desc: '每手 +4 倍率（无条件加成）',
    effect(ctx) { ctx.mult += 4 },
  },
  {
    id: 'scholar',
    name: '学者',
    rarity: 'common',
    rarityColor: '#6cb4d3',
    price: 3,
    art: '📖',
    desc: '打出的牌每张 A：+4 倍率',
    effect(ctx) {
      const aces = ctx.playedCards.filter(c => c.rank === 'A').length
      ctx.mult += aces * 4
    },
  },
  {
    id: 'heart_collector',
    name: '红心收藏家',
    rarity: 'rare',     // 稀有
    rarityColor: '#e34b6f',
    price: 5,
    art: '❤️',
    desc: '打出的牌里含 ♥ 时，倍率 ×4',
    effect(ctx) {
      if (ctx.playedCards.some(c => c.suit === '♥')) ctx.mult *= 4
    },
  },
  {
    id: 'club_lover',
    name: '梅花爱好者',
    rarity: 'rare',
    rarityColor: '#e34b6f',
    price: 5,
    art: '♣',
    desc: '打出的牌里含 ♣ 时，倍率 ×4',
    effect(ctx) {
      if (ctx.playedCards.some(c => c.suit === '♣')) ctx.mult *= 4
    },
  },
  {
    id: 'royal_card',
    name: '皇家头牌',
    rarity: 'rare',
    rarityColor: '#e34b6f',
    price: 5,
    art: '👑',
    desc: '打出的牌里含 J / Q / K 时，倍率 ×10',
    effect(ctx) {
      if (ctx.playedCards.some(c => ['J','Q','K'].includes(c.rank))) ctx.mult *= 10
    },
  },
  {
    id: 'sf_master',
    name: '同花顺大师',
    rarity: 'legendary', // 传说
    rarityColor: '#b577ff',
    price: 8,
    art: '🔥',
    desc: '打出同花顺时 +50 倍率',
    effect(ctx) {
      if (ctx.handType.key === 'straight_flush') ctx.mult += 50
    },
  },
]

// 检查 joker 是否被触发（用于决定是否显示金光）
export function isJokerTriggered(joker, ctx) {
  if (joker.id === 'jester') return true
  if (joker.id === 'scholar') return ctx.playedCards.some(c => c.rank === 'A')
  if (joker.id === 'heart_collector') return ctx.playedCards.some(c => c.suit === '♥')
  if (joker.id === 'club_lover') return ctx.playedCards.some(c => c.suit === '♣')
  if (joker.id === 'royal_card') return ctx.playedCards.some(c => ['J','Q','K'].includes(c.rank))
  if (joker.id === 'sf_master') return ctx.handType.key === 'straight_flush'
  return false
}

// 获取 joker 触发后的加成描述（用于飞字）
export function jokerEffectDesc(joker, ctx) {
  if (joker.id === 'jester') return '+4 Mult'
  if (joker.id === 'scholar') {
    const n = ctx.playedCards.filter(c => c.rank === 'A').length
    return `+${n*4} Mult`
  }
  if (joker.id === 'heart_collector') return '×4 Mult'
  if (joker.id === 'club_lover') return '×4 Mult'
  if (joker.id === 'royal_card') return '×10 Mult'
  if (joker.id === 'sf_master') return '+50 Mult'
  return ''
}

// ===== 计分引擎 =====
export function calculateScore(playedCards, ownedJokers) {
  const handType = identifyHand(playedCards)
  let chips = handType.chips + playedCards.reduce((s, c) => s + cardValue(c.rank), 0)
  let mult = handType.mult
  const ctx = { chips, mult, playedCards, handType }
  const triggered = []
  for (const joker of ownedJokers) {
    const before = { chips: ctx.chips, mult: ctx.mult }
    joker.effect(ctx)
    chips = ctx.chips
    mult = ctx.mult
    if (isJokerTriggered(joker, { playedCards, handType })) {
      triggered.push({ joker, desc: jokerEffectDesc(joker, ctx) })
    }
  }
  return { handType, chips: ctx.chips, mult: ctx.mult, score: ctx.chips * ctx.mult, triggered }
}

// ===== AI 启发式枚举 =====
function combinations(arr, k) {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c])
  const withoutFirst = combinations(rest, k)
  return [...withFirst, ...withoutFirst]
}

export function aiBestPlay(handCards, ownedJokers) {
  if (handCards.length <= 5) return handCards

  let best = null
  let bestScore = -1

  for (let k = 5; k >= 1; k--) {
    const combos = combinations(handCards, k)
    for (const combo of combos) {
      const { score } = calculateScore(combo, ownedJokers)
      if (score > bestScore) {
        bestScore = score
        best = combo
      }
    }
  }
  return best || handCards.slice(0, 5)
}

// AI 商店建议：性价比最高的 Joker（每 $1 期望增益最高）
export function aiBestShopJoker(shopJokers, playedSample) {
  // 粗略估算：用同花顺作为 sample 比较各 joker 增益
  const sampleCards = playedSample || [
    { suit: '♠', rank: 'A' }, { suit: '♠', rank: 'K' },
    { suit: '♠', rank: 'Q' }, { suit: '♠', rank: 'J' },
    { suit: '♠', rank: '10' },
  ]
  let best = null
  let bestRatio = -1
  for (const joker of shopJokers) {
    const base = calculateScore(sampleCards, [])
    const withJoker = calculateScore(sampleCards, [joker])
    const gain = withJoker.score - base.score
    const ratio = gain / joker.price
    if (ratio > bestRatio) { bestRatio = ratio; best = joker }
  }
  return best
}
