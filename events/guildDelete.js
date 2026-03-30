const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildDelete,
    once: false,
    async execute(guild) {
        console.log(`[Bot] ❌ Left a guild: ${guild.name} (Owner ID: ${guild.ownerId})`);
    },
};
