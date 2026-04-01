require("dotenv").config();
const { Events, ContainerBuilder, TextDisplayBuilder, SectionBuilder, SeparatorBuilder, ThumbnailBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SeparatorSpacingSize } = require("discord.js");

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member) {
        const client = member.client;
        const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;

        if (!welcomeChannelId) {
            console.warn(`[Bot] ❌ WELCOME_CHANNEL_ID is not set in .env — skipping welcome message.`);
            return;
        }

        const channel = member.guild.channels.cache.get(welcomeChannelId);
        if (!channel) {
            console.warn(`[Bot] ❌ Welcome channel (${welcomeChannelId}) not found in guild ${member.guild.name}`);
            return;
        }

        const inviteUrl = process.env.INVITE_URL || "https://discord.com/oauth2/authorize?client_id=1477557922786447411&permissions=8&integration_type=0&scope=bot";
        const memberAvatar = member.user.displayAvatarURL({ dynamic: true, size: 256 });

        const inviteButton = new ButtonBuilder()
            .setLabel("Invite Dreama Bot")
            .setStyle(ButtonStyle.Link)
            .setURL(inviteUrl);

        const container = new ContainerBuilder()
            .setAccentColor(0xFF7F50)
            .addComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## 🎉 Welcome, ${member}!\n` +
                            `Thank you for joining the **Official Support Server** of the Dreama Music Bot!\n` +
                            `We're really happy to have you here.`
                        )
                    )
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(memberAvatar)
                    ),
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                new TextDisplayBuilder().setContent(
                    `Feel free to explore the server and enjoy music with **Dreama**!\n` +
                    `Use \`/help\` to see all available commands, or invite the bot to your own server below.`
                ),
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                new ActionRowBuilder().addComponents(inviteButton),
            );

        await channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        }).catch(err => console.error(`[Bot] ❌ Failed to send welcome message: ${err.message}`));
    },
};
