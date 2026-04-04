require("dotenv").config();
const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { buildQueueComponents } = require("../../utils/queueButtonUtils.js");

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

        return interaction.reply({
            components: buildQueueComponents(player, 0, client),
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
