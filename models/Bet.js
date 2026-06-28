import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    bookie: { type: String, required: true },
    sportsbookUsername: { type: String, required: true },
    betId: { type: String }, // Unique ID from the sportsbook
    date: { type: String },
    stake: { type: Number },
    return: { type: Number },
    status: { type: String },
    selection: { type: String },
    sport: { type: String },
    market: { type: String },
    syncedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure unique index per sportsbook bet to prevent duplicates
betSchema.index({ userId: 1, bookie: 1, betId: 1 }, { unique: true });

const Bet = mongoose.model('Bet', betSchema);
export default Bet;
