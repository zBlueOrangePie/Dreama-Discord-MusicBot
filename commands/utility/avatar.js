require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const COLORS = {
    DEFAULT: "FF7F50",
    ERROR: "FF0000",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("avatar")
        .setDescription("Display the avatar of a user.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user whose avatar you want to see. Defaults to yourself.")
                .setRequired(false)
        ),

    async execute(interaction) {
        const footer = process.env.FOOTER || "Dreama";
        const target = interaction.options.getUser("user") ?? interaction.user;

        const globalAvatar = target.displayAvatarURL({ dynamic: true, size: 1024 });

        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        const serverAvatar = member?.displayAvatarURL({ dynamic: true, size: 1024 }) ?? null;

        const avatarEmbed = new EmbedBuilder()
            .setColor(COLORS.DEFAULT)
            .setTitle(`🖼️ ${target.username}'s Avatar`)
            .setImage(serverAvatar ?? globalAvatar)
            .setFooter({ text: footer })
            .setTimestamp();

        if (serverAvatar && serverAvatar !== globalAvatar) {
            avatarEmbed.setDescription(`[Global Avatar](${globalAvatar}) • [Server Avatar](${serverAvatar})`);
        } else {
            avatarEmbed.setDescription(`[Open in browser](${globalAvatar})`);
        }

        return interaction.reply({ embeds: [avatarEmbed] });
    },
};
  
