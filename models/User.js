import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    linkedAccounts: [{
        bookie: { type: String, required: true },
        username: { type: String, required: true }, // The username for THAT sportsbook
        encryptedSessionToken: { type: String }, // AES encrypted token/cookie
        userAgent: { type: String }, // Store the UA used during login
        lastSync: { type: Date, default: null },
        balance: { type: Number, default: 0 },
        nickname: { type: String, default: null },
        syncError: { type: String, default: null } // Stores error message if background sync fails
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for fast lookup by sportsbook credentials
userSchema.index({ 'linkedAccounts.bookie': 1, 'linkedAccounts.username': 1 });

const User = mongoose.model('User', userSchema);
export default User;
