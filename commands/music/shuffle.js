require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { syncNpMessage } = require("../../utils/npButtonUtils.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR: "FF0000",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shuffle")
        .setDescription("Randomly shuffle all upcoming tracks in the queue."),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer = process.env.FOOTER || "Dreama";

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ Please Join A Voice Channel First!")
                        .setDescription("You need to be in a voice channel to use this command.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const player = client.lavalink.getPlayer(guild.id);

        if (!player || !player.connected) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Nothing Is Playing!")
                        .setDescription("There is no active player in this server.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (player.voiceChannelId !== voiceChannel.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ Wrong Voice Channel!")
                        .setDescription(`You must be in <#${player.voiceChannelId}> to manage the queue.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const tracks = player.queue.tracks;

        if (!tracks || tracks.length < 2) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("📭 Not Enough Tracks!")
                        .setDescription("You need at least **2 upcoming tracks** in the queue to shuffle.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        // Fisher-Yates shuffle
        for (let i = tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
        }

        await syncNpMessage(player);

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setTitle("🔀 Queue Shuffled!")
                    .setDescription(`**${tracks.length}** upcoming tracks have been randomly shuffled.`)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
        });
    },
};
