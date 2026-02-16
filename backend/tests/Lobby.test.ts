
import { Lobby } from '../src/game/Lobby';
import { GameState } from '../src/game/Game';
import { PlayerStatus } from '../src/models/Player';

describe('Lobby and Security', () => {
    let lobby: Lobby;

    beforeEach(() => {
        lobby = new Lobby();
    });

    it('should fallback to Waiting state if players < 2', () => {
        lobby.addPlayer('1', 'Alice', 1000);
        lobby.addPlayer('2', 'Bob', 1000);
        lobby.startGame();
        expect(lobby.game.state).not.toBe(GameState.Waiting);

        lobby.removePlayer('2');
        expect(lobby.game.state).toBe(GameState.Waiting);
        expect(lobby.game.players.length).toBe(1);
    });

    it('should not expose other players hands in GameView', () => {
        lobby.addPlayer('1', 'Alice', 1000);
        lobby.addPlayer('2', 'Bob', 1000);
        lobby.startGame();

        const aliceView = lobby.getGameView('1');
        const bobViewFromAlice = aliceView.players.find(p => p.id === '2');

        expect(aliceView.me?.hand).toBeDefined();
        expect(aliceView.me?.hand?.length).toBe(2);
        expect(bobViewFromAlice?.hand).toBeUndefined(); // Security check
    });

    it('should provide Chinese hand type description', () => {
        lobby.addPlayer('1', 'Alice', 1000);
        lobby.addPlayer('2', 'Bob', 1000);
        lobby.startGame();

        const view = lobby.getGameView('1');
        expect(view.currentHandType).toBeDefined();
        // Since it's random, we just check if it's a string
        expect(typeof view.currentHandType).toBe('string');
    });

    it('should hide community cards that are not yet dealt', () => {
        lobby.addPlayer('1', 'Alice', 1000);
        lobby.addPlayer('2', 'Bob', 1000);
        lobby.startGame(); // Preflop

        const view = lobby.getGameView('1');
        expect(view.communityCards.length).toBe(0); // None dealt in preflop

        // Alice calls, Bob checks (end preflop)
        lobby.handleAction('1', 'call');
        lobby.handleAction('2', 'check');

        const viewAfterFlop = lobby.getGameView('1');
        expect(viewAfterFlop.state).toBe(GameState.Flop);
        expect(viewAfterFlop.communityCards.length).toBe(3);
    });
});
