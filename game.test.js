// ポケモンバトルゲーム - テストコード（3キャラクター対応版）
// TDDアプローチでテストファースト

const {
  selectCharacter,
  removeSelectedCharacter,
  confirmTeamSelection,
  executeAttack,
  autoSwitch,
  switchCharacter,
  checkGameOver,
  calculateHpPercentage,
  addBattleLog,
  transitionToScreen,
  resetGame,
  calculateRandomDamage,
  canUseAttack,
  consumeMP,
  recoverMP,
  getTypeEffectiveness
} = require('./game.js');

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
    maxMp: 100,
    attacks: [
      { name: 'たいあたり', damage: 10, mpCost: 15 },
      { name: 'ひっかく', damage: 15, mpCost: 15 }
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
    const initialHp = state.player2Team[0].currentHp;
    const result = executeAttack(state, 1, attack);

    expect(result.success).toBe(true);
    // ランダムダメージ: 基本ダメージ10に0.85~1.15倍 → 8~11の範囲
    expect(result.damage).toBeGreaterThanOrEqual(8);
    expect(result.damage).toBeLessThanOrEqual(11);
    expect(state.player2Team[0].currentHp).toBe(initialHp - result.damage);
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
// ランダムダメージ変動のテスト
// ========================================

describe('ランダムダメージ変動', () => {
  test('calculateRandomDamageは基本ダメージの85%から115%の範囲で値を返す', () => {
    const baseDamage = 100;
    const minExpected = 85;
    const maxExpected = 115;

    // 複数回実行して範囲を確認
    for (let i = 0; i < 100; i++) {
      const result = calculateRandomDamage(baseDamage);
      expect(result).toBeGreaterThanOrEqual(minExpected);
      expect(result).toBeLessThanOrEqual(maxExpected);
    }
  });

  test('calculateRandomDamageは整数を返す', () => {
    const baseDamage = 100;
    const result = calculateRandomDamage(baseDamage);
    expect(Number.isInteger(result)).toBe(true);
  });

  test('calculateRandomDamageはbaseDamageが0の場合でも動作する', () => {
    const baseDamage = 0;
    const result = calculateRandomDamage(baseDamage);
    expect(result).toBe(0);
  });

  test('executeAttackはランダムダメージを適用する', () => {
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

    const initialHp = state.player2Team[0].currentHp;
    const attack = state.player1Team[0].attacks[0]; // たいあたり、damage: 10

    const result = executeAttack(state, 1, attack);

    expect(result.success).toBe(true);
    expect(result.damage).toBeGreaterThanOrEqual(8); // 10 * 0.85 = 8.5 → 8
    expect(result.damage).toBeLessThanOrEqual(11); // 10 * 1.15 = 11.5 → 11

    const actualDamage = initialHp - state.player2Team[0].currentHp;
    expect(actualDamage).toBe(result.damage);
  });

  test('executeAttackはランダムダメージ情報をバトルログに記録する', () => {
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

    const attack = state.player1Team[0].attacks[0]; // たいあたり、damage: 10

    executeAttack(state, 1, attack);

    // バトルログに技名とダメージが記録されているか確認
    const logMessages = state.battleLog.join(' ');
    expect(logMessages).toContain('たいあたり');
    expect(logMessages).toContain('ダメージ');
  });

  test('最小ダメージは1以上', () => {
    const baseDamage = 1;

    // 複数回実行して最小ダメージを確認
    for (let i = 0; i < 100; i++) {
      const result = calculateRandomDamage(baseDamage);
      expect(result).toBeGreaterThanOrEqual(1);
    }
  });
});

// ========================================
// MPシステムのテスト
// ========================================

describe('MPシステム', () => {
  test('キャラクター選択時にMPが初期化される', () => {
    const state = createTestState();
    const character = state.allCharacters[0];

    selectCharacter(state, 1, character);

    expect(state.player1Team[0].currentMp).toBe(100);
    expect(state.player1Team[0].maxMp).toBe(100);
  });

  test('MP十分な場合は攻撃を使用できる', () => {
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

    const attacker = state.player1Team[0];
    const attack = attacker.attacks[0]; // 威力10、MPコスト15のはず

    const canUse = canUseAttack(attacker, attack);

    expect(canUse).toBe(true);
  });

  test('MP不足の場合は攻撃を使用できない', () => {
    const state = createTestState();

    selectCharacter(state, 1, state.allCharacters[0]);
    selectCharacter(state, 1, state.allCharacters[1]);
    selectCharacter(state, 1, state.allCharacters[2]);
    confirmTeamSelection(state, 1);

    const attacker = state.player1Team[0];
    const attack = attacker.attacks[0]; // MPコスト15のはず
    attacker.currentMp = 10; // MPを10に設定

    const canUse = canUseAttack(attacker, attack);

    expect(canUse).toBe(false);
  });

  test('攻撃実行時にMPが消費される', () => {
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

    const attacker = state.player1Team[0];
    const attack = attacker.attacks[0]; // MPコスト15のはず
    const initialMp = attacker.currentMp;

    executeAttack(state, 1, attack);

    expect(attacker.currentMp).toBe(initialMp - 15);
  });

  test('MP不足時は攻撃が失敗する', () => {
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

    const attacker = state.player1Team[0];
    const attack = attacker.attacks[0]; // MPコスト15のはず
    attacker.currentMp = 10; // MP不足に設定

    const result = executeAttack(state, 1, attack);

    expect(result.success).toBe(false);
    expect(result.error).toBe('MPが足りません');
    expect(state.currentTurn).toBe(1); // ターンは変わらない
  });

  test('ターン終了時に相手のMPが回復する', () => {
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

    const player2Active = state.player2Team[0];
    player2Active.currentMp = 50; // MPを50に設定

    const attack = state.player1Team[0].attacks[0];
    executeAttack(state, 1, attack);

    // プレイヤー2のMPが20回復しているはず
    expect(player2Active.currentMp).toBe(70);
  });

  test('MPは最大値を超えて回復しない', () => {
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

    const player2Active = state.player2Team[0];
    player2Active.currentMp = 95; // MPを95に設定（最大100）

    const attack = state.player1Team[0].attacks[0];
    executeAttack(state, 1, attack);

    // 95 + 20 = 115だが、最大100まで
    expect(player2Active.currentMp).toBe(100);
  });

  test('consumeMP関数が正しく動作する', () => {
    const state = createTestState();
    selectCharacter(state, 1, state.allCharacters[0]);
    const character = state.player1Team[0];

    character.currentMp = 100;
    consumeMP(character, 30);

    expect(character.currentMp).toBe(70);
  });

  test('recoverMP関数が正しく動作する', () => {
    const state = createTestState();
    selectCharacter(state, 1, state.allCharacters[0]);
    const character = state.player1Team[0];

    character.currentMp = 50;
    recoverMP(character, 20);

    expect(character.currentMp).toBe(70);
  });

  test('recoverMP関数は最大値を超えない', () => {
    const state = createTestState();
    selectCharacter(state, 1, state.allCharacters[0]);
    const character = state.player1Team[0];

    character.currentMp = 95;
    recoverMP(character, 20);

    expect(character.currentMp).toBe(100);
  });
});

// ========================================
// 属性相性のテスト
// ========================================

describe('属性相性システム', () => {
  describe('getTypeEffectiveness関数', () => {
    test('fire → grass: 2倍（効果抜群）', () => {
      expect(getTypeEffectiveness('fire', 'grass')).toBe(2);
    });

    test('grass → water: 2倍（効果抜群）', () => {
      expect(getTypeEffectiveness('grass', 'water')).toBe(2);
    });

    test('water → fire: 2倍（効果抜群）', () => {
      expect(getTypeEffectiveness('water', 'fire')).toBe(2);
    });

    test('electric → water: 2倍（効果抜群）', () => {
      expect(getTypeEffectiveness('electric', 'water')).toBe(2);
    });

    test('fire → water: 0.5倍（効果いまひとつ）', () => {
      expect(getTypeEffectiveness('fire', 'water')).toBe(0.5);
    });

    test('water → grass: 0.5倍（効果いまひとつ）', () => {
      expect(getTypeEffectiveness('water', 'grass')).toBe(0.5);
    });

    test('grass → fire: 0.5倍（効果いまひとつ）', () => {
      expect(getTypeEffectiveness('grass', 'fire')).toBe(0.5);
    });

    test('water → electric: 0.5倍（効果いまひとつ）', () => {
      expect(getTypeEffectiveness('water', 'electric')).toBe(0.5);
    });

    test('fire → fire: 1倍（通常）', () => {
      expect(getTypeEffectiveness('fire', 'fire')).toBe(1);
    });

    test('water → water: 1倍（通常）', () => {
      expect(getTypeEffectiveness('water', 'water')).toBe(1);
    });

    test('electric → electric: 1倍（通常）', () => {
      expect(getTypeEffectiveness('electric', 'electric')).toBe(1);
    });

    test('grass → grass: 1倍（通常）', () => {
      expect(getTypeEffectiveness('grass', 'grass')).toBe(1);
    });

    test('electric → fire: 1倍（未定義の組み合わせ）', () => {
      expect(getTypeEffectiveness('electric', 'fire')).toBe(1);
    });

    test('electric → grass: 1倍（未定義の組み合わせ）', () => {
      expect(getTypeEffectiveness('electric', 'grass')).toBe(1);
    });

    test('grass → electric: 1倍（未定義の組み合わせ）', () => {
      expect(getTypeEffectiveness('grass', 'electric')).toBe(1);
    });

    test('fire → electric: 1倍（未定義の組み合わせ）', () => {
      expect(getTypeEffectiveness('fire', 'electric')).toBe(1);
    });
  });

  describe('executeAttackで属性相性が反映される', () => {
    test('効果抜群（2倍）のダメージを与える', () => {
      const state = createTestState();

      // fire属性とgrass属性のキャラクターを作成
      const fireChar = {
        id: 'fire1',
        name: 'ファイアー',
        type: 'fire',
        image: '🔥',
        maxHp: 100,
        currentHp: 100,
        maxMp: 100,
        currentMp: 100,
        attacks: [{ name: 'ほのお', damage: 30, mpCost: 15 }]
      };

      const grassChar = {
        id: 'grass1',
        name: 'グラッシー',
        type: 'grass',
        image: '🌿',
        maxHp: 100,
        currentHp: 100,
        maxMp: 100,
        currentMp: 100,
        attacks: [{ name: 'はっぱ', damage: 30, mpCost: 15 }]
      };

      state.player1Team = [fireChar];
      state.player2Team = [grassChar];
      state.currentTurn = 1;

      const attack = fireChar.attacks[0];
      const result = executeAttack(state, 1, attack);

      expect(result.success).toBe(true);
      // ランダムダメージがあるので範囲でチェック: 30 * 2 = 60, 60 * 0.85 = 51, 60 * 1.15 = 69
      expect(result.damage).toBeGreaterThanOrEqual(51);
      expect(result.damage).toBeLessThanOrEqual(69);
    });

    test('効果いまひとつ（0.5倍）のダメージを与える', () => {
      const state = createTestState();

      // fire属性とwater属性のキャラクターを作成
      const fireChar = {
        id: 'fire1',
        name: 'ファイアー',
        type: 'fire',
        image: '🔥',
        maxHp: 100,
        currentHp: 100,
        maxMp: 100,
        currentMp: 100,
        attacks: [{ name: 'ほのお', damage: 30, mpCost: 15 }]
      };

      const waterChar = {
        id: 'water1',
        name: 'ウォーター',
        type: 'water',
        image: '💧',
        maxHp: 100,
        currentHp: 100,
        maxMp: 100,
        currentMp: 100,
        attacks: [{ name: 'みず', damage: 30, mpCost: 15 }]
      };

      state.player1Team = [fireChar];
      state.player2Team = [waterChar];
      state.currentTurn = 1;

      const attack = fireChar.attacks[0];
      const result = executeAttack(state, 1, attack);

      expect(result.success).toBe(true);
      // ランダムダメージがあるので範囲でチェック: 30 * 0.5 = 15, 15 * 0.85 = 12.75 → 12, 15 * 1.15 = 17.25 → 17
      expect(result.damage).toBeGreaterThanOrEqual(12);
      expect(result.damage).toBeLessThanOrEqual(17);
    });

    test('通常（1倍）のダメージを与える', () => {
      const state = createTestState();

      // fire属性同士のキャラクターを作成
      const fireChar1 = {
        id: 'fire1',
        name: 'ファイアー1',
        type: 'fire',
        image: '🔥',
        maxHp: 100,
        currentHp: 100,
        maxMp: 100,
        currentMp: 100,
        attacks: [{ name: 'ほのお', damage: 30, mpCost: 15 }]
      };

      const fireChar2 = {
        id: 'fire2',
        name: 'ファイアー2',
        type: 'fire',
        image: '🔥',
        maxHp: 100,
        currentHp: 100,
        maxMp: 100,
        currentMp: 100,
        attacks: [{ name: 'ほのお', damage: 30, mpCost: 15 }]
      };

      state.player1Team = [fireChar1];
      state.player2Team = [fireChar2];
      state.currentTurn = 1;

      const attack = fireChar1.attacks[0];
      const result = executeAttack(state, 1, attack);

      expect(result.success).toBe(true);
      // ランダムダメージがあるので範囲でチェック: 30 * 1 = 30, 30 * 0.85 = 25.5 → 25, 30 * 1.15 = 34.5 → 34
      expect(result.damage).toBeGreaterThanOrEqual(25);
      expect(result.damage).toBeLessThanOrEqual(34);
    });

    test('バトルログに「効果抜群！」を表示', () => {
      const state = createTestState();

      const fireChar = {
        id: 'fire1',
        name: 'ファイアー',
        type: 'fire',
        image: '🔥',
        maxHp: 100,
        currentHp: 100,
        maxMp: 100,
        currentMp: 100,
        attacks: [{ name: 'ほのお', damage: 30, mpCost: 15 }]
      };

      const grassChar = {
        id: 'grass1',
        name: 'グラッシー',
        type: 'grass',
        image: '🌿',
        maxHp: 100,
        currentHp: 100,
        maxMp: 100,
        currentMp: 100,
        attacks: [{ name: 'はっぱ', damage: 30, mpCost: 15 }]
      };

      state.player1Team = [fireChar];
      state.player2Team = [grassChar];
      state.currentTurn = 1;

      const attack = fireChar.attacks[0];
      executeAttack(state, 1, attack);

      expect(state.battleLog).toContain('効果抜群！');
    });

    test('バトルログに「効果いまひとつ...」を表示', () => {
      const state = createTestState();

      const fireChar = {
        id: 'fire1',
        name: 'ファイアー',
        type: 'fire',
        image: '🔥',
        maxHp: 100,
        currentHp: 100,
        maxMp: 100,
        currentMp: 100,
        attacks: [{ name: 'ほのお', damage: 30, mpCost: 15 }]
      };

      const waterChar = {
        id: 'water1',
        name: 'ウォーター',
        type: 'water',
        image: '💧',
        maxHp: 100,
        currentHp: 100,
        maxMp: 100,
        currentMp: 100,
        attacks: [{ name: 'みず', damage: 30, mpCost: 15 }]
      };

      state.player1Team = [fireChar];
      state.player2Team = [waterChar];
      state.currentTurn = 1;

      const attack = fireChar.attacks[0];
      executeAttack(state, 1, attack);

      expect(state.battleLog).toContain('効果いまひとつ...');
    });

    test('通常ダメージの時は相性メッセージを表示しない', () => {
      const state = createTestState();

      const fireChar1 = {
        id: 'fire1',
        name: 'ファイアー1',
        type: 'fire',
        image: '🔥',
        maxHp: 100,
        currentHp: 100,
        maxMp: 100,
        currentMp: 100,
        attacks: [{ name: 'ほのお', damage: 30, mpCost: 15 }]
      };

      const fireChar2 = {
        id: 'fire2',
        name: 'ファイアー2',
        type: 'fire',
        image: '🔥',
        maxHp: 100,
        currentHp: 100,
        maxMp: 100,
        currentMp: 100,
        attacks: [{ name: 'ほのお', damage: 30, mpCost: 15 }]
      };

      state.player1Team = [fireChar1];
      state.player2Team = [fireChar2];
      state.currentTurn = 1;

      const attack = fireChar1.attacks[0];
      executeAttack(state, 1, attack);

      expect(state.battleLog).not.toContain('効果抜群！');
      expect(state.battleLog).not.toContain('効果いまひとつ...');
    });
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
