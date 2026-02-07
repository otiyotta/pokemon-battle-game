// ポケモンバトルゲーム - メインロジック（1体選択仕様版）
// TDDアプローチで実装

// ========================================
// グローバル状態管理
// ========================================
let gameState = {
  allCharacters: [],           // 全キャラクターのマスターデータ
  player1Character: null,      // プレイヤー1の選択キャラクター
  player2Character: null,      // プレイヤー2の選択キャラクター
  currentTurn: 1,              // 現在のターン（1 = プレイヤー1, 2 = プレイヤー2）
  battleLog: [],               // バトルログメッセージ
  isGameOver: false,           // ゲーム終了フラグ
  winner: null                 // 勝者（1 or 2, null = 引き分け）
};

// ========================================
// 初期化とデータ読み込み
// ========================================

/**
 * characters.jsonからキャラクターデータを読み込む
 * @param {string} path - JSONファイルのパス（デフォルト: 'characters.json'）
 * @returns {Promise<Array>} キャラクター配列
 */
async function loadCharacters(path = 'characters.json') {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load characters: ${response.status}`);
    }
    const data = await response.json();
    return data.characters;
  } catch (error) {
    console.error('キャラクターデータの読み込みに失敗しました:', error);
    throw error;
  }
}

/**
 * ゲームを初期化する
 */
async function initGame() {
  try {
    // キャラクターデータを読み込む
    gameState.allCharacters = await loadCharacters();

    // プレイヤー1の選択画面を表示
    renderCharacterSelection(1);
    transitionToScreen('player1-select');

    console.log('ゲーム初期化完了');
  } catch (error) {
    console.error('ゲームの初期化に失敗しました:', error);
    alert('ゲームの読み込みに失敗しました。ページを再読み込みしてください。');
  }
}

// ========================================
// キャラクター選択ロジック
// ========================================

/**
 * キャラクターを選択する
 * @param {Object} state - ゲーム状態
 * @param {number} player - プレイヤー番号（1 or 2）
 * @param {Object} character - 選択するキャラクター
 * @returns {Object} 結果オブジェクト
 */
function selectCharacter(state, player, character) {
  // キャラクターをコピーしてcurrentHpを初期化
  const selectedCharacter = {
    ...character,
    currentHp: character.maxHp
  };

  if (player === 1) {
    state.player1Character = selectedCharacter;
  } else {
    state.player2Character = selectedCharacter;
  }

  return { success: true };
}

// ========================================
// バトルロジック
// ========================================

/**
 * 攻撃を実行する
 * @param {Object} state - ゲーム状態
 * @param {number} player - 攻撃するプレイヤー番号（1 or 2）
 * @param {Object} attack - 使用する技
 * @returns {Object} 結果オブジェクト
 */
function executeAttack(state, player, attack) {
  // 自分のターンでなければ攻撃できない
  if (state.currentTurn !== player) {
    return { success: false, error: 'あなたのターンではありません' };
  }

  // 攻撃側と防御側のキャラクターを取得
  const attacker = player === 1 ? state.player1Character : state.player2Character;
  const defender = player === 1 ? state.player2Character : state.player1Character;

  // ダメージを計算して適用
  const damage = attack.damage;
  defender.currentHp = Math.max(0, defender.currentHp - damage);

  // バトルログに追加
  addBattleLog(state, `${attacker.name}の${attack.name}！`);
  addBattleLog(state, `${defender.name}に${damage}のダメージ！`);

  // 戦闘不能チェック
  const defeated = defender.currentHp === 0;
  if (defeated) {
    addBattleLog(state, `${defender.name}は倒れた！`);
  }

  // ターンを交代
  state.currentTurn = player === 1 ? 2 : 1;

  return { success: true, damage, defeated };
}

// ========================================
// 勝敗判定
// ========================================

/**
 * 勝利条件をチェックする
 * @param {Object} state - ゲーム状態
 * @returns {Object} 結果オブジェクト
 */
function checkWinCondition(state) {
  const player1Defeated = state.player1Character && state.player1Character.currentHp === 0;
  const player2Defeated = state.player2Character && state.player2Character.currentHp === 0;

  // 両方倒れた場合は引き分け
  if (player1Defeated && player2Defeated) {
    state.isGameOver = true;
    state.winner = null;
    return { isGameOver: true, winner: null };
  }

  // プレイヤー1が倒れた場合はプレイヤー2の勝利
  if (player1Defeated) {
    state.isGameOver = true;
    state.winner = 2;
    return { isGameOver: true, winner: 2 };
  }

  // プレイヤー2が倒れた場合はプレイヤー1の勝利
  if (player2Defeated) {
    state.isGameOver = true;
    state.winner = 1;
    return { isGameOver: true, winner: 1 };
  }

  // まだ続行
  return { isGameOver: false, winner: null };
}

// ========================================
// UI更新ヘルパー
// ========================================

/**
 * HPパーセンテージを計算する
 * @param {number} currentHp - 現在のHP
 * @param {number} maxHp - 最大HP
 * @returns {number} HPパーセンテージ（0-100）
 */
function calculateHpPercentage(currentHp, maxHp) {
  if (maxHp === 0) return 0;
  return Math.round((currentHp / maxHp) * 100 * 100) / 100;
}

/**
 * バトルログにメッセージを追加する
 * @param {Object} state - ゲーム状態
 * @param {string} message - ログメッセージ
 */
function addBattleLog(state, message) {
  state.battleLog.push(message);
}

// ========================================
// 画面遷移
// ========================================

/**
 * 指定された画面に遷移する
 * @param {string} screenId - 画面ID（'player1-select', 'player2-select', 'battle', 'result'）
 * @returns {Object} 結果オブジェクト
 */
function transitionToScreen(screenId) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => screen.classList.add('hidden'));

  const targetScreen = document.getElementById(`${screenId}-screen`);
  if (targetScreen) {
    targetScreen.classList.remove('hidden');
    return { success: true };
  }

  return { success: false, error: '画面が見つかりません' };
}

// ========================================
// ゲームリセット
// ========================================

/**
 * ゲームをリセットする
 * @param {Object} state - ゲーム状態
 */
function resetGame(state) {
  state.player1Character = null;
  state.player2Character = null;
  state.currentTurn = 1;
  state.battleLog = [];
  state.isGameOver = false;
  state.winner = null;
}

// ========================================
// UI レンダリング
// ========================================

/**
 * キャラクター選択画面をレンダリングする
 * @param {number} player - プレイヤー番号（1 or 2）
 */
function renderCharacterSelection(player) {
  const gridId = `player${player}-character-grid`;
  const grid = document.getElementById(gridId);

  if (!grid) return;

  // グリッドをクリア
  grid.innerHTML = '';

  // 各キャラクターのカードを作成
  gameState.allCharacters.forEach(character => {
    const card = createCharacterCard(character, player);
    grid.appendChild(card);
  });
}

/**
 * キャラクターカードを作成する
 * @param {Object} character - キャラクターデータ
 * @param {number} player - プレイヤー番号
 * @returns {HTMLElement} カード要素
 */
function createCharacterCard(character, player) {
  const card = document.createElement('div');
  card.className = 'character-card';
  card.dataset.characterId = character.id;

  // カードの内容
  card.innerHTML = `
    <div class="character-image">${character.image}</div>
    <div class="character-info">
      <div class="character-name">${character.name}</div>
      <div class="character-type">${character.type}</div>
      <div class="character-stats">
        <div>HP: ${character.maxHp}</div>
      </div>
    </div>
  `;

  // クリックイベント
  card.addEventListener('click', () => {
    handleCharacterCardClick(character, player);
  });

  return card;
}

/**
 * キャラクターカードクリックを処理する
 * @param {Object} character - キャラクターデータ
 * @param {number} player - プレイヤー番号
 */
function handleCharacterCardClick(character, player) {
  // キャラクターを選択
  selectCharacter(gameState, player, character);

  // 次の画面に遷移
  if (player === 1) {
    renderCharacterSelection(2);
    transitionToScreen('player2-select');
  } else {
    initBattleScreen();
    transitionToScreen('battle');
  }
}

/**
 * バトル画面を初期化する
 */
function initBattleScreen() {
  // 状態をリセット
  gameState.currentTurn = 1;
  gameState.battleLog = [];
  gameState.isGameOver = false;
  gameState.winner = null;

  // 初期ログ
  addBattleLog(gameState, 'バトルスタート！');
  addBattleLog(gameState, `${gameState.player1Character.name} VS ${gameState.player2Character.name}！`);
  addBattleLog(gameState, 'プレイヤー1のターン！');

  // UIを更新
  updateBattleUI();
}

/**
 * バトル画面のUIを更新する
 */
function updateBattleUI() {
  // プレイヤー1
  updatePlayerUI(1);

  // プレイヤー2
  updatePlayerUI(2);

  // バトルログ
  updateBattleLogUI();

  // ターン表示と技ボタン
  updateMoveButtons();
}

/**
 * プレイヤーのUIを更新する
 * @param {number} player - プレイヤー番号
 */
function updatePlayerUI(player) {
  const character = player === 1 ? gameState.player1Character : gameState.player2Character;

  if (!character) return;

  // スプライト（絵文字）
  const sprite = document.getElementById(`player${player}-sprite`);
  if (sprite) {
    sprite.textContent = character.image;
    sprite.style.fontSize = '80px';
    sprite.removeAttribute('src');
  }

  // 名前
  const nameEl = document.getElementById(`player${player}-name`);
  if (nameEl) {
    nameEl.textContent = character.name;
  }

  // タイプ
  const typeEl = document.getElementById(`player${player}-type`);
  if (typeEl) {
    typeEl.textContent = character.type;
  }

  // HP
  updateHPDisplay(player, character);
}

/**
 * HPの表示を更新する
 * @param {number} player - プレイヤー番号
 * @param {Object} character - キャラクターデータ
 */
function updateHPDisplay(player, character) {
  const hpText = document.getElementById(`player${player}-hp-text`);
  const hpBar = document.getElementById(`player${player}-hp-bar`);

  if (hpText) {
    hpText.textContent = `${character.currentHp}/${character.maxHp}`;
  }

  if (hpBar) {
    const percentage = calculateHpPercentage(character.currentHp, character.maxHp);
    hpBar.style.width = `${percentage}%`;

    // HPに応じて色を変更
    if (percentage > 50) {
      hpBar.style.backgroundColor = '#4caf50';
    } else if (percentage > 20) {
      hpBar.style.backgroundColor = '#ff9800';
    } else {
      hpBar.style.backgroundColor = '#f44336';
    }
  }
}

/**
 * バトルログUIを更新する
 */
function updateBattleLogUI() {
  const logContainer = document.getElementById('battle-log');
  if (!logContainer) return;

  logContainer.innerHTML = '';

  // 最新のログから表示（最大15件）
  const recentLogs = gameState.battleLog.slice(-15);
  recentLogs.forEach(message => {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    logContainer.appendChild(entry);
  });

  // 最新のログまでスクロール
  logContainer.scrollTop = logContainer.scrollHeight;
}

/**
 * 技ボタンを更新する
 */
function updateMoveButtons() {
  const moveButtons = document.getElementById('move-buttons');
  if (!moveButtons) return;

  moveButtons.innerHTML = '';

  if (gameState.isGameOver) {
    return;
  }

  const currentPlayer = gameState.currentTurn;
  const character = currentPlayer === 1 ? gameState.player1Character : gameState.player2Character;

  if (!character) return;

  // ターン表示
  const turnInfo = document.createElement('div');
  turnInfo.className = 'turn-info';
  turnInfo.textContent = `プレイヤー${currentPlayer}のターン`;
  turnInfo.style.textAlign = 'center';
  turnInfo.style.fontSize = '20px';
  turnInfo.style.fontWeight = 'bold';
  turnInfo.style.marginBottom = '15px';
  turnInfo.style.color = currentPlayer === 1 ? '#2196f3' : '#f44336';
  moveButtons.appendChild(turnInfo);

  // 各技のボタンを作成
  character.attacks.forEach(attack => {
    const button = document.createElement('button');
    button.className = 'btn btn-attack';
    button.textContent = `${attack.name} (威力: ${attack.damage})`;
    button.addEventListener('click', () => handleAttackClick(attack));
    moveButtons.appendChild(button);
  });
}

/**
 * 攻撃ボタンクリック時の処理
 * @param {Object} attack - 使用する技
 */
function handleAttackClick(attack) {
  if (gameState.isGameOver) return;

  const currentPlayer = gameState.currentTurn;
  const result = executeAttack(gameState, currentPlayer, attack);

  if (!result.success) {
    alert(result.error);
    return;
  }

  // UIを更新
  updateBattleUI();

  // ターン変更のログを追加
  if (!result.defeated && !gameState.isGameOver) {
    addBattleLog(gameState, `プレイヤー${gameState.currentTurn}のターン！`);
    updateBattleLogUI();
  }

  // 勝敗判定
  const winCheck = checkWinCondition(gameState);
  if (winCheck.isGameOver) {
    setTimeout(() => {
      showResultScreen();
    }, 1500);
  }
}

/**
 * 結果画面を表示する
 */
function showResultScreen() {
  const winnerText = document.getElementById('winner-announcement');

  if (winnerText) {
    if (gameState.winner === null) {
      winnerText.textContent = '引き分け！';
    } else {
      winnerText.textContent = `プレイヤー${gameState.winner}の勝利！`;
    }
  }

  // 各プレイヤーの最終状態を表示
  renderFinalCharacter(1);
  renderFinalCharacter(2);

  transitionToScreen('result');
}

/**
 * 最終的なキャラクター状態をレンダリングする
 * @param {number} player - プレイヤー番号
 */
function renderFinalCharacter(player) {
  const containerId = `player${player}-final-team`;
  const container = document.getElementById(containerId);

  if (!container) return;

  const character = player === 1 ? gameState.player1Character : gameState.player2Character;

  if (!character) return;

  container.innerHTML = '';

  const item = document.createElement('div');
  item.className = 'final-pokemon';

  if (character.currentHp === 0) {
    item.classList.add('fainted');
  }

  item.innerHTML = `
    <div class="final-image">${character.image}</div>
    <div class="final-name">${character.name}</div>
    <div class="final-hp">HP: ${character.currentHp}/${character.maxHp}</div>
  `;

  container.appendChild(item);
}

/**
 * ゲーム全体をリセットする
 */
function restartGame() {
  resetGame(gameState);
  renderCharacterSelection(1);
  transitionToScreen('player1-select');
}

// ========================================
// イベントリスナー設定
// ========================================

/**
 * ページ読み込み時の初期化とイベントリスナー設定
 */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // ゲーム初期化
    initGame();

    // リスタートボタン
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', restartGame);
    }
  });
}

// ========================================
// Node.js環境でのテスト用エクスポート
// ========================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadCharacters,
    selectCharacter,
    executeAttack,
    checkWinCondition,
    calculateHpPercentage,
    addBattleLog,
    transitionToScreen,
    resetGame
  };
}
