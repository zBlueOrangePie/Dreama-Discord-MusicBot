require("dotenv").config();
const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { buildQueueRow, buildQueueEmbed } = require("../../utils/queueButtonUtils.js");

const MAX_DISPLAY = 10;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Display the current queue."),

    async execute(interaction) {
        const client = interaction.client;
        const guild = interaction.guild;
        const footer = process.env.FOOTER || "Dreama";

        const player = client.lavalink.getPlayer(guild.id);

        if (!player || !player.connected) {
            return interaction.reply({
                embeds: [
                    {
                        color: 0xFF0000,
                        title: "❌ Nothing Is Playing!",
                        description: "There is no active player in this server.",
                        footer: { text: footer },
                        timestamp: new Date().toISOString(),
                    },
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!player.queue.current) {
            return interaction.reply({
                embeds: [
                    {
                        color: 0xFF0000,
                        title: "📭 Queue Is Empty!",
                        description: "Nothing is playing right now. Use `/play` to add a song.",
                        footer: { text: footer },
                        timestamp: new Date().toISOString(),
                    },
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const tracks = player.queue.tracks;
        const totalPages = Math.max(1, Math.ceil(tracks.length / MAX_DISPLAY));

        const embed = buildQueueEmbed(player, 0);

        if (tracks.length > MAX_DISPLAY) {
            const row = buildQueueRow(0, totalPages);
            return interaction.reply({ embeds: [embed], components: [row] });
        }

        return interaction.reply({ embeds: [embed] });
    },
};
                                     
