// game.js のテストコード（1体選択仕様版）
// TDDアプローチ: テストを先に書いてから実装する

describe('Pokemon Battle Game Logic - 1体選択版', () => {
  let gameState;

  beforeEach(() => {
    // テスト前に状態をリセット
    gameState = {
      allCharacters: [],
      player1Character: null,
      player2Character: null,
      currentTurn: 1, // 1 = プレイヤー1, 2 = プレイヤー2
      battleLog: [],
      isGameOver: false,
      winner: null
    };
  });

  describe('キャラクターデータ読み込み', () => {
    test('characters.jsonから正しくデータを読み込む', async () => {
      const characters = await loadCharacters();

      expect(characters).toBeDefined();
      expect(Array.isArray(characters)).toBe(true);
      expect(characters.length).toBeGreaterThan(0);
      expect(characters[0]).toHaveProperty('id');
      expect(characters[0]).toHaveProperty('name');
      expect(characters[0]).toHaveProperty('maxHp');
      expect(characters[0]).toHaveProperty('attacks');
    });

    test('読み込みに失敗した場合エラーを投げる', async () => {
      // ファイルパスを無効にしてテスト
      await expect(loadCharacters('invalid.json')).rejects.toThrow();
    });
  });

  describe('キャラクター選択', () => {
    test('プレイヤー1がキャラクターを選択できる', () => {
      const char = { id: 'yuichin', name: 'ゆういちん', maxHp: 120, attacks: [] };

      const result = selectCharacter(gameState, 1, char);

      expect(result.success).toBe(true);
      expect(gameState.player1Character).toBeDefined();
      expect(gameState.player1Character.id).toBe('yuichin');
      expect(gameState.player1Character.currentHp).toBe(120);
    });

    test('プレイヤー2がキャラクターを選択できる', () => {
      const char = { id: 'umin', name: 'うみん', maxHp: 130, attacks: [] };

      const result = selectCharacter(gameState, 2, char);

      expect(result.success).toBe(true);
      expect(gameState.player2Character).toBeDefined();
      expect(gameState.player2Character.id).toBe('umin');
      expect(gameState.player2Character.currentHp).toBe(130);
    });

    test('選択時にcurrentHpがmaxHpで初期化される', () => {
      const char = { id: 'shujin', name: 'しゅうじん', maxHp: 110, attacks: [] };

      selectCharacter(gameState, 1, char);

      expect(gameState.player1Character.currentHp).toBe(char.maxHp);
    });
  });

  describe('バトルロジック', () => {
    beforeEach(() => {
      // バトル用の初期状態
      gameState.player1Character = {
        id: 'yuichin',
        name: 'ゆういちん',
        maxHp: 120,
        currentHp: 120,
        attacks: [
          { name: '火炎放射', damage: 30 },
          { name: '火柱', damage: 45 }
        ]
      };
      gameState.player2Character = {
        id: 'shujin',
        name: 'しゅうじん',
        maxHp: 110,
        currentHp: 110,
        attacks: [
          { name: '10万ボルト', damage: 50 },
          { name: '雷', damage: 35 }
        ]
      };
      gameState.currentTurn = 1;
    });

    test('プレイヤー1の攻撃でプレイヤー2のHPが減る', () => {
      const attack = gameState.player1Character.attacks[0];
      const result = executeAttack(gameState, 1, attack);

      expect(result.success).toBe(true);
      expect(gameState.player2Character.currentHp).toBe(110 - 30); // 80
      expect(gameState.currentTurn).toBe(2); // ターンが交代
    });

    test('プレイヤー2の攻撃でプレイヤー1のHPが減る', () => {
      gameState.currentTurn = 2;
      const attack = gameState.player2Character.attacks[0];
      const result = executeAttack(gameState, 2, attack);

      expect(result.success).toBe(true);
      expect(gameState.player1Character.currentHp).toBe(120 - 50); // 70
      expect(gameState.currentTurn).toBe(1); // ターンが交代
    });

    test('自分のターンでない時は攻撃できない', () => {
      gameState.currentTurn = 2;
      const attack = gameState.player1Character.attacks[0];
      const result = executeAttack(gameState, 1, attack);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ターン');
    });

    test('HPが0以下になった場合は0にクランプされる', () => {
      gameState.player2Character.currentHp = 25;
      const attack = gameState.player1Character.attacks[0]; // 30ダメージ
      const result = executeAttack(gameState, 1, attack);

      expect(result.success).toBe(true);
      expect(gameState.player2Character.currentHp).toBe(0);
      expect(result.defeated).toBe(true);
    });

    test('複数回攻撃してHPが累積で減る', () => {
      const attack = { name: 'テスト攻撃', damage: 20 };

      executeAttack(gameState, 1, attack);
      expect(gameState.player2Character.currentHp).toBe(90);

      executeAttack(gameState, 2, attack);
      expect(gameState.player1Character.currentHp).toBe(100);

      executeAttack(gameState, 1, attack);
      expect(gameState.player2Character.currentHp).toBe(70);
    });
  });

  describe('勝敗判定', () => {
    test('プレイヤー2のHPが0になったらプレイヤー1の勝利', () => {
      gameState.player1Character = { currentHp: 50 };
      gameState.player2Character = { currentHp: 0 };

      const result = checkWinCondition(gameState);

      expect(result.isGameOver).toBe(true);
      expect(result.winner).toBe(1);
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.winner).toBe(1);
    });

    test('プレイヤー1のHPが0になったらプレイヤー2の勝利', () => {
      gameState.player1Character = { currentHp: 0 };
      gameState.player2Character = { currentHp: 50 };

      const result = checkWinCondition(gameState);

      expect(result.isGameOver).toBe(true);
      expect(result.winner).toBe(2);
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.winner).toBe(2);
    });

    test('両方HPが残っていれば継続', () => {
      gameState.player1Character = { currentHp: 50 };
      gameState.player2Character = { currentHp: 30 };

      const result = checkWinCondition(gameState);

      expect(result.isGameOver).toBe(false);
      expect(result.winner).toBeNull();
    });

    test('両方HPが0の場合は引き分け', () => {
      gameState.player1Character = { currentHp: 0 };
      gameState.player2Character = { currentHp: 0 };

      const result = checkWinCondition(gameState);

      expect(result.isGameOver).toBe(true);
      expect(result.winner).toBeNull();
      expect(gameState.isGameOver).toBe(true);
    });
  });

  describe('UI更新', () => {
    test('HPバーの幅が正しく計算される', () => {
      const percentage = calculateHpPercentage(80, 120);
      expect(percentage).toBe(66.67);
    });

    test('HPが0の時は0%', () => {
      const percentage = calculateHpPercentage(0, 120);
      expect(percentage).toBe(0);
    });

    test('HPが満タンの時は100%', () => {
      const percentage = calculateHpPercentage(120, 120);
      expect(percentage).toBe(100);
    });

    test('バトルログに新しいエントリーが追加される', () => {
      addBattleLog(gameState, 'ゆういちんの火炎放射！');

      expect(gameState.battleLog.length).toBe(1);
      expect(gameState.battleLog[0]).toBe('ゆういちんの火炎放射！');
    });

    test('バトルログは最新が最後に追加される', () => {
      addBattleLog(gameState, 'メッセージ1');
      addBattleLog(gameState, 'メッセージ2');
      addBattleLog(gameState, 'メッセージ3');

      expect(gameState.battleLog.length).toBe(3);
      expect(gameState.battleLog[0]).toBe('メッセージ1');
      expect(gameState.battleLog[2]).toBe('メッセージ3');
    });

    test('HPが最大値を超えても正しく計算される', () => {
      const percentage = calculateHpPercentage(150, 120);
      expect(percentage).toBeGreaterThan(100);
    });
  });

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

    test('結果画面からプレイヤー1選択にリセット', () => {
      const result = transitionToScreen('player1-select');
      expect(result.success).toBe(true);
    });

    test('無効な画面IDではエラー', () => {
      const result = transitionToScreen('invalid-screen');
      expect(result.success).toBe(false);
    });
  });

  describe('ゲームリセット', () => {
    test('リセットで全ての状態が初期化される', () => {
      gameState.player1Character = { id: 'test', currentHp: 50 };
      gameState.player2Character = { id: 'test2', currentHp: 30 };
      gameState.currentTurn = 2;
      gameState.battleLog = ['test log'];
      gameState.isGameOver = true;
      gameState.winner = 1;

      resetGame(gameState);

      expect(gameState.player1Character).toBeNull();
      expect(gameState.player2Character).toBeNull();
      expect(gameState.currentTurn).toBe(1);
      expect(gameState.battleLog).toEqual([]);
      expect(gameState.isGameOver).toBe(false);
      expect(gameState.winner).toBeNull();
    });
  });
});
