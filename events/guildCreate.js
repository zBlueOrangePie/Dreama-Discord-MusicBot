require("dotenv").config();
const { Events, EmbedBuilder } = require('discord.js');
const COLORS = {
    DEFAULT: "FF7F50"
};

module.exports = {
    name: Events.GuildCreate,
    once: false,
    async execute(guild, client) {
        const footer = process.env.FOOTER || "Dreama";
        const username = process.env.USERNAME || "Dreama";
        console.log(`[Bot] ✅ Joined new guild: ${guild.name} (Owner ID: ${guild.ownerId})`);

        let targetChannel = guild.systemChannel;
        if (!targetChannel) {
            targetChannel = guild.channels.cache.find(
                channel => channel.type === 0 && channel.permissionsFor(client.user).has('SendMessages')
            );
        }

        if (targetChannel) {
            const embed = new EmbedBuilder()
                .setTitle('Thank you for inviting me!')
                .setDescription(`Hello **${guild.name}**! I’m ${username} and im excited to be here! Use \`/help\` to see what I can do.`)
            .addFields(
                {
                name: "🚀 Getting Started",
                value: `Use **/config** to setup necessary configurations that you need.`,
                inline: false
            },
                {
                 name: "🎶 Music Commands",
                 value: `You can use **/search** and **/play** if you want to start playing music in no time!`,
                 inline: false
            }
       )
                .setColor(COLORS.DEFAULT)
                .setFooter({ text: footer })
                .setTimestamp();

            await targetChannel.send({ embeds: [embed] });
        } else {
            console.warn(`[Bot] ❌ Could not find a suitable channel to send the welcome message in ${guild.name}`);
        }
    },
};
