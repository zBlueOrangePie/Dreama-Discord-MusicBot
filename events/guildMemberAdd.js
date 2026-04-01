require("dotenv").config();
const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member, client) {
        const footer = process.env.FOOTER || "Dreama";
        // Replace with your actual support server channel ID
        const welcomeChannelId = 'CHANNEL_ID';

        const channel = member.guild.channels.cache.get(welcomeChannelId);
        if (!channel) {
            console.warn(`[Bot] ❌ Welcome channel not found for guild ${member.guild.name}`);
            return;
        }

        const inviteUrl = 'https://discord.com/oauth2/authorize?client_id=1477557922786447411&permissions=8&integration_type=0&scope=bot';

        const embed = new EmbedBuilder()
            .setTitle('Welcome To Dreama Community')
            .setDescription('Thank you for joining the **official support server** of the Dreama Music Bot!')
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: footer })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Invite Dreama Bot')
                .setStyle(ButtonStyle.Link)
                .setURL(inviteUrl)
        );

        await channel.send({
            content: `Welcome ${member}! 🎉`,
            embeds: [embed],
            components: [row]
        });
    },
};
