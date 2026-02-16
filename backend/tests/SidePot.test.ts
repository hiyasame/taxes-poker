
import { Game } from '../src/game/Game';
import { Player } from '../src/models/Player';
import { Suit, Rank, Card } from '../src/models/Card';

describe('Side Pots', () => {
    let game: Game;
    let a: Player, b: Player, c: Player;

    beforeEach(() => {
        game = new Game();
        a = new Player('a', 'Alice', 100);
        b = new Player('b', 'Bob', 500);
        c = new Player('c', 'Charlie', 500);
        game.addPlayer(a);
        game.addPlayer(b);
        game.addPlayer(c);

        // Mock deck or just control hands if possible?
        // Let's just run an all-in scenario
    });

    it('should calculate side pots correctly when someone is all-in', () => {
        game.startGame();

        // Preflop
        // a (Alice, Dealer, idx 0)
        // b (Bob, SB, idx 1)
        // c (Charlie, BB, idx 2)

        // Alice all-in for 100
        game.handleAction('a', 'allin');
        // Bob calls 100
        game.handleAction('b', 'call');
        // Charlie calls 100 (He already has 20 in pot as BB)
        game.handleAction('c', 'call');

        // End Preflop. Total in pot: 100 + 100 + 100 = 300.
        // Alice is all-in.

        // Flop
        // Alice is skipped. Bob checks. Charlie checks.
        game.handleAction('b', 'check');
        game.handleAction('c', 'check');

        // Turn
        game.handleAction('b', 'check');
        game.handleAction('c', 'check');

        // River
        // Bob bets 200
        game.handleAction('b', 'raise', 200);
        // Charlie calls 200
        game.handleAction('c', 'call');

        // End of River.
        // Alice total contributed: 100
        // Bob total contributed: 300
        // Charlie total contributed: 300

        // Showdown
        // Pot 1 (Main): 100 * 3 = 300. Eligible: A, B, C.
        // Pot 2 (Side): (300 - 100) * 2 = 400. Eligible: B, C.

        game.showdown();

        const totalChipsAfter = a.stack + b.stack + c.stack;
        expect(totalChipsAfter).toBe(1100); // 100 + 500 + 500
    });
});
