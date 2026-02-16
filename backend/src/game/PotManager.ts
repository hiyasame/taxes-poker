
import { Player } from '../models/Player';

export interface Pot {
    amount: number;
    eligiblePlayers: string[]; // Player IDs
}

export class PotManager {
    private pots: Pot[] = [];

    reset() {
        this.pots = [];
    }

    // Call this at the end of a betting round
    collectBets(players: Player[]) {
        // Filter players who bet > 0
        const bettingPlayers = players.filter(p => p.currentBet > 0);
        if (bettingPlayers.length === 0) return;

        // Sort by bet amount
        bettingPlayers.sort((a, b) => a.currentBet - b.currentBet);

        let previousBet = 0;

        for (let i = 0; i < bettingPlayers.length; i++) {
            const player = bettingPlayers[i];
            const contribution = player.currentBet - previousBet;

            if (contribution > 0) {
                // Players eligible for this chunk are this player and everyone who bet >= this player
                const eligible = bettingPlayers.slice(i).map(p => p.id);

                // Add to existing pot if same eligible players? No, create new side pots as needed.
                // Usually we just create slices.

                // calculate checks: 
                // amount = contribution * eligible.length

                // But wait, what if someone folded but put money in? (Folded players have currentBet > 0 usually until end of round)
                // Folded players are NOT eligible to win, but their money is in the pot.
                // My logic above used `eligible` based on current bet logic.
                // Folded players should be treated as contributors but not eligible.
            }
        }

        // Correct Algorithm:
        // 1. Identify all unique bet amounts (step levels).
        // 2. For each level, calculate pot contribution from all players.
        // 3. Eligible players are those who bet >= level AND are not folded.

        // However, we must handle Folded players separately.
        // Players who folded: their money goes into the pot representing the level they reached.
        // But they are not eligible.
    }

    // Better approach: maintain a main pot and side pots dynamically?
    // Or simpler: Just calculate side pots at Showdown logic.
    // For now, just track total money in pot.
    // The requirement says "Handle side pots".

    // Let's implement robust calculation.

    calculatePots(players: Player[]): Pot[] {
        // Get all bets from current round + accumulated from previous?
        // NO, PotManager should accumulate bets round by round.
        // A side pot is created when a player is All-In.

        // If no one is All-In, there is only one Main Pot.

        return this.pots;
    }
}
