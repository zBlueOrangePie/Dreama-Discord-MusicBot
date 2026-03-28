require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { formatDuration } = require("../../utils/formatDuration.js");

const COLORS = {
    DEFAULT: "5865F2",
    SUCCESS: "50C878",
    ERROR: "FF0000",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("uptime")
        .setDescription("Check how long the bot has been running."),

    async execute(interaction) {
        const footer = process.env.FOOTER || "Dreama";
        const uptimeMs = process.uptime() * 1000;
        const uptimeLabel = formatDuration(uptimeMs);

        const uptimeEmbed = new EmbedBuilder()
            .setColor(COLORS.DEFAULT)
            .setTitle("⏱️ Uptime")
            .setDescription(`The bot has been running for **${uptimeLabel}**.`)
            .setFooter({ text: footer })
            .setTimestamp();

        await interaction.reply({ embeds: [uptimeEmbed] });
    },
};
          
