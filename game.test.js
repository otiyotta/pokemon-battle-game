// ポケモンバトルゲーム - テストコード（3キャラクター対応版）
// TDDアプローチでテストファースト

// ========================================
// テスト用ヘルパー関数
// ========================================

/**
 * テスト用のキャラクターデータを作成
 */
function createTestCharacter(id, name, maxHp) {
  return {
    id: id,
    name: name,
    type: 'テスト',
    image: '🎮',
    maxHp: maxHp,
    attacks: [
      { name: 'たいあたり', damage: 10 },
      { name: 'ひっかく', damage: 15 }
    ]
  };
}

/**
 * テスト用の初期状態を作成
 */
function createTestState() {
  return {
    allCharacters: [
      createTestCharacter(1, 'ピカチュウ', 100),
      createTestCharacter(2, 'カメックス', 120),
      createTestCharacter(3, 'リザードン', 110)
    ],
    player1Team: [],
    player2Team: [],
    player1ActiveIndex: 0,
    player2ActiveIndex: 0,
    currentTurn: 1,
    battleLog: [],
    isGameOver: false,
    winner: null
  };
}

// ========================================
// キャラクター選択のテスト
// ========================================

describe('キャラクター選択機能', () => {
  test('キャラクターを選択できる（1体目）', () => {
    const state = createTestState();
    const character = state.allCharacters[0];

    const result = selectCharacter(state, 1, character);

    expect(result.success).toBe(true);
    expect(state.player1Team).toHaveLength(1);
    expect(state.player1Team[0].name).toBe('ピカチュウ');
    expect(state.player1Team[0].currentHp).toBe(100);
  });

  test('キャラクターを3体まで選択できる', () => {
    const state = createTestState();

    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);

    expect(state.player1Team).toHaveLength(3);
    expect(state.player1Team[0].name).toBe('ピカチュウ');
    expect(state.player1Team[1].name).toBe('カメックス');
    expect(state.player1Team[2].name).toBe('リザードン');
  });

  test('同じキャラクターを重複して選択できる', () => {
    const state = createTestState();
    const character = state.allCharacters[0];

    selectCharacter(state, 1, character);
    selectCharacter(state, 1, character);
    selectCharacter(state, 1, character);

    expect(state.player1Team).toHaveLength(3);
    expect(state.player1Team[0]).not.toBe(state.player1Team[1]); // 別インスタンス
    expect(state.player1Team[0].name).toBe(state.player1Team[1].name); // 同じ名前
  });

  test('4体目の選択は失敗する', () => {
    const state = createTestState();

    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);
    const result = selectCharacter(state, 1, state.allCharacters[0]);

    expect(result.success).toBe(false);
    expect(result.error).toBe('最大3体まで選択できます');
    expect(state.player1Team).toHaveLength(3);
  });

  test('選択したキャラクターを削除できる', () => {
    const state = createTestState();

    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);

    const result = removeSelectedCharacter(state, 1, 1);

    expect(result.success).toBe(true);
    expect(state.player1Team).toHaveLength(2);
    expect(state.player1Team[0].name).toBe('ピカチュウ');
    expect(state.player1Team[1].name).toBe('リザードン');
  });

  test('チーム選択を確定できる', () => {
    const state = createTestState();

    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);

    const result = confirmTeamSelection(state, 1);

    expect(result.success).toBe(true);
  });

  test('3体未満では確定できない', () => {
    const state = createTestState();

    selectCharacter(state, 1, state.allCharacters[0]);

    const result = confirmTeamSelection(state, 1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('3体のキャラクターを選択してください');
  });

  test('無効なプレイヤー番号でエラーを返す', () => {
    const state = createTestState();
    const character = state.allCharacters[0];

    const result = selectCharacter(state, 3, character);

    expect(result.success).toBe(false);
    expect(result.error).toBe('無効なプレイヤー番号です');
  });

  test('範囲外のインデックスで削除するとエラー', () => {
    const state = createTestState();

    selectCharacter(state, 1, state.allCharacters[0]);

    const result = removeSelectedCharacter(state, 1, 5);

    expect(result.success).toBe(false);
    expect(result.error).toBe('無効なインデックスです');
  });
});

// ========================================
// バトルロジックのテスト
// ========================================

describe('バトルロジック（3キャラクター対応）', () => {
  test('アクティブなキャラクターで攻撃する', () => {
    const state = createTestState();

    // チーム設定
    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);
    confirmTeamSelection(state, 1);

    selectCharacter(state, 2, state.allCharacters[0]);
    selectCharacter(state, 2, state.allCharacters[1]);
    selectCharacter(state, 2, state.allCharacters[2]);
    confirmTeamSelection(state, 2);

    const attack = state.player1Team[0].attacks[0];
    const result = executeAttack(state, 1, attack);

    expect(result.success).toBe(true);
    expect(result.damage).toBe(10);
    expect(state.player2Team[0].currentHp).toBe(90);
    expect(state.currentTurn).toBe(2);
  });

  test('HPが0になったら自動で交代する', () => {
    const state = createTestState();

    // チーム設定
    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);
    confirmTeamSelection(state, 1);

    selectCharacter(state, 2, state.allCharacters[0]);
    selectCharacter(state, 2, state.allCharacters[1]);
    selectCharacter(state, 2, state.allCharacters[2]);
    confirmTeamSelection(state, 2);

    // プレイヤー2のアクティブキャラクターのHPを1に設定
    state.player2Team[0].currentHp = 1;

    const attack = state.player1Team[0].attacks[0];
    const result = executeAttack(state, 1, attack);

    expect(result.success).toBe(true);
    expect(result.defeated).toBe(true);
    expect(state.player2Team[0].currentHp).toBe(0);
    expect(state.player2ActiveIndex).toBe(1); // 次のキャラクターに自動交代
  });

  test('全キャラクター倒れたら勝敗判定', () => {
    const state = createTestState();

    // チーム設定
    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);
    confirmTeamSelection(state, 1);

    selectCharacter(state, 2, state.allCharacters[0]);
    selectCharacter(state, 2, state.allCharacters[1]);
    selectCharacter(state, 2, state.allCharacters[2]);
    confirmTeamSelection(state, 2);

    // プレイヤー2の全キャラクターを倒す
    state.player2Team[0].currentHp = 0;
    state.player2Team[1].currentHp = 0;
    state.player2Team[2].currentHp = 0;

    const result = checkGameOver(state);

    expect(result.isGameOver).toBe(true);
    expect(result.winner).toBe(1);
    expect(state.isGameOver).toBe(true);
    expect(state.winner).toBe(1);
  });

  test('自分のターンでない時は攻撃できない', () => {
    const state = createTestState();

    // チーム設定
    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);
    confirmTeamSelection(state, 1);

    selectCharacter(state, 2, state.allCharacters[0]);
    selectCharacter(state, 2, state.allCharacters[1]);
    selectCharacter(state, 2, state.allCharacters[2]);
    confirmTeamSelection(state, 2);

    state.currentTurn = 2;

    const attack = state.player1Team[0].attacks[0];
    const result = executeAttack(state, 1, attack);

    expect(result.success).toBe(false);
    expect(result.error).toBe('あなたのターンではありません');
  });
});

// ========================================
// 交代機能のテスト
// ========================================

describe('交代機能', () => {
  test('手動で交代できる', () => {
    const state = createTestState();

    // チーム設定
    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);
    confirmTeamSelection(state, 1);

    selectCharacter(state, 2, state.allCharacters[0]);
    selectCharacter(state, 2, state.allCharacters[1]);
    selectCharacter(state, 2, state.allCharacters[2]);
    confirmTeamSelection(state, 2);

    const result = switchCharacter(state, 1, 2);

    expect(result.success).toBe(true);
    expect(state.player1ActiveIndex).toBe(2);
    expect(state.currentTurn).toBe(2); // ターンが相手に移る
  });

  test('倒れたキャラクターには交代できない', () => {
    const state = createTestState();

    // チーム設定
    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);
    confirmTeamSelection(state, 1);

    // キャラクター2を倒れた状態にする
    state.player1Team[1].currentHp = 0;

    const result = switchCharacter(state, 1, 1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('倒れたキャラクターには交代できません');
  });

  test('自動交代は倒れていないキャラクターを選択する', () => {
    const state = createTestState();

    // チーム設定
    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);
    confirmTeamSelection(state, 1);

    // キャラクター1を倒す
    state.player1Team[0].currentHp = 0;
    state.player1ActiveIndex = 0;

    const result = autoSwitch(state, 1);

    expect(result.success).toBe(true);
    expect(state.player1ActiveIndex).toBe(1); // 次の生きているキャラクター
  });

  test('全員倒れている場合は自動交代できない', () => {
    const state = createTestState();

    // チーム設定
    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);
    confirmTeamSelection(state, 1);

    // 全キャラクターを倒す
    state.player1Team[0].currentHp = 0;
    state.player1Team[1].currentHp = 0;
    state.player1Team[2].currentHp = 0;

    const result = autoSwitch(state, 1);

    expect(result.success).toBe(false);
    expect(result.error).toBe('交代可能なキャラクターがいません');
  });
});

// ========================================
// リセット機能のテスト
// ========================================

describe('リセット機能', () => {
  test('ゲームをリセットできる', () => {
    const state = createTestState();

    // チーム設定
    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);
    confirmTeamSelection(state, 1);

    selectCharacter(state, 2, state.allCharacters[0]);
    selectCharacter(state, 2, state.allCharacters[1]);
    selectCharacter(state, 2, state.allCharacters[2]);
    confirmTeamSelection(state, 2);

    // バトルを進める
    state.currentTurn = 2;
    state.battleLog.push('テストログ');
    state.player1Team[0].currentHp = 50;

    resetGame(state);

    expect(state.player1Team).toHaveLength(0);
    expect(state.player2Team).toHaveLength(0);
    expect(state.player1ActiveIndex).toBe(0);
    expect(state.player2ActiveIndex).toBe(0);
    expect(state.currentTurn).toBe(1);
    expect(state.battleLog).toHaveLength(0);
    expect(state.isGameOver).toBe(false);
    expect(state.winner).toBe(null);
    expect(state.allCharacters).toHaveLength(3); // キャラクターデータは保持
  });
});

// ========================================
// ユーティリティ関数のテスト
// ========================================

describe('ユーティリティ関数', () => {
  test('HPパーセンテージを正しく計算する', () => {
    expect(calculateHpPercentage(100, 100)).toBe(100);
    expect(calculateHpPercentage(50, 100)).toBe(50);
    expect(calculateHpPercentage(0, 100)).toBe(0);
    expect(calculateHpPercentage(33, 100)).toBe(33);
  });

  test('バトルログを追加できる', () => {
    const state = createTestState();

    addBattleLog(state, 'テストメッセージ1');
    addBattleLog(state, 'テストメッセージ2');

    expect(state.battleLog).toHaveLength(2);
    expect(state.battleLog[0]).toBe('テストメッセージ1');
    expect(state.battleLog[1]).toBe('テストメッセージ2');
  });
});

// ========================================
// 画面遷移のテスト
// ========================================

describe('画面遷移', () => {
  test('プレイヤー1選択からプレイヤー2選択に遷移', () => {
    const result = transitionToScreen('player2-select');
    expect(result.success).toBe(true);
  });

  test('プレイヤー2選択からバトル画面に遷移', () => {
    const result = transitionToScreen('battle');
    expect(result.success).toBe(true);
  });

  test('バトル画面から結果画面に遷移', () => {
    const result = transitionToScreen('result');
    expect(result.success).toBe(true);
  });

  test('無効な画面IDではエラー', () => {
    const result = transitionToScreen('invalid-screen');
    expect(result.success).toBe(false);
  });
});
