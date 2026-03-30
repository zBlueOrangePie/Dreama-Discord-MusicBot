const mongoose = require('mongoose');

const recentTrackSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    uri: {
        type: String,
        required: true,
    },
    author: {
        type: String,
        default: 'Unknown',
    },
    duration: {
        type: Number,
        default: 0,
    },
    sourceName: {
        type: String,
        default: 'unknown',
    },
    artworkUrl: {
        type: String,
        default: null,
    },
    requestedBy: {
        type: String,
        default: 'Unknown',
    },
    playedAt: {
        type: Date,
        default: Date.now,
        expires: 3600,
    },
});

module.exports = mongoose.model('RecentTrack', recentTrackSchema);
