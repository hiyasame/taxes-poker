"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Game_1 = require("../src/game/Game");
const Player_1 = require("../src/models/Player");
describe('Game Flow', () => {
    let game;
    let p1;
    let p2;
    let p3;
    beforeEach(() => {
        game = new Game_1.Game();
        p1 = new Player_1.Player('1', 'Alice', 1000); // Dealer
        p2 = new Player_1.Player('2', 'Bob', 1000); // SB
        p3 = new Player_1.Player('3', 'Charlie', 1000); // BB
        game.addPlayer(p1);
        game.addPlayer(p2);
        game.addPlayer(p3);
    });
    it('should start game correctly', () => {
        game.startGame();
        expect(game.state).toBe(Game_1.GameState.Preflop);
        expect(p1.hand.length).toBe(2);
        expect(p2.hand.length).toBe(2);
        expect(p3.hand.length).toBe(2);
        expect(p2.currentBet).toBe(10); // SB
        expect(p3.currentBet).toBe(20); // BB
        expect(game.currentMaxBet).toBe(20);
        // Turn: After BB (p3, idx 2) -> p1 (idx 0)
        expect(game.currentTurnIndex).toBe(0);
    });
    it('should handle betting round', () => {
        game.startGame();
        // Alice calls 20
        game.handleAction('1', 'call');
        expect(p1.currentBet).toBe(20);
        // Bob calls (SB adds 10)
        game.handleAction('2', 'call');
        expect(p2.currentBet).toBe(20);
        // Charlie Check
        game.handleAction('3', 'check');
        // Flop
        expect(game.state).toBe(Game_1.GameState.Flop);
        expect(game.communityCards.length).toBe(3);
        expect(game.currentPot).toBe(60);
        // Turn should be Bob (SB, idx 1)
        expect(game.currentTurnIndex).toBe(1);
    });
    it('should handle folding', () => {
        game.startGame();
        // Alice folds
        game.handleAction('1', 'fold');
        // Bob calls
        game.handleAction('2', 'call');
        // Charlie checks
        game.handleAction('3', 'check');
        expect(game.state).toBe(Game_1.GameState.Flop);
        expect(game.currentPot).toBe(40); // 20 from p2, 20 from p3
    });
    it('should determine winner at showdown', () => {
        game.startGame();
        // Preflop: Alice, Bob, Charlie all call/check
        game.handleAction('1', 'call');
        game.handleAction('2', 'call');
        game.handleAction('3', 'check');
        // Flop: Bob checks, Charlie checks, Alice checks
        // Turn starts at 1 (Bob)
        game.handleAction('2', 'check');
        game.handleAction('3', 'check');
        game.handleAction('1', 'check');
        // Turn
        game.handleAction('2', 'check');
        game.handleAction('3', 'check');
        game.handleAction('1', 'check');
        // River
        game.handleAction('2', 'check');
        game.handleAction('3', 'check');
        game.handleAction('1', 'check');
        expect(game.state).toBe(Game_1.GameState.Finished);
        expect(game.winners.length).toBeGreaterThan(0);
        // Since random deck, we don't know who won, but currentPot should be emptied (distributed)
        expect(game.currentPot).toBe(0);
        // Total chips in play = 3000
        const total = p1.stack + p2.stack + p3.stack;
        expect(total).toBe(3000);
    });
});
