<template>
  <!-- ===== 设置按钮（右上角浮层） ===== -->
  <button class="px-btn btn-settings settings-float" @click="showSettings = true" title="设置">⚙️</button>

  <!-- ===== 设置 Modal ===== -->
  <Teleport to="body">
    <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
      <div class="settings-modal">
        <div class="settings-title">设置</div>
        <div class="settings-items">
          <div class="settings-row">
            <span class="settings-label">BGM 音量</span>
            <input type="range" min="0" max="100" v-model="settings.bgmVolume" class="settings-slider" style="accent-color:#4dd6ff" />
          </div>
          <div class="settings-row">
            <span class="settings-label">SFX 音量</span>
            <input type="range" min="0" max="100" v-model="settings.sfxVolume" class="settings-slider" style="accent-color:#ff8844" />
          </div>
          <div class="settings-row">
            <span class="settings-label">动画速度</span>
            <div class="speed-btns">
              <button :class="['speed-btn', settings.speed === 'slow' && 'active']" @click="settings.speed = 'slow'">慢</button>
              <button :class="['speed-btn', settings.speed === 'normal' && 'active']" @click="settings.speed = 'normal'">普通</button>
              <button :class="['speed-btn', settings.speed === 'fast' && 'active']" @click="settings.speed = 'fast'">快</button>
            </div>
          </div>
          <div class="settings-row">
            <span class="settings-label">显示出牌公式预览</span>
            <div :class="['toggle', settings.showFormula && 'on']" @click="settings.showFormula = !settings.showFormula">
              <div class="toggle-thumb"></div>
            </div>
          </div>
        </div>
        <div class="settings-footer">
          <button class="px-btn btn-skip settings-close-btn" @click="showSettings = false">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ===== 游戏主体 ===== -->
  <div class="game-root">
    <!-- ===== 左 Sidebar ===== -->
    <aside class="sidebar">
      <!-- Logo -->
      <div class="sb-logo">🃏 <span>小丑牌</span></div>

      <!-- 盲注面板 -->
      <div class="sb-panel blind-panel">
        <div class="sb-label">盲注 {{ currentBlindIndex + 1 }}/3</div>
        <div class="blind-info">
          <span class="blind-icon">{{ currentBlind.icon }}</span>
          <div class="blind-name">{{ currentBlind.name }}</div>
        </div>
        <div class="inset-box">
          <div class="inset-sub">目标分</div>
          <div class="inset-big" style="font-family:var(--display);font-size:28px;color:var(--gold)">{{ currentBlind.target }}</div>
          <div class="inset-reward">通关奖励 +${{ calcReward(currentBlind, handsLeft) }}</div>
        </div>
      </div>

      <!-- Round Score -->
      <div class="sb-panel score-panel">
        <div class="sb-label">当前分</div>
        <div class="inset-box">
          <div class="round-score-num">{{ displayBlindScore }}</div>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" :style="{ width: Math.min(100, (blindScore / currentBlind.target) * 100) + '%' }"></div>
        </div>
      </div>

      <!-- HAND 计分块 -->
      <div class="sb-panel hand-panel">
        <div :class="['hand-type-name', !currentHandType && 'empty']">
          {{ currentHandType ? currentHandType.name : '— 选牌出牌 —' }}
        </div>
        <div class="score-row">
          <div :class="['chips-block', chipsPopAnim && 'score-pop-anim']" @animationend="chipsPopAnim = false">
            <span class="score-val-big">{{ displayChips }}</span>
            <span class="score-unit">筹码</span>
          </div>
          <span class="score-x">×</span>
          <div :class="['mult-block', multPopAnim && 'score-pop-anim']" @animationend="multPopAnim = false">
            <span class="score-val-big">{{ displayMult }}</span>
            <span class="score-unit">倍率</span>
          </div>
        </div>
      </div>

      <!-- Hands / Discards -->
      <div class="sb-panel hands-panel">
        <div class="hand-discard-row">
          <div class="hd-block">
            <div class="hd-label">手数</div>
            <div class="hd-val green">{{ handsLeft }}</div>
          </div>
          <div class="hd-block">
            <div class="hd-label">弃牌</div>
            <div class="hd-val red">{{ discardsLeft }}</div>
          </div>
        </div>
      </div>

      <!-- 金币 -->
      <div class="sb-panel money-panel">
        <div class="sb-label" style="text-align:center">金币</div>
        <div class="money-display">
          <span class="money-sign">$</span>
          <span class="money-val">{{ money }}</span>
        </div>
      </div>

      <!-- Ante / Round -->
      <div class="sb-ante">
        <span class="ante-gold">Ante 1/3</span>
        <span class="ante-sep">·</span>
        <span class="ante-blue">Round {{ currentBlindIndex + 1 }}</span>
      </div>

      <!-- 重新开始按钮 -->
      <button class="px-btn btn-restart restart-btn" @click="restartGame">重新开始</button>
    </aside>

    <!-- ===== 右主区 ===== -->
    <main class="main-area">

      <!-- 第 1 段：Joker 区 -->
      <section class="seg seg-joker">
        <div class="joker-header">
          <span class="joker-title">JOKERS · {{ ownedJokers.length }}/5</span>
        </div>
        <div class="joker-row">
          <div
            v-for="(joker, i) in jokerSlots"
            :key="i"
            :class="['joker-card', joker && 'joker-filled', joker && jokerGlowing[i] && 'joker-glowing']"
            :style="joker ? { '--rarity-color': joker.rarityColor } : {}"
          >
            <template v-if="joker">
              <span class="joker-art">{{ joker.art }}</span>
              <span class="joker-name">{{ joker.name }}</span>
              <span class="joker-desc">{{ joker.desc }}</span>
            </template>
            <template v-else>
              <span class="empty-slot-plus">+</span>
              <span class="empty-slot-label">空槽</span>
            </template>
          </div>
        </div>
      </section>

      <!-- 第 2 段：出牌区（PlayArea）-->
      <section class="seg seg-play" ref="playAreaRef">
        <div class="play-header">
          <span class="play-label">出牌区</span>
          <span v-if="currentHandType" class="play-type">{{ currentHandType.name }}</span>
        </div>

        <!-- 出牌牌组 -->
        <div class="played-cards-row">
          <template v-if="playedCards.length > 0">
            <div
              v-for="(card, i) in playedCards"
              :key="card.id"
              :class="['played-card', card.highlighted && 'highlighted', isRed(card) && 'red-suit']"
            >
              <span class="card-rank-top">{{ card.rank }}</span>
              <span class="card-suit-center">{{ card.suit }}</span>
              <span class="card-rank-bottom">{{ card.rank }}</span>
            </div>
          </template>
          <template v-else>
            <div v-if="settings.showFormula && currentHandType" class="play-formula-preview">
              <span style="color:var(--chips-from)">{{ currentHandType.chips }}</span>
              <span style="color:var(--text-dim)"> × </span>
              <span style="color:var(--mult-from)">{{ currentHandType.mult }}</span>
              <span style="color:var(--text-dim)"> = </span>
              <span style="color:var(--gold)">{{ currentHandType.chips * currentHandType.mult }}</span>
            </div>
            <div v-else class="play-empty-hint">选择手牌组成牌型（1-5 张）</div>
          </template>
        </div>

        <!-- 计分公式爆字 -->
        <Transition name="formula-pop">
          <div v-if="showFormula" class="formula-overlay">
            <span class="ff-chips">{{ formulaChips }}</span>
            <span class="ff-x"> × </span>
            <span class="ff-mult">{{ formulaMult }}</span>
            <span class="ff-eq"> = </span>
            <span class="ff-score">{{ formulaScore }}</span>
          </div>
        </Transition>

        <!-- 牌堆（absolute 内嵌出牌区右下角） -->
        <div class="deck-pile" ref="deckRef">
          <div class="deck-card deck-back-3"></div>
          <div class="deck-card deck-back-2"></div>
          <div class="deck-card deck-back-1"></div>
          <div class="deck-count">{{ deck.length }}/52</div>
        </div>
      </section>

      <!-- 第 3 段：手牌 + 操作 -->
      <section class="seg seg-hand">
        <div class="hand-header">
          <span class="hand-title">手牌</span>
          <span class="hand-count">已选 {{ selectedCards.length }} / 5 张</span>
        </div>
        <div class="hand-cards-row">
          <div
            v-for="card in handCards"
            :key="card.id"
            :class="['hand-card', selectedCards.includes(card.id) && 'selected', isRed(card) && 'red-suit']"
            :style="flyingCardIds.has(card.id) ? { visibility: 'hidden' } : {}"
            @click="toggleSelect(card)"
          >
            <span class="card-rank-top">{{ card.rank }}</span>
            <span class="card-suit-center">{{ card.suit }}</span>
            <span class="card-rank-bottom">{{ card.rank }}</span>
          </div>
        </div>
        <div class="action-row">
          <button
            class="px-btn btn-play"
            :disabled="selectedCards.length === 0 || isAnimating"
            @click="handlePlay"
          >出牌 ({{ selectedCards.length }})</button>
          <button
            class="px-btn btn-discard"
            :disabled="selectedCards.length === 0 || discardsLeft === 0 || isAnimating"
            @click="handleDiscard"
          >弃牌 ({{ discardsLeft }})</button>
          <button class="px-btn btn-sort" @click="sortByRank">按点排序</button>
          <button class="px-btn btn-sort" @click="sortBySuit">按花排序</button>
          <button
            :class="['px-btn', 'btn-ai', aiThinking && 'thinking']"
            :disabled="aiThinking || isAnimating"
            @click="handleAiPlay"
          >{{ aiThinking ? '🤔 AI 思考中…' : '🤖 AI 出牌' }}</button>
        </div>
      </section>

      <!-- ===== 商店覆盖层 ===== -->
      <Transition name="shop-fade">
        <div v-if="gameState === 'shop'" class="shop-overlay">
          <div class="shop-card">
            <h2 class="shop-title">商店</h2>
            <p class="shop-subtitle">通关奖励到账！金币 ${{ money }} · Joker 槽 {{ ownedJokers.length }}/5</p>
            <div class="shop-jokers-row">
              <div v-for="joker in shopJokers" :key="joker.id" class="shop-joker-wrap" :class="joker.id === aiSuggestedJokerId && 'shop-ai-highlight'">
                <div class="shop-joker-card" :style="{ '--rarity-color': joker.rarityColor }">
                  <span class="joker-art">{{ joker.art }}</span>
                  <span class="joker-name">{{ joker.name }}</span>
                  <span class="joker-desc">{{ joker.desc }}</span>
                </div>
                <button
                  class="px-btn shop-buy-btn"
                  :class="shopBtnClass(joker)"
                  :disabled="isJokerBought(joker) || money < joker.price || ownedJokers.length >= 5"
                  @click="buyJoker(joker)"
                >{{ shopBtnText(joker) }}</button>
              </div>
            </div>
            <div class="shop-footer">
              <button class="px-btn btn-ai" @click="handleAiShopSuggest">🤖 AI 建议</button>
              <button class="px-btn btn-skip" @click="skipShop">跳过 →</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ===== 结束覆盖层 ===== -->
      <Transition name="shop-fade">
        <div v-if="gameState === 'won' || gameState === 'lost'" class="end-overlay">
          <div class="end-card">
            <div :class="['end-title', gameState === 'won' ? 'won' : 'lost']">
              {{ gameState === 'won' ? '🎉 通关全部' : '💀 失败' }}
            </div>
            <div class="end-money">最终金币：${{ money }}</div>
            <div v-if="ownedJokers.length > 0" class="end-jokers">
              <div class="end-jokers-label">持有的 Joker</div>
              <div class="end-jokers-row">
                <div v-for="joker in ownedJokers" :key="joker.id" class="end-joker-item" :style="{ '--rarity-color': joker.rarityColor }">
                  <span class="joker-art-sm">{{ joker.art }}</span>
                  <span>{{ joker.name }}</span>
                </div>
              </div>
            </div>
            <button class="px-btn btn-restart" @click="restartGame">重新开始</button>
          </div>
        </div>
      </Transition>

    </main>
  </div>

  <!-- ===== 飞字容器 ===== -->
  <div class="fly-texts-layer">
    <div
      v-for="ft in flyTexts"
      :key="ft.id"
      class="fly-text"
      :style="ft.style"
    >{{ ft.text }}</div>
  </div>

  <!-- ===== 飞牌克隆层 ===== -->
  <div class="fly-cards-layer">
    <div
      v-for="fc in flyCards"
      :key="fc.id"
      :class="['fly-card-clone', fc.isRed && 'red-suit']"
      :style="fc.style"
    >
      <span class="card-rank-top">{{ fc.rank }}</span>
      <span class="card-suit-center">{{ fc.suit }}</span>
      <span class="card-rank-bottom">{{ fc.rank }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import {
  createDeck, shuffle, identifyHand, calculateScore,
  BLINDS, HAND_TYPES, JOKER_LIBRARY, calcReward,
  aiBestPlay, aiBestShopJoker, isJokerTriggered, jokerEffectDesc, cardValue
} from './game.js'

// ===== 设置 =====
function loadSettings() {
  try {
    const s = localStorage.getItem('balatro.settings')
    if (s) return JSON.parse(s)
  } catch {}
  return { bgmVolume: 50, sfxVolume: 70, speed: 'normal', showFormula: true }
}

const settings = ref(loadSettings())
const showSettings = ref(false)

watch(settings, (v) => {
  localStorage.setItem('balatro.settings', JSON.stringify(v))
}, { deep: true })

function speedMultiplier() {
  if (settings.value.speed === 'slow') return 1.5
  if (settings.value.speed === 'fast') return 0.6
  return 1.0
}

function T(ms) { return Math.round(ms * speedMultiplier()) }

// ===== 游戏状态 =====
const gameState = ref('playing') // playing / shop / won / lost
const currentBlindIndex = ref(0)
const blindScore = ref(0)
const displayBlindScore = ref(0)
const handsLeft = ref(4)
const discardsLeft = ref(3)
const money = ref(0)
const ownedJokers = ref([])
const deck = ref([])
const handCards = ref([])
const selectedCards = ref([])
const playedCards = ref([])
const isAnimating = ref(false)
const aiThinking = ref(false)

const currentHandType = ref(null)
const displayChips = ref(0)
const displayMult = ref(0)
const chipsPopAnim = ref(false)
const multPopAnim = ref(false)

const showFormula = ref(false)
const formulaChips = ref(0)
const formulaMult = ref(0)
const formulaScore = ref(0)

const flyTexts = ref([])
const flyCards = ref([])
let flyId = 0
// 正在执行飞行动画的手牌 id 集合，用于让原牌 visibility:hidden 保留占位
const flyingCardIds = ref(new Set())

const playAreaRef = ref(null)
const deckRef = ref(null)

// Joker slots (5 slots, fill with owned jokers, rest null)
const jokerSlots = computed(() => {
  const slots = []
  for (let i = 0; i < 5; i++) {
    slots.push(ownedJokers.value[i] || null)
  }
  return slots
})

const jokerGlowing = ref([false, false, false, false, false])

const currentBlind = computed(() => BLINDS[currentBlindIndex.value])

// ===== 商店状态 =====
const shopJokers = ref([])
const boughtJokerIds = ref([])
const aiSuggestedJokerId = ref(null)

// ===== 初始化游戏 =====
function initGame() {
  currentBlindIndex.value = 0
  blindScore.value = 0
  displayBlindScore.value = 0
  handsLeft.value = 4
  discardsLeft.value = 3
  money.value = 0
  ownedJokers.value = []
  selectedCards.value = []
  playedCards.value = []
  currentHandType.value = null
  displayChips.value = 0
  displayMult.value = 0
  isAnimating.value = false
  deck.value = shuffle(createDeck())
  handCards.value = []
  gameState.value = 'playing'
  nextTick(() => dealInitialHand())
}

function dealInitialHand() {
  dealCards(8)
}

// ===== 发牌动画（从牌堆飞入手牌区） =====
function dealCards(count) {
  const drawn = deck.value.splice(0, count)
  // 直接加入手牌并做飞牌动画
  const startIdx = handCards.value.length
  for (let i = 0; i < drawn.length; i++) {
    const card = drawn[i]
    card._animDelay = i * T(60)
    handCards.value.push(card)
  }
  // 触发飞牌视觉（从牌堆位置飞入）
  nextTick(() => animDealCards(drawn, startIdx))
}

function getDeckRect() {
  if (deckRef.value) {
    return deckRef.value.getBoundingClientRect()
  }
  return { left: window.innerWidth - 120, top: window.innerHeight - 200, width: 90, height: 130 }
}

function animDealCards(cards, startIdx) {
  const deckRect = getDeckRect()
  const deckCx = deckRect.left + deckRect.width / 2
  const deckCy = deckRect.top + deckRect.height / 2

  cards.forEach((card, i) => {
    const delay = i * T(60)
    setTimeout(() => {
      // 找手牌元素目标位置
      const handRow = document.querySelector('.hand-cards-row')
      if (!handRow) return
      const cardEls = handRow.querySelectorAll('.hand-card')
      const targetEl = cardEls[startIdx + i]
      if (!targetEl) return
      const targetRect = targetEl.getBoundingClientRect()
      const tCx = targetRect.left + targetRect.width / 2
      const tCy = targetRect.top + targetRect.height / 2

      const fcId = ++flyId
      const fcObj = {
        id: fcId,
        rank: card.rank,
        suit: card.suit,
        isRed: card.suit === '♥' || card.suit === '♦',
        style: {
          position: 'fixed',
          left: (deckCx - 50) + 'px',
          top: (deckCy - 72.5) + 'px',
          width: '100px',
          height: '145px',
          transition: `all ${T(400)}ms cubic-bezier(.25,.46,.45,.94)`,
          opacity: '1',
          zIndex: '9990',
          pointerEvents: 'none',
        }
      }
      flyCards.value.push(fcObj)

      // 下一帧开始飞
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const idx = flyCards.value.findIndex(f => f.id === fcId)
        if (idx >= 0) {
          flyCards.value[idx] = {
            ...flyCards.value[idx],
            style: {
              ...flyCards.value[idx].style,
              left: (tCx - 50) + 'px',
              top: (tCy - 72.5) + 'px',
            }
          }
        }
        // 飞行结束后移除
        setTimeout(() => {
          const i2 = flyCards.value.findIndex(f => f.id === fcId)
          if (i2 >= 0) flyCards.value.splice(i2, 1)
        }, T(420))
      }))
    }, delay)
  })
}

// ===== 选牌 =====
function toggleSelect(card) {
  if (isAnimating.value) return
  const idx = selectedCards.value.indexOf(card.id)
  if (idx >= 0) {
    selectedCards.value.splice(idx, 1)
  } else {
    if (selectedCards.value.length < 5) {
      selectedCards.value.push(card.id)
    }
  }
  // 更新预览牌型
  updatePreviewHand()
}

function updatePreviewHand() {
  const cards = handCards.value.filter(c => selectedCards.value.includes(c.id))
  if (cards.length === 0) {
    currentHandType.value = null
    displayChips.value = 0
    displayMult.value = 0
  } else {
    currentHandType.value = identifyHand(cards)
  }
}

// ===== 出牌 =====
async function handlePlay() {
  if (selectedCards.value.length === 0 || isAnimating.value) return
  isAnimating.value = true

  const selected = handCards.value.filter(c => selectedCards.value.includes(c.id))

  // Step 1: 飞牌到出牌区 (350ms)
  await animFlyToPlayArea(selected)

  // 从手牌移除，加入出牌区
  handCards.value = handCards.value.filter(c => !selectedCards.value.includes(c.id))
  selectedCards.value = []
  playedCards.value = selected.map(c => ({ ...c, highlighted: false }))

  // Step 2: 设置牌型和基础值 (200ms)
  await wait(T(200))
  const handType = identifyHand(selected)
  currentHandType.value = handType
  displayChips.value = handType.chips
  displayMult.value = handType.mult
  chipsPopAnim.value = true

  // Step 3: 逐张高亮 + chips 飞字 (每张 150ms)
  let runningChips = handType.chips
  for (let i = 0; i < playedCards.value.length; i++) {
    await wait(T(150))
    playedCards.value[i] = { ...playedCards.value[i], highlighted: true }
    const val = cardValue(playedCards.value[i].rank)
    runningChips += val
    displayChips.value = runningChips
    chipsPopAnim.value = true
    // 飞字 +val 从牌位置飞向 chips 块
    spawnFlyTextFromCard(i, `+${val}`, '#4dd6ff', 'chips')
    await wait(T(50))
  }

  await wait(T(100))

  // Step 4: Joker 触发 (每个 300ms)
  let runningMult = handType.mult
  const ctx = { chips: runningChips, mult: runningMult, playedCards: selected, handType }

  for (let i = 0; i < ownedJokers.value.length; i++) {
    const joker = ownedJokers.value[i]
    if (!isJokerTriggered(joker, { playedCards: selected, handType })) continue

    await wait(T(300))
    // Joker 金光
    jokerGlowing.value[i] = true
    setTimeout(() => { jokerGlowing.value[i] = false }, T(800))

    // 执行 joker effect
    const beforeMult = ctx.mult
    const beforeChips = ctx.chips
    joker.effect(ctx)
    runningChips = ctx.chips
    runningMult = ctx.mult

    // 飞字（红色 mult）
    const desc = jokerEffectDesc(joker, { playedCards: selected, handType })
    spawnFlyTextFromJoker(i, desc, '#ff8844', 'mult')

    displayMult.value = runningMult
    multPopAnim.value = true
    if (ctx.chips !== beforeChips) {
      displayChips.value = runningChips
      chipsPopAnim.value = true
    }
    await wait(T(200))
  }

  await wait(T(200))

  // Step 5: 公式爆字 (800ms)
  const finalChips = runningChips
  const finalMult = runningMult
  const finalScore = finalChips * finalMult
  formulaChips.value = finalChips
  formulaMult.value = finalMult
  formulaScore.value = finalScore
  showFormula.value = true

  // Step 6: blindScore RAF 累加 (与 step 5 重叠)
  const prevScore = blindScore.value
  const targetScore = blindScore.value + finalScore
  animateScore(prevScore, targetScore, T(600))

  await wait(T(800))
  showFormula.value = false
  await wait(T(200))

  blindScore.value = targetScore
  displayBlindScore.value = targetScore
  handsLeft.value -= 1

  // 重置计分块显示
  displayChips.value = 0
  displayMult.value = 0
  currentHandType.value = null

  // Step 7: 淡出出牌区牌，补牌
  await wait(T(200))
  playedCards.value = []

  // 判断通关/失败
  if (blindScore.value >= currentBlind.value.target) {
    await wait(T(200))
    enterShopOrWin()
    isAnimating.value = false
    return
  }

  if (handsLeft.value <= 0) {
    await wait(T(200))
    gameState.value = 'lost'
    isAnimating.value = false
    return
  }

  // 补牌
  const needed = 8 - handCards.value.length
  if (needed > 0 && deck.value.length > 0) {
    const toDeal = Math.min(needed, deck.value.length)
    const startIdx = handCards.value.length
    const drawn = deck.value.splice(0, toDeal)
    handCards.value.push(...drawn)
    await nextTick()
    animDealCards(drawn, startIdx)
  }

  isAnimating.value = false
}

// ===== 弃牌飞出动画 =====
async function animFlyDiscard(cards) {
  return new Promise(resolve => {
    const handRow = document.querySelector('.hand-cards-row')
    const clones = []

    cards.forEach((card) => {
      let srcRect = { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 100, height: 145 }
      if (handRow) {
        const allCards = handRow.querySelectorAll('.hand-card')
        const el = Array.from(allCards).find(el => {
          const topEl = el.querySelector('.card-rank-top')
          const suitEl = el.querySelector('.card-suit-center')
          return topEl && suitEl && topEl.textContent === card.rank && suitEl.textContent === card.suit
        })
        if (el) srcRect = el.getBoundingClientRect()
      }

      // 标记原牌隐藏（保留占位）
      flyingCardIds.value.add(card.id)

      const fcId = ++flyId
      const fc = {
        id: fcId,
        rank: card.rank,
        suit: card.suit,
        isRed: card.suit === '♥' || card.suit === '♦',
        style: {
          position: 'fixed',
          left: srcRect.left + 'px',
          top: srcRect.top + 'px',
          width: srcRect.width + 'px',
          height: srcRect.height + 'px',
          transition: `all ${T(300)}ms cubic-bezier(.55,.06,.68,.19)`,
          opacity: '1',
          zIndex: '9991',
          pointerEvents: 'none',
        }
      }
      flyCards.value.push(fc)
      clones.push({ id: fcId, cardId: card.id, srcRect })
    })

    requestAnimationFrame(() => requestAnimationFrame(() => {
      clones.forEach(({ id, srcRect }) => {
        const idx = flyCards.value.findIndex(f => f.id === id)
        if (idx >= 0) {
          flyCards.value[idx] = {
            ...flyCards.value[idx],
            style: {
              ...flyCards.value[idx].style,
              left: (srcRect.left - 80) + 'px',
              top: (srcRect.top - 120) + 'px',
              opacity: '0',
            }
          }
        }
      })

      setTimeout(() => {
        clones.forEach(({ id, cardId }) => {
          const i2 = flyCards.value.findIndex(f => f.id === id)
          if (i2 >= 0) flyCards.value.splice(i2, 1)
          flyingCardIds.value.delete(cardId)
        })
        resolve()
      }, T(320))
    }))
  })
}

// ===== 弃牌 =====
async function handleDiscard() {
  if (selectedCards.value.length === 0 || discardsLeft.value === 0 || isAnimating.value) return
  isAnimating.value = true

  const discardedCards = handCards.value.filter(c => selectedCards.value.includes(c.id))
  const discardedIds = discardedCards.map(c => c.id)

  // 先执行飞出动画（原牌在飞行期间 visibility:hidden 占位）
  await animFlyDiscard(discardedCards)

  // 动画结束后再从数组移除
  handCards.value = handCards.value.filter(c => !discardedIds.includes(c.id))
  selectedCards.value = []
  currentHandType.value = null
  displayChips.value = 0
  displayMult.value = 0
  discardsLeft.value -= 1

  const needed = 8 - handCards.value.length
  const toDeal = Math.min(needed, deck.value.length)
  if (toDeal > 0) {
    const startIdx = handCards.value.length
    const drawn = deck.value.splice(0, toDeal)
    handCards.value.push(...drawn)
    await nextTick()
    animDealCards(drawn, startIdx)
    await wait(toDeal * T(60) + T(450))
  }

  isAnimating.value = false
}

// ===== AI 出牌 =====
async function handleAiPlay() {
  if (aiThinking.value || isAnimating.value) return
  aiThinking.value = true
  await wait(T(800))
  const best = aiBestPlay(handCards.value, ownedJokers.value)
  selectedCards.value = best.map(c => c.id)
  updatePreviewHand()
  await wait(T(200))
  aiThinking.value = false
  await handlePlay()
}

// ===== AI 商店建议 =====
function handleAiShopSuggest() {
  const available = shopJokers.value.filter(j => !isJokerBought(j) && money.value >= j.price && ownedJokers.value.length < 5)
  if (available.length === 0) { aiSuggestedJokerId.value = null; return }
  const best = aiBestShopJoker(available, null)
  aiSuggestedJokerId.value = best ? best.id : null
}

// ===== 进入商店或通关 =====
function enterShopOrWin() {
  // PRD §10.2: 大盲注通关 → won，不进商店
  if (currentBlindIndex.value >= BLINDS.length - 1) {
    gameState.value = 'won'
    return
  }
  // 通关奖励
  money.value += calcReward(currentBlind.value, handsLeft.value)
  // 随机抽 3 张不重复商店 joker
  const shuffled = shuffle(JOKER_LIBRARY)
  shopJokers.value = shuffled.slice(0, 3)
  boughtJokerIds.value = []
  aiSuggestedJokerId.value = null
  gameState.value = 'shop'
}

function skipShop() {
  currentBlindIndex.value += 1
  gameState.value = 'playing'
  blindScore.value = 0
  displayBlindScore.value = 0
  handsLeft.value = 4
  discardsLeft.value = 3
  selectedCards.value = []
  playedCards.value = []
  currentHandType.value = null
  displayChips.value = 0
  displayMult.value = 0
  deck.value = shuffle(createDeck())
  handCards.value = []
  nextTick(() => dealInitialHand())
}

function shopBtnText(joker) {
  if (isJokerBought(joker)) return '已售出'
  if (ownedJokers.value.length >= 5) return '槽满了'
  if (money.value < joker.price) return '钱不够'
  return `购买 $${joker.price}`
}

function shopBtnClass(joker) {
  if (isJokerBought(joker)) return 'btn-sold'
  if (ownedJokers.value.length >= 5 || money.value < joker.price) return 'btn-disabled-shop'
  return 'btn-buy-ok'
}

function isJokerBought(joker) {
  return boughtJokerIds.value.includes(joker.id)
}

function buyJoker(joker) {
  if (isJokerBought(joker) || money.value < joker.price || ownedJokers.value.length >= 5) return
  money.value -= joker.price
  ownedJokers.value.push(joker)
  boughtJokerIds.value.push(joker.id)
}

// ===== 排序 =====
const RANK_ORDER = { A:14, K:13, Q:12, J:11, '10':10, '9':9, '8':8, '7':7, '6':6, '5':5, '4':4, '3':3, '2':2 }
const SUIT_ORDER = { '♠':1, '♥':2, '♦':3, '♣':4 }

function sortByRank() {
  handCards.value = [...handCards.value].sort((a, b) => (RANK_ORDER[b.rank] || 0) - (RANK_ORDER[a.rank] || 0))
}

function sortBySuit() {
  handCards.value = [...handCards.value].sort((a, b) => {
    if (SUIT_ORDER[a.suit] !== SUIT_ORDER[b.suit]) return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]
    return (RANK_ORDER[b.rank] || 0) - (RANK_ORDER[a.rank] || 0)
  })
}

// ===== 重新开始 =====
function restartGame() {
  flyTexts.value = []
  flyCards.value = []
  flyingCardIds.value = new Set()
  aiThinking.value = false
  initGame()
}

// ===== 颜色判断 =====
function isRed(card) {
  return card.suit === '♥' || card.suit === '♦'
}

// ===== 飞字动画 =====
function spawnFlyText(x, y, text, color) {
  const id = ++flyId
  const obj = {
    id,
    text,
    style: {
      left: x + 'px',
      top: y + 'px',
      fontSize: '22px',
      color,
      transition: `all ${T(400)}ms ease-out`,
      opacity: '1',
    }
  }
  flyTexts.value.push(obj)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const idx = flyTexts.value.findIndex(f => f.id === id)
    if (idx >= 0) {
      flyTexts.value[idx] = {
        ...flyTexts.value[idx],
        style: {
          ...flyTexts.value[idx].style,
          top: (y - 60) + 'px',
          opacity: '0',
        }
      }
    }
    setTimeout(() => {
      const i2 = flyTexts.value.findIndex(f => f.id === id)
      if (i2 >= 0) flyTexts.value.splice(i2, 1)
    }, T(420))
  }))
}

function spawnFlyTextFromCard(cardIdx, text, color) {
  nextTick(() => {
    const row = document.querySelector('.played-cards-row')
    if (!row) return
    const cards = row.querySelectorAll('.played-card')
    const el = cards[cardIdx]
    if (!el) return
    const rect = el.getBoundingClientRect()
    spawnFlyText(rect.left + rect.width / 2 - 20, rect.top - 10, text, color)
  })
}

function spawnFlyTextFromJoker(jokerIdx, text, color) {
  nextTick(() => {
    const row = document.querySelector('.joker-row')
    if (!row) return
    const cards = row.querySelectorAll('.joker-card')
    const el = cards[jokerIdx]
    if (!el) return
    const rect = el.getBoundingClientRect()
    spawnFlyText(rect.left + rect.width / 2 - 30, rect.top - 10, text, color)
  })
}

// ===== 飞牌到出牌区 =====
async function animFlyToPlayArea(cards) {
  return new Promise(resolve => {
    const playArea = playAreaRef.value
    if (!playArea) { resolve(); return }
    const playRect = playArea.getBoundingClientRect()

    // 计算出牌区中央的目标位置
    const targetY = playRect.top + 60
    const totalW = cards.length * (100 + 8)
    const startX = playRect.left + (playRect.width - totalW) / 2

    const clones = []
    cards.forEach((card, i) => {
      // 找手牌中对应元素（通过 data 匹配 card.id 最准确，但当前模板没 data-id，用 rank+suit 兜底）
      const handRow = document.querySelector('.hand-cards-row')
      let srcRect = { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 100, height: 145 }
      if (handRow) {
        const allCards = handRow.querySelectorAll('.hand-card')
        const el = Array.from(allCards).find(el => {
          const topEl = el.querySelector('.card-rank-top')
          const suitEl = el.querySelector('.card-suit-center')
          return topEl && suitEl && topEl.textContent === card.rank && suitEl.textContent === card.suit
        })
        if (el) srcRect = el.getBoundingClientRect()
      }

      // 标记原牌隐藏（保留占位，避免其他牌位移）
      flyingCardIds.value.add(card.id)

      const fcId = ++flyId
      const targetX = startX + i * (100 + 8)
      const fc = {
        id: fcId,
        rank: card.rank,
        suit: card.suit,
        isRed: card.suit === '♥' || card.suit === '♦',
        style: {
          position: 'fixed',
          left: srcRect.left + 'px',
          top: srcRect.top + 'px',
          width: srcRect.width + 'px',
          height: srcRect.height + 'px',
          transition: `all ${T(350)}ms cubic-bezier(.25,.46,.45,.94)`,
          opacity: '1',
          zIndex: '9991',
          pointerEvents: 'none',
        }
      }
      flyCards.value.push(fc)
      clones.push({ id: fcId, targetX, targetY, cardId: card.id })
    })

    requestAnimationFrame(() => requestAnimationFrame(() => {
      clones.forEach(({ id, targetX, targetY }) => {
        const idx = flyCards.value.findIndex(f => f.id === id)
        if (idx >= 0) {
          flyCards.value[idx] = {
            ...flyCards.value[idx],
            style: {
              ...flyCards.value[idx].style,
              left: targetX + 'px',
              top: targetY + 'px',
              width: '100px',
              height: '145px',
            }
          }
        }
      })

      setTimeout(() => {
        clones.forEach(({ id, cardId }) => {
          const i2 = flyCards.value.findIndex(f => f.id === id)
          if (i2 >= 0) flyCards.value.splice(i2, 1)
          // 飞行结束，清除隐藏标记（此时 handlePlay 已将牌从 handCards 移除，清除只是保险）
          flyingCardIds.value.delete(cardId)
        })
        resolve()
      }, T(370))
    }))
  })
}

// ===== blindScore RAF 数字插值 =====
function animateScore(from, to, duration) {
  const start = performance.now()
  function step(now) {
    const elapsed = now - start
    const t = Math.min(elapsed / duration, 1)
    displayBlindScore.value = Math.round(from + (to - from) * t)
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// ===== 工具 =====
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ===== 挂载 =====
onMounted(() => {
  initGame()
})
</script>

<style scoped>
/* ===== 整页布局 ===== */
.game-root {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

/* ===== 左 Sidebar ===== */
.sidebar {
  width: min(28vw, 480px);
  min-width: 280px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #1a2a5a, #111e44);
  border-right: 2px solid rgba(74,107,255,.4);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}
.sidebar::-webkit-scrollbar { display: none; }

.sb-logo {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: var(--gold);
  text-shadow: 2px 2px 0 #000, -1px -1px 0 #000;
  padding: 8px 6px 4px;
  letter-spacing: 1px;
  flex-shrink: 0;
}
.sb-logo span {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 900;
}

.sb-panel {
  border-radius: 10px;
  border: 2px solid rgba(74,107,255,.5);
  background: linear-gradient(180deg, #1e3068, #152050);
  padding: 8px 10px;
  flex-shrink: 0;
}

.sb-label {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

/* 盲注面板 */
.blind-panel {}
.blind-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.blind-icon { font-size: 22px; }
.blind-name {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #fff;
}
.inset-box {
  background: #050818;
  border-radius: 8px;
  padding: 6px 8px;
  border: 1px solid rgba(74,107,255,.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.inset-sub {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 11px;
  color: var(--muted);
}
.inset-big {
  line-height: 1;
}
.inset-reward {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: var(--gold);
}

/* Round Score */
.round-score-num {
  font-family: 'VT323', monospace;
  font-size: 44px;
  color: #ff5566;
  line-height: 1;
}
.progress-bar-wrap {
  margin-top: 5px;
  height: 8px;
  border-radius: 4px;
  background: rgba(0,0,0,.4);
  border: 1px solid rgba(74,107,255,.3);
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--chips-from), var(--chips-to));
  border-radius: 4px;
  transition: width 0.4s ease;
}

/* HAND 计分块 */
.hand-panel {}
.hand-type-name {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: #4dd6ff;
  text-align: center;
  margin-bottom: 6px;
  letter-spacing: 1px;
}
.hand-type-name.empty {
  color: var(--muted);
  font-weight: 600;
}
.score-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.chips-block {
  flex: 1;
  background: linear-gradient(135deg, #4dd6ff, #2196f3);
  border-radius: 10px;
  padding: 10px 6px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 4px 0 #0d4a80, 0 6px 16px rgba(33,150,243,.4);
  border: 2px solid #1a7bd4;
}
.mult-block {
  flex: 1;
  background: linear-gradient(135deg, #ff8844, #ff3344);
  border-radius: 10px;
  padding: 10px 6px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.25), 0 4px 0 #8b1a1a, 0 6px 16px rgba(255,51,68,.4);
  border: 2px solid #cc2233;
}
.score-val-big {
  font-family: 'Press Start 2P', monospace;
  font-size: 22px;
  font-weight: 900;
  color: rgba(0,5,20,.9);
  line-height: 1;
}
.score-unit {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 10px;
  color: rgba(0,0,0,.55);
  margin-top: 3px;
}
.score-x {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: var(--text-dim);
  flex-shrink: 0;
}

/* Hands / Discards */
.hand-discard-row {
  display: flex;
  gap: 6px;
}
.hd-block {
  flex: 1;
  background: #1e3068;
  border: 1px solid rgba(74,107,255,.4);
  border-radius: 8px;
  padding: 4px 8px;
  text-align: center;
}
.hd-label {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 11px;
  color: var(--muted);
}
.hd-val {
  font-family: 'VT323', monospace;
  font-size: 36px;
  line-height: 1;
}
.hd-val.green { color: #62d18b; }
.hd-val.red   { color: #ff5544; }

/* 金币 */
.money-panel {}
.money-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  background: #050818;
  border-radius: 8px;
  padding: 6px 10px;
  border: 1px solid rgba(74,107,255,.3);
}
.money-sign {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  color: var(--gold);
}
.money-val {
  font-family: 'VT323', monospace;
  font-size: 44px;
  color: var(--money);
  line-height: 1;
}

/* Ante */
.sb-ante {
  text-align: center;
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 12px;
  padding: 2px 0;
  flex-shrink: 0;
}
.ante-gold { color: var(--gold); }
.ante-sep  { color: var(--muted); margin: 0 4px; }
.ante-blue { color: #4dd6ff; }

/* 重新开始 */
.restart-btn {
  font-size: 14px;
  min-height: 44px;
  padding: 10px 16px;
  margin-top: auto;
  flex-shrink: 0;
}

/* ===== 右主区 ===== */
.main-area {
  flex: 1;
  display: grid;
  grid-template-rows: 230px 1fr 280px;
  overflow: hidden;
  min-width: 0;
  position: relative;
}

/* 段公共 */
.seg {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 10px 14px 8px;
  position: relative;
}
.seg-joker  { background: rgba(15,23,42,.6); }
.seg-play   { background: rgba(5,8,24,.5); position: relative; }
.seg-hand   { background: transparent; }

/* ===== 第 1 段：Joker 区 ===== */
.joker-header {
  margin-bottom: 8px;
  flex-shrink: 0;
}
.joker-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: var(--gold);
  text-shadow: 2px 2px 0 #000;
  letter-spacing: 1px;
}
.joker-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  flex-shrink: 0;
}
.joker-card {
  width: 140px;
  height: 192px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.joker-card.joker-filled {
  background: linear-gradient(180deg, var(--paper-1), var(--paper-2));
  border: 3px solid var(--card-edge);
  box-shadow: 0 3px 0 rgba(0,0,0,.5);
  /* 四角内描边用 outline + inset shadow 实现稀有度色 */
  outline: 3px solid var(--rarity-color, #6cb4d3);
  outline-offset: -5px;
}
.joker-card:not(.joker-filled) {
  border: 2px dashed rgba(79,70,229,.4);
  background: rgba(79,70,229,.06);
}
.joker-card.joker-glowing {
  animation: joker-glow 0.8s ease-out forwards;
}
.joker-art {
  font-size: 36px;
  line-height: 1;
}
.joker-name {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 12px;
  font-weight: 800;
  color: #1a0f24;
  text-align: center;
}
.joker-desc {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 10px;
  color: #4a3a1a;
  text-align: center;
  padding: 0 8px;
  line-height: 1.4;
}
.empty-slot-plus {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  color: var(--muted);
  line-height: 1;
}
.empty-slot-label {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 12px;
  color: var(--muted);
}

/* ===== 第 2 段：出牌区 ===== */
.play-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.play-label {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
}
.play-type {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #4dd6ff;
}
.played-cards-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  padding: 0 4px;
  position: relative;
}
.play-empty-hint {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 14px;
  color: var(--muted);
  opacity: 0.55;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap;
}
.play-formula-preview {
  font-family: 'Press Start 2P', monospace;
  font-size: 18px;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  letter-spacing: 2px;
}

/* 出牌区的牌 */
.played-card {
  width: 100px;
  height: 145px;
  border-radius: 8px;
  background: linear-gradient(180deg, var(--paper-1), var(--paper-2));
  border: 2px solid var(--card-edge);
  box-shadow: 0 3px 0 rgba(0,0,0,.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 6px;
  flex-shrink: 0;
  position: relative;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.played-card.highlighted {
  transform: translateY(-18px);
  box-shadow: 0 0 12px 4px rgba(77,214,255,.7), 0 6px 0 rgba(0,0,0,.5);
}

/* 公式爆字 */
.formula-overlay {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 50;
  font-family: 'Press Start 2P', monospace;
  font-weight: 900;
  pointer-events: none;
  white-space: nowrap;
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.ff-chips { font-size: 40px; color: #4dd6ff; text-shadow: 0 2px 8px rgba(77,214,255,.6); }
.ff-x     { font-size: 28px; color: var(--text-dim); }
.ff-mult  { font-size: 40px; color: #ff8844; text-shadow: 0 2px 8px rgba(255,136,68,.6); }
.ff-eq    { font-size: 28px; color: var(--text-dim); }
.ff-score { font-size: 52px; color: var(--gold); text-shadow: 0 2px 12px rgba(255,200,87,.8); }

.formula-pop-enter-active { animation: formula-pop 0.9s ease forwards; }
.formula-pop-leave-active { opacity: 0; transition: opacity 0.2s; }
.formula-pop-leave-to     { opacity: 0; }

/* 牌堆 */
.deck-pile {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 90px;
  height: 130px;
  pointer-events: none;
  z-index: 2;
}
.deck-card {
  position: absolute;
  width: 90px;
  height: 130px;
  background: linear-gradient(135deg, #6b3ec9, #2d0d6e);
  border: 2px solid #1a0f24;
  border-radius: 8px;
}
.deck-back-3 { transform: translate(-6px, 6px); opacity: .55; }
.deck-back-2 { transform: translate(-3px, 3px); opacity: .8; }
.deck-back-1 { }
.deck-count {
  position: absolute;
  bottom: -20px;
  left: 0;
  right: 0;
  text-align: center;
  font-family: 'VT323', monospace;
  font-size: 16px;
  color: var(--gold);
}

/* ===== 第 3 段：手牌 + 操作 ===== */
.hand-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  flex-shrink: 0;
  padding-top: 4px;
}
.hand-title {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: var(--gold);
}
.hand-count {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
}
.hand-cards-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  padding-top: 36px;
  flex: 1;
  flex-shrink: 0;
}

/* 扑克牌 */
.hand-card {
  width: 100px;
  height: 145px;
  border-radius: 8px;
  background: linear-gradient(180deg, var(--paper-1), var(--paper-2));
  border: 2px solid var(--card-edge);
  box-shadow: 0 3px 0 rgba(0,0,0,.5);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 6px;
  flex-shrink: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  user-select: none;
  position: relative;
}
.hand-card:hover:not(.selected) {
  transform: translateY(-8px);
  box-shadow: 0 8px 0 rgba(0,0,0,.5);
}
.hand-card.selected {
  transform: translateY(-24px);
  box-shadow: 0 0 12px 4px rgba(77,214,255,.6), 0 8px 0 rgba(0,0,0,.5);
  border-color: #4dd6ff;
}

/* 牌面内容 */
.card-rank-top {
  align-self: flex-start;
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 16px;
  font-weight: 900;
  color: #1a0f24;
  line-height: 1;
}
.card-suit-center {
  font-size: 36px;
  line-height: 1;
  color: #1a0f24;
}
.card-rank-bottom {
  align-self: flex-end;
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 16px;
  font-weight: 900;
  color: #1a0f24;
  line-height: 1;
  transform: rotate(180deg);
}
.hand-card.red-suit .card-rank-top,
.hand-card.red-suit .card-suit-center,
.hand-card.red-suit .card-rank-bottom,
.played-card.red-suit .card-rank-top,
.played-card.red-suit .card-suit-center,
.played-card.red-suit .card-rank-bottom {
  color: #c81b1b;
}

/* 操作按钮行 */
.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 130px 8px 8px;
  flex-shrink: 0;
  flex-wrap: nowrap;
}
.action-row .px-btn {
  flex-shrink: 0;
}

/* ===== 商店覆盖层 ===== */
.shop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(5,8,24,.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}
.shop-card {
  background: linear-gradient(180deg, #1e3068 0%, #0a1438 100%);
  border: 2px solid var(--sb-blue);
  border-radius: 18px;
  padding: 28px 32px;
  box-shadow: 0 16px 48px rgba(0,0,0,.7);
  max-width: 700px;
  width: 90%;
}
.shop-title {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 28px;
  font-weight: 800;
  color: var(--gold);
  text-align: center;
  margin-bottom: 6px;
}
.shop-subtitle {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 14px;
  color: var(--text-dim);
  text-align: center;
  margin-bottom: 22px;
}
.shop-jokers-row {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 24px;
}
.shop-joker-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.shop-joker-wrap.shop-ai-highlight .shop-joker-card {
  box-shadow: 0 0 0 3px #c084fc, 0 0 20px rgba(192,132,252,.5);
}
.shop-joker-card {
  width: 140px;
  height: 192px;
  border-radius: 10px;
  background: linear-gradient(180deg, var(--paper-1), var(--paper-2));
  border: 3px solid var(--card-edge);
  outline: 3px solid var(--rarity-color, #6cb4d3);
  outline-offset: -5px;
  box-shadow: 0 3px 0 rgba(0,0,0,.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.shop-buy-btn {
  width: 140px;
  min-height: 44px;
  font-size: 14px;
  padding: 10px 14px;
}
.shop-buy-btn.btn-buy-ok {
  background: linear-gradient(180deg, #34d399 0%, #10b981 50%, #059669 100%);
  box-shadow: 0 4px 0 #047857, inset 0 1px 0 rgba(255,255,255,.3);
}
.shop-buy-btn.btn-disabled-shop {
  background: rgba(74,107,255,.15);
  box-shadow: none;
  color: var(--muted);
  border-color: rgba(74,107,255,.3);
  opacity: 0.7;
}
.shop-buy-btn.btn-sold {
  background: rgba(30,30,30,.5);
  box-shadow: none;
  color: var(--muted);
  border-color: rgba(100,100,100,.3);
  opacity: 0.5;
}
.shop-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

/* 商店/结束 fade */
.shop-fade-enter-active,
.shop-fade-leave-active { transition: opacity 0.3s ease; }
.shop-fade-enter-from,
.shop-fade-leave-to    { opacity: 0; }

/* ===== 结束覆盖层 ===== */
.end-overlay {
  position: absolute;
  inset: 0;
  background: rgba(5,8,24,.92);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(6px);
}
.end-card {
  background: linear-gradient(180deg, #1e3068 0%, #0a1438 100%);
  border: 2px solid var(--sb-blue);
  border-radius: 18px;
  padding: 36px 48px;
  box-shadow: 0 16px 48px rgba(0,0,0,.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  min-width: 360px;
}
.end-title {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 36px;
  font-weight: 900;
  text-align: center;
}
.end-title.won { color: var(--gold); text-shadow: 0 0 20px rgba(255,200,87,.5); }
.end-title.lost { color: #ef4444; }
.end-money {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-dim);
}
.end-jokers-label {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 6px;
}
.end-jokers-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.end-joker-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(74,107,255,.12);
  border: 1px solid var(--rarity-color, #6cb4d3);
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 13px;
  color: var(--text-dim);
}
.joker-art-sm { font-size: 20px; }

/* ===== 设置浮层按钮 ===== */
.settings-float {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 200;
}

/* ===== 设置 Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}
.settings-modal {
  background: linear-gradient(180deg, #1e3068 0%, #0a1438 100%);
  border: 2px solid var(--sb-blue);
  border-radius: 14px;
  padding: 24px 28px;
  box-shadow: 0 16px 48px rgba(0,0,0,.7);
  width: 420px;
  max-width: 95vw;
}
.settings-title {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: var(--gold);
  text-align: center;
  margin-bottom: 18px;
}
.settings-items {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
}
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.settings-label {
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-dim);
}
.settings-slider {
  width: 150px;
}
.speed-btns {
  display: flex;
  gap: 4px;
}
.speed-btn {
  padding: 4px 12px;
  border-radius: 6px;
  background: rgba(74,107,255,.15);
  border: 1px solid rgba(74,107,255,.3);
  font-family: 'Inter', 'PingFang SC', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
}
.speed-btn.active {
  background: var(--sb-blue);
  color: #fff;
  border-color: var(--sb-blue);
}
.speed-btn:hover:not(.active) { background: rgba(74,107,255,.25); }
.toggle {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: rgba(74,107,255,.3);
  border: 1px solid rgba(74,107,255,.4);
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}
.toggle.on {
  background: var(--sb-blue);
}
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}
.toggle.on .toggle-thumb {
  transform: translateX(20px);
}
.settings-close-btn {
  font-size: 14px;
  min-height: 40px;
  padding: 10px 24px;
}
.settings-footer {
  display: flex;
  justify-content: center;
}

/* ===== 飞字/飞牌容器 ===== */
.fly-texts-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
}
.fly-cards-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9990;
}
.fly-card-clone {
  position: fixed;
  border-radius: 8px;
  background: linear-gradient(180deg, var(--paper-1), var(--paper-2));
  border: 2px solid var(--card-edge);
  box-shadow: 0 6px 16px rgba(0,0,0,.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 6px;
}
</style>
