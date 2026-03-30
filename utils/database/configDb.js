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
});

module.exports = mongoose.model('GuildConfig', configSchema);
