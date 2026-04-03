require("dotenv").config();
const { Events, ContainerBuilder, MessageFlags, SeparatorSpacingSize } = require("discord.js");

module.exports = {
    name: Events.GuildCreate,
    once: false,

    async execute(guild) {
        const client = guild.client;
        const footer = process.env.FOOTER || "Dreama";
        const username = process.env.USERNAME || "Dreama";
        const avatarURL = client.user?.displayAvatarURL({ dynamic: true, size: 256 })
            ?? "https://cdn.discordapp.com/embed/avatars/0.png";

        console.log(`[Bot] ✅ Joined new guild: ${guild.name} (Owner ID: ${guild.ownerId})`);

        let targetChannel = guild.systemChannel;

        if (!targetChannel) {
            targetChannel = guild.channels.cache.find(
                ch => ch.type === 0 && ch.permissionsFor(client.user)?.has("SendMessages")
            );
        }

        if (!targetChannel) {
            console.warn(`[Bot] ❌ Could not find a suitable channel to send welcome message in ${guild.name}`);
            return;
        }

        const container = new ContainerBuilder()
            .setAccentColor(0xFF7F50)
            .addSectionComponents((section) =>
                section
                    .addTextDisplayComponents((text) =>
                        text.setContent(
                            `## 👋 Thank you for inviting me!\n` +
                            `Hello **${guild.name}**! I'm **${username}** and I'm excited to be here!\n` +
                            `Use \`/help\` to see everything I can do.`
                        )
                    )
                    .setThumbnailAccessory((thumb) => thumb.setURL(avatarURL))
            )
            .addSeparatorComponents((sep) =>
                sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents((text) =>
                text.setContent(
                    `### 🚀 Getting Started\n` +
                    `Use **/config** to set up the necessary configurations such as music channels and voice channels.\n\n` +
                    `### 🎶 Music Commands\n` +
                    `Use **/search** and **/play** to start playing music right away!\n` +
                    `Explore **/playlist** to create and manage your own playlists.\n\n` +
                    `Tip: Use **/recommend** when you got nothing to play!\n` +
                    `-# ${footer}`
                )
            );

        await targetChannel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        }).catch(err => console.error(`[Bot] ❌ Failed to send guild welcome message: ${err.message}`));
    },
};
