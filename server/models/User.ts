import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // The UUID from identity.ts
    username: { type: String, required: true },
    balance: { type: Number, default: 10000 }, // Everyone starts with 10K
    stats: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now }
});

export const UserModel = mongoose.model('User', UserSchema);