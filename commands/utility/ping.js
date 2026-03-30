require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR: "FF0000",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check the bot's latency and API response time."),

    async execute(interaction) {
        const footer = process.env.FOOTER || "Dreama";

        await interaction.deferReply();

        const sent = await interaction.fetchReply();
        const apiPing = sent.createdTimestamp - interaction.createdTimestamp;
        const wsPing = interaction.client.ws.ping;

        const pingEmbed = new EmbedBuilder()
            .setColor(COLORS.DEFAULT)
            .setTitle("🏓 Pong!")
            .addFields(
                { name: "API Latency",       value: `\`${apiPing}ms\``,  inline: true },
                { name: "WebSocket Latency", value: `\`${wsPing}ms\``,   inline: true },
            )
            .setFooter({ text: footer })
            .setTimestamp();

        await interaction.editReply({ embeds: [pingEmbed] });
    },
};
          
