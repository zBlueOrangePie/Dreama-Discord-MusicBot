require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { formatDuration } = require("../../utils/formatDuration.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR: "FF0000",
};

function parseTimeInput(input) {
    const parts = input.split(":").map(Number);

    if (parts.some(isNaN) || parts.some(n => n < 0)) return null;

    if (parts.length === 1) return parts[0] * 1000;
    if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
    if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;

    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("seek")
        .setDescription("Seek to a specific position in the current track.")
        .addStringOption(option =>
            option
                .setName("position")
                .setDescription("Position to seek to. Formats: seconds (90), mm:ss (1:30), or hh:mm:ss (1:30:00).")
                .setRequired(true)
        ),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer = process.env.FOOTER || "Dreama";
        const positionInput = interaction.options.getString("position");

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
                        .setDescription(`You must be in <#${player.voiceChannelId}> to control playback.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const currentTrack = player.queue.current;

        if (!currentTrack) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Nothing Is Playing!")
                        .setDescription("There is no track currently playing.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!currentTrack.info.isSeekable) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Track Is Not Seekable!")
                        .setDescription("The current track does not support seeking (e.g. live streams).")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const positionMs = parseTimeInput(positionInput);

        if (positionMs === null) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Invalid Format!")
                        .setDescription("Please provide a valid time format.\n\n**Examples:**\n`90` — 90 seconds\n`1:30` — 1 minute 30 seconds\n`1:30:00` — 1 hour 30 minutes")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const trackDuration = currentTrack.info.duration;

        if (positionMs >= trackDuration) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Position Out of Range!")
                        .setDescription(`The track is only **${formatDuration(trackDuration)}** long. You extended too much!`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply();
        await player.seek(positionMs);

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.DEFAULT)
                    .setTitle("⏩ Seeked")
                    .setDescription(`Jumped to **${formatDuration(positionMs)}** in **[${currentTrack.info.title}](${currentTrack.info.uri})**.`)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
        });
    },
};
        
