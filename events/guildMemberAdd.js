require("dotenv").config();
const {
    Events,
    ContainerBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SeparatorSpacingSize,
} = require("discord.js");

// IMPORTANT: For this event to fire, you MUST:
// 1. Enable "Server Members Intent" in your Discord Developer Portal (Bot settings).
// 2. Add GatewayIntentBits.GuildMembers to your client intents in index.js.
// Without both of these, Discord will never send member join events to the bot.

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member) {
        const client           = member.client;
        const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;

        if (!welcomeChannelId) {
            console.warn(`[Bot] ❌ WELCOME_CHANNEL_ID is not set in .env — skipping welcome message.`);
            return;
        }

        // Fetch the channel directly from the API to guarantee we have it,
        // even if it is not in the cache yet.
        let channel;
        try {
            channel = await client.channels.fetch(welcomeChannelId);
        } catch {
            console.warn(`[Bot] ❌ Could not fetch welcome channel (${welcomeChannelId}). Is the ID correct and is the bot in that server?`);
            return;
        }

        if (!channel) {
            console.warn(`[Bot] ❌ Welcome channel (${welcomeChannelId}) returned null.`);
            return;
        }

        if (!channel.isTextBased()) {
            console.warn(`[Bot] ❌ Welcome channel (${welcomeChannelId}) is not a text-based channel.`);
            return;
        }

        const inviteUrl    = process.env.INVITE_URL || "https://discord.com/oauth2/authorize?client_id=1477557922786447411&permissions=8&integration_type=0&scope=bot";
        const memberAvatar = member.user.displayAvatarURL({ dynamic: true, size: 256 });

        const container = new ContainerBuilder()
            .setAccentColor(0xFF7F50)
            .addSectionComponents((section) =>
                section
                    .addTextDisplayComponents((text) =>
                        text.setContent(
                            `## 🎉 Welcome, ${member}!\n` +
                            `Thank you for joining the **official support server** of the Dreama Music Bot!\n` +
                            `We're really happy to have you here.`
                        )
                    )
                    .setThumbnailAccessory((thumb) => thumb.setURL(memberAvatar))
            )
            .addSeparatorComponents((sep) =>
                sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents((text) =>
                text.setContent(
                    `Feel free to explore the server and enjoy music with **Dreama**!\n` +
                    `Use \`/help\` to see all available commands, or invite the bot to your own server below.`
                )
            )
            .addSeparatorComponents((sep) =>
                sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addActionRowComponents((row) =>
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel("Invite Dreama Bot")
                        .setStyle(ButtonStyle.Link)
                        .setURL(inviteUrl)
                )
            );

        await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        }).catch(err => console.error(`[Bot] ❌ Failed to send welcome message: ${err.message}`));
    },
};
