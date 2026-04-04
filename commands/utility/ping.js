require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR:   "FF0000",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check the bot's latency and API response time."),

    async execute(interaction) {
        const footer = process.env.FOOTER || "Dreama";

        // Measure the round-trip time for deferReply itself — this is a more
        // reliable API latency figure than subtracting timestamps after the
        // fact, and it avoids the extra fetchReply() call that could throw
        // and leave the interaction stuck in the "thinking..." state.
        const before = Date.now();
        await interaction.deferReply();
        const apiLatency = Date.now() - before;

        const wsLatency = interaction.client.ws.ping;

        const embed = new EmbedBuilder()
            .setColor(COLORS.DEFAULT)
            .setTitle("🏓 Pong!")
            .addFields(
                {
                    name:   "🚀 API Latency",
                    value:  `\`${apiLatency}ms\``,
                    inline: true,
                },
                {
                    name:   "🔗 WebSocket Latency",
                    value:  `\`${wsLatency}ms\``,
                    inline: true,
                },
            )
            .setFooter({ text: footer })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
