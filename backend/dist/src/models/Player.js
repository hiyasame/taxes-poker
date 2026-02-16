"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = exports.PlayerStatus = void 0;
var PlayerStatus;
(function (PlayerStatus) {
    PlayerStatus["Active"] = "ACTIVE";
    PlayerStatus["Folded"] = "FOLDED";
    PlayerStatus["AllIn"] = "ALL_IN";
    PlayerStatus["SittingOut"] = "SITTING_OUT";
})(PlayerStatus || (exports.PlayerStatus = PlayerStatus = {}));
class Player {
    constructor(id, name, stack) {
        this.hand = [];
        this.status = PlayerStatus.Active;
        this.currentBet = 0;
        this.totalBetThisRound = 0; // Tracks total contributed in current betting round
        this.totalContributed = 0; // Tracks total contributed in the whole hand
        this.position = -1; // -1 if not seated
        this.id = id;
        this.name = name;
        this.stack = stack;
    }
    resetForRound() {
        this.hand = [];
        this.status = this.stack > 0 ? PlayerStatus.Active : PlayerStatus.SittingOut;
        this.currentBet = 0;
        this.totalBetThisRound = 0;
        this.totalContributed = 0;
    }
    bet(amount) {
        if (amount > this.stack) {
            amount = this.stack; // All-in effectively
        }
        this.stack -= amount;
        this.currentBet += amount;
        this.totalBetThisRound += amount;
        this.totalContributed += amount;
        if (this.stack === 0) {
            this.status = PlayerStatus.AllIn;
        }
        return amount;
    }
    fold() {
        this.status = PlayerStatus.Folded;
        this.hand = [];
    }
}
exports.Player = Player;
