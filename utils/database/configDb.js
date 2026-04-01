const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true,
    },
    musicChannel: {
        type: String,
        default: null,
    },
    musicVoice: {
        type: String,
        default: null,
    },
    playlistsEnabled: {
        type: Boolean,
        default: true,
    },
});

module.exports = mongoose.model('GuildConfig', configSchema);
