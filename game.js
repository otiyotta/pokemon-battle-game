// ポケモンバトルゲーム - メインロジック（1体選択仕様版）
// TDDアプローチで実装

// ========================================
// グローバル状態管理
// ========================================
let gameState = {
  allCharacters: [],           // 全キャラクターのマスターデータ
  player1Team: [],             // プレイヤー1の選択キャラクター（3体）
  player2Team: [],             // プレイヤー2の選択キャラクター（3体）
  player1ActiveIndex: 0,       // プレイヤー1のアクティブキャラクターのインデックス
  player2ActiveIndex: 0,       // プレイヤー2のアクティブキャラクターのインデックス
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
 * キャラクターを選択する（3体選択対応）
 * @param {Object} state - ゲーム状態
 * @param {number} player - プレイヤー番号（1 or 2）
 * @param {Object} character - 選択するキャラクター
 * @returns {Object} 結果オブジェクト
 */
function selectCharacter(state, player, character) {
  // プレイヤー番号の検証
  if (player !== 1 && player !== 2) {
    return { success: false, error: '無効なプレイヤー番号です' };
  }

  // チームの選択
  const team = player === 1 ? state.player1Team : state.player2Team;

  // 最大3体まで
  if (team.length >= 3) {
    return { success: false, error: '最大3体まで選択できます' };
  }

  // キャラクターをディープコピーしてcurrentHpを初期化
  const selectedCharacter = {
    ...character,
    currentHp: character.maxHp,
    attacks: character.attacks.map(attack => ({ ...attack }))
  };

  team.push(selectedCharacter);

  return { success: true };
}

/**
 * 選択したキャラクターを削除する
 * @param {Object} state - ゲーム状態
 * @param {number} player - プレイヤー番号（1 or 2）
 * @param {number} index - 削除するインデックス
 * @returns {Object} 結果オブジェクト
 */
function removeSelectedCharacter(state, player, index) {
  const team = player === 1 ? state.player1Team : state.player2Team;

  // インデックスの検証
  if (index < 0 || index >= team.length) {
    return { success: false, error: '無効なインデックスです' };
  }

  team.splice(index, 1);
  return { success: true };
}

/**
 * チーム選択を確定する
 * @param {Object} state - ゲーム状態
 * @param {number} player - プレイヤー番号（1 or 2）
 * @returns {Object} 結果オブジェクト
 */
function confirmTeamSelection(state, player) {
  const team = player === 1 ? state.player1Team : state.player2Team;

  // 3体選択しているか確認
  if (team.length !== 3) {
    return { success: false, error: '3体のキャラクターを選択してください' };
  }

  return { success: true };
}

// ========================================
// バトルロジック
// ========================================

/**
 * 攻撃を実行する（3キャラクター対応）
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
  const attackerTeam = player === 1 ? state.player1Team : state.player2Team;
  const defenderTeam = player === 1 ? state.player2Team : state.player1Team;
  const attackerIndex = player === 1 ? state.player1ActiveIndex : state.player2ActiveIndex;
  const defenderIndex = player === 1 ? state.player2ActiveIndex : state.player1ActiveIndex;

  const attacker = attackerTeam[attackerIndex];
  const defender = defenderTeam[defenderIndex];

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

    // 自動交代を試みる
    const defenderPlayer = player === 1 ? 2 : 1;
    const switchResult = autoSwitch(state, defenderPlayer);

    if (switchResult.success) {
      const newDefender = defenderTeam[player === 1 ? state.player2ActiveIndex : state.player1ActiveIndex];
      addBattleLog(state, `${newDefender.name}が出てきた！`);
    }
  }

  // ターンを交代
  state.currentTurn = player === 1 ? 2 : 1;

  return { success: true, damage, defeated };
}

/**
 * 自動交代を実行する
 * @param {Object} state - ゲーム状態
 * @param {number} player - プレイヤー番号（1 or 2）
 * @returns {Object} 結果オブジェクト
 */
function autoSwitch(state, player) {
  const team = player === 1 ? state.player1Team : state.player2Team;

  // 倒れていないキャラクターを探す
  const aliveIndex = team.findIndex(char => char.currentHp > 0);

  if (aliveIndex === -1) {
    return { success: false, error: '交代可能なキャラクターがいません' };
  }

  // アクティブインデックスを更新
  if (player === 1) {
    state.player1ActiveIndex = aliveIndex;
  } else {
    state.player2ActiveIndex = aliveIndex;
  }

  return { success: true, newIndex: aliveIndex };
}

/**
 * 手動で交代する
 * @param {Object} state - ゲーム状態
 * @param {number} player - プレイヤー番号（1 or 2）
 * @param {number} newIndex - 交代先のインデックス
 * @returns {Object} 結果オブジェクト
 */
function switchCharacter(state, player, newIndex) {
  const team = player === 1 ? state.player1Team : state.player2Team;

  // インデックスの検証
  if (newIndex < 0 || newIndex >= team.length) {
    return { success: false, error: '無効なインデックスです' };
  }

  // 倒れたキャラクターには交代できない
  if (team[newIndex].currentHp === 0) {
    return { success: false, error: '倒れたキャラクターには交代できません' };
  }

  // アクティブインデックスを更新
  if (player === 1) {
    state.player1ActiveIndex = newIndex;
  } else {
    state.player2ActiveIndex = newIndex;
  }

  // バトルログに追加
  addBattleLog(state, `プレイヤー${player}は${team[newIndex].name}に交代した！`);

  // ターンを相手に渡す
  state.currentTurn = player === 1 ? 2 : 1;

  return { success: true };
}

// ========================================
// 勝敗判定
// ========================================

/**
 * ゲームオーバーかどうかをチェックする（3キャラクター対応）
 * @param {Object} state - ゲーム状態
 * @returns {Object} 結果オブジェクト
 */
function checkGameOver(state) {
  // 全キャラクターが倒れているかチェック
  const player1AllFainted = state.player1Team.every(char => char.currentHp === 0);
  const player2AllFainted = state.player2Team.every(char => char.currentHp === 0);

  // 両方倒れた場合は引き分け
  if (player1AllFainted && player2AllFainted) {
    state.isGameOver = true;
    state.winner = null;
    return { isGameOver: true, winner: null };
  }

  // プレイヤー1が全滅した場合はプレイヤー2の勝利
  if (player1AllFainted) {
    state.isGameOver = true;
    state.winner = 2;
    return { isGameOver: true, winner: 2 };
  }

  // プレイヤー2が全滅した場合はプレイヤー1の勝利
  if (player2AllFainted) {
    state.isGameOver = true;
    state.winner = 1;
    return { isGameOver: true, winner: 1 };
  }

  // まだ続行
  return { isGameOver: false, winner: null };
}

// 後方互換性のため別名も用意
const checkWinCondition = checkGameOver;

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
 * ゲームをリセットする（3キャラクター対応）
 * @param {Object} state - ゲーム状態
 */
function resetGame(state) {
  // チームをクリア
  state.player1Team = [];
  state.player2Team = [];
  state.player1ActiveIndex = 0;
  state.player2ActiveIndex = 0;
  state.currentTurn = 1;
  state.battleLog = [];
  state.isGameOver = false;
  state.winner = null;
  // allCharactersは保持する
}

// ========================================
// UI レンダリング
// ========================================

/**
 * キャラクター選択画面をレンダリングする（3キャラクター対応）
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

  // 選択済みリストを更新
  updateSelectedList(player);
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
    <img class="character-image" src="${character.image}" alt="${character.name}">
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
 * 選択済みリストを更新する
 * @param {number} player - プレイヤー番号
 */
function updateSelectedList(player) {
  const team = player === 1 ? gameState.player1Team : gameState.player2Team;
  const listId = `player${player}-selected-list`;
  const countId = `player${player}-selected-count`;
  const btnId = `player${player}-confirm-btn`;

  const list = document.getElementById(listId);
  const count = document.getElementById(countId);
  const btn = document.getElementById(btnId);

  if (!list) return;

  // リストをクリア
  list.innerHTML = '';

  // 選択済みキャラクターを表示
  team.forEach((character, index) => {
    const item = document.createElement('div');
    item.className = 'selected-item';
    item.innerHTML = `
      <img class="selected-char-image" src="${character.image}" alt="${character.name}">
      <span class="selected-char-name">${character.name}</span>
      <button class="btn-remove" data-index="${index}">×</button>
    `;

    // 削除ボタンのイベント
    const removeBtn = item.querySelector('.btn-remove');
    removeBtn.addEventListener('click', () => {
      removeSelectedCharacter(gameState, player, index);
      updateSelectedList(player);
    });

    list.appendChild(item);
  });

  // カウント表示を更新
  if (count) {
    count.textContent = team.length;
  }

  // 決定ボタンの有効/無効を切り替え
  if (btn) {
    if (team.length === 3) {
      btn.disabled = false;
      btn.textContent = '決定';
    } else {
      btn.disabled = true;
      btn.textContent = `決定（${3 - team.length}体選んでください）`;
    }
  }
}

/**
 * キャラクターカードクリックを処理する（3キャラクター対応）
 * @param {Object} character - キャラクターデータ
 * @param {number} player - プレイヤー番号
 */
function handleCharacterCardClick(character, player) {
  // キャラクターを選択
  const result = selectCharacter(gameState, player, character);

  if (!result.success) {
    // 最大数に達している場合はアラート
    alert(result.error);
    return;
  }

  // 選択済みリストを更新
  updateSelectedList(player);
}

/**
 * バトル画面を初期化する（3キャラクター対応）
 */
function initBattleScreen() {
  // 状態をリセット
  gameState.currentTurn = 1;
  gameState.battleLog = [];
  gameState.isGameOver = false;
  gameState.winner = null;
  gameState.player1ActiveIndex = 0;
  gameState.player2ActiveIndex = 0;

  // 初期ログ
  addBattleLog(gameState, 'バトルスタート！');
  addBattleLog(gameState, `${gameState.player1Team[0].name} VS ${gameState.player2Team[0].name}！`);
  addBattleLog(gameState, 'プレイヤー1のターン！');

  // UIを更新
  updateBattleUI();
}

/**
 * バトル画面のUIを更新する（3キャラクター対応）
 */
function updateBattleUI() {
  // プレイヤー1
  updatePlayerUI(1);
  updateBenchDisplay(1);

  // プレイヤー2
  updatePlayerUI(2);
  updateBenchDisplay(2);

  // バトルログ
  updateBattleLogUI();

  // ターン表示と技ボタン
  updateMoveButtons();
}

/**
 * プレイヤーのUIを更新する（3キャラクター対応）
 * @param {number} player - プレイヤー番号
 */
function updatePlayerUI(player) {
  const team = player === 1 ? gameState.player1Team : gameState.player2Team;
  const activeIndex = player === 1 ? gameState.player1ActiveIndex : gameState.player2ActiveIndex;
  const character = team[activeIndex];

  if (!character) return;

  // スプライト（画像）
  const sprite = document.getElementById(`player${player}-sprite`);
  if (sprite) {
    sprite.src = character.image;
    sprite.alt = character.name;
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
 * 控えキャラクターの表示を更新する
 * @param {number} player - プレイヤー番号
 */
function updateBenchDisplay(player) {
  const team = player === 1 ? gameState.player1Team : gameState.player2Team;
  const activeIndex = player === 1 ? gameState.player1ActiveIndex : gameState.player2ActiveIndex;
  const benchId = `player${player}-bench`;
  const bench = document.getElementById(benchId);

  if (!bench) return;

  bench.innerHTML = '';

  team.forEach((character, index) => {
    // アクティブなキャラクターはスキップ
    if (index === activeIndex) return;

    const item = document.createElement('div');
    item.className = 'bench-pokemon';

    // 倒れている場合は半透明
    if (character.currentHp === 0) {
      item.classList.add('fainted');
    }

    const hpPercentage = calculateHpPercentage(character.currentHp, character.maxHp);

    item.innerHTML = `
      <img class="bench-image" src="${character.image}" alt="${character.name}">
      <div class="bench-info">
        <div class="bench-name">${character.name}</div>
        <div class="bench-hp-bar">
          <div class="bench-hp-fill" style="width: ${hpPercentage}%"></div>
        </div>
        <div class="bench-hp-text">${character.currentHp}/${character.maxHp}</div>
      </div>
    `;

    bench.appendChild(item);
  });
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
 * 技ボタンを更新する（3キャラクター対応）
 */
function updateMoveButtons() {
  const moveButtons = document.getElementById('move-buttons');
  if (!moveButtons) return;

  // 交代ボタン以外をクリア
  const switchBtn = document.getElementById('switch-btn');
  moveButtons.innerHTML = '';

  if (gameState.isGameOver) {
    return;
  }

  const currentPlayer = gameState.currentTurn;
  const team = currentPlayer === 1 ? gameState.player1Team : gameState.player2Team;
  const activeIndex = currentPlayer === 1 ? gameState.player1ActiveIndex : gameState.player2ActiveIndex;
  const character = team[activeIndex];

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

  // 交代ボタンを追加
  if (switchBtn) {
    moveButtons.appendChild(switchBtn);
  }
}

/**
 * 攻撃ボタンクリック時の処理（3キャラクター対応）
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
  if (!gameState.isGameOver) {
    addBattleLog(gameState, `プレイヤー${gameState.currentTurn}のターン！`);
    updateBattleLogUI();
  }

  // 勝敗判定
  const winCheck = checkGameOver(gameState);
  if (winCheck.isGameOver) {
    addBattleLog(gameState, '───────────────────────');
    if (winCheck.winner) {
      addBattleLog(gameState, `プレイヤー${winCheck.winner}の勝利！`);
    } else {
      addBattleLog(gameState, '引き分け！');
    }
    updateBattleLogUI();

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
 * 最終的なチーム状態をレンダリングする（3キャラクター対応）
 * @param {number} player - プレイヤー番号
 */
function renderFinalCharacter(player) {
  const containerId = `player${player}-final-team`;
  const container = document.getElementById(containerId);

  if (!container) return;

  const team = player === 1 ? gameState.player1Team : gameState.player2Team;

  if (!team || team.length === 0) return;

  container.innerHTML = '';

  team.forEach(character => {
    const item = document.createElement('div');
    item.className = 'final-pokemon';

    if (character.currentHp === 0) {
      item.classList.add('fainted');
    }

    item.innerHTML = `
      <img class="final-image" src="${character.image}" alt="${character.name}">
      <div class="final-name">${character.name}</div>
      <div class="final-hp">HP: ${character.currentHp}/${character.maxHp}</div>
    `;

    container.appendChild(item);
  });
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
 * 交代モーダルを表示する
 */
function showSwitchModal() {
  const modal = document.getElementById('switch-modal');
  const switchList = document.getElementById('switch-list');

  if (!modal || !switchList) return;

  const currentPlayer = gameState.currentTurn;
  const team = currentPlayer === 1 ? gameState.player1Team : gameState.player2Team;
  const activeIndex = currentPlayer === 1 ? gameState.player1ActiveIndex : gameState.player2ActiveIndex;

  switchList.innerHTML = '';

  team.forEach((character, index) => {
    // アクティブなキャラクターと倒れたキャラクターはスキップ
    if (index === activeIndex || character.currentHp === 0) return;

    const item = document.createElement('div');
    item.className = 'switch-item';
    item.innerHTML = `
      <img class="switch-char-image" src="${character.image}" alt="${character.name}">
      <div class="switch-char-info">
        <div class="switch-char-name">${character.name}</div>
        <div class="switch-char-hp">HP: ${character.currentHp}/${character.maxHp}</div>
      </div>
    `;

    item.addEventListener('click', () => {
      switchCharacter(gameState, currentPlayer, index);
      hideSwitchModal();
      updateBattleUI();
      addBattleLog(gameState, `プレイヤー${gameState.currentTurn}のターン！`);
      updateBattleLogUI();
    });

    switchList.appendChild(item);
  });

  modal.classList.remove('hidden');
}

/**
 * 交代モーダルを非表示にする
 */
function hideSwitchModal() {
  const modal = document.getElementById('switch-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * ページ読み込み時の初期化とイベントリスナー設定（3キャラクター対応）
 */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // ゲーム初期化
    initGame();

    // プレイヤー1決定ボタン
    const player1ConfirmBtn = document.getElementById('player1-confirm-btn');
    if (player1ConfirmBtn) {
      player1ConfirmBtn.addEventListener('click', () => {
        const result = confirmTeamSelection(gameState, 1);
        if (result.success) {
          renderCharacterSelection(2);
          transitionToScreen('player2-select');
        } else {
          alert(result.error);
        }
      });
    }

    // プレイヤー2決定ボタン
    const player2ConfirmBtn = document.getElementById('player2-confirm-btn');
    if (player2ConfirmBtn) {
      player2ConfirmBtn.addEventListener('click', () => {
        const result = confirmTeamSelection(gameState, 2);
        if (result.success) {
          initBattleScreen();
          transitionToScreen('battle');
        } else {
          alert(result.error);
        }
      });
    }

    // 交代ボタン
    const switchBtn = document.getElementById('switch-btn');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        showSwitchModal();
      });
    }

    // 交代キャンセルボタン
    const cancelSwitchBtn = document.getElementById('cancel-switch-btn');
    if (cancelSwitchBtn) {
      cancelSwitchBtn.addEventListener('click', () => {
        hideSwitchModal();
      });
    }

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
    removeSelectedCharacter,
    confirmTeamSelection,
    executeAttack,
    autoSwitch,
    switchCharacter,
    checkGameOver,
    checkWinCondition,
    calculateHpPercentage,
    addBattleLog,
    transitionToScreen,
    resetGame
  };
}
