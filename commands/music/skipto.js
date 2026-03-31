require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { formatDuration } = require("../../utils/formatDuration.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR: "FF0000",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("skipto")
        .setDescription("Skip to a specific track position in the queue.")
        .addIntegerOption(option =>
            option
                .setName("position")
                .setDescription("The queue position to skip to (1 = next track).")
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer = process.env.FOOTER || "Dreama";
        const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;
        const position = interaction.options.getInteger("position");

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ Please Join A Voice Channel First!")
                        .setDescription("You need to be in a voice channel to use this command.")
                        .setFooter({ text: footer })
                        .setThumbnail(avatarURL)
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
                        .setThumbnail(avatarURL)
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
                        .setThumbnail(avatarURL)
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const queueTracks = player.queue?.tracks ?? [];

        if (!queueTracks.length) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Queue Is Empty!")
                        .setDescription("There are no tracks in the queue to skip to.")
                        .setFooter({ text: footer })
                        .setThumbnail(avatarURL)
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const targetIndex = position - 1;

        if (targetIndex >= queueTracks.length) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Position Out of Range!")
                        .setDescription(`The queue only has **${queueTracks.length}** track(s). Please choose a position between **1** and **${queueTracks.length}**.`)
                        .setFooter({ text: footer })
                        .setThumbnail(avatarURL)
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const targetTrack = queueTracks[targetIndex];

        if (targetIndex > 0) {
            player.queue.tracks.splice(0, targetIndex);
        }

        await interaction.deferReply();
        await player.skip(0, false);

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setTitle("⏭️ Skipped to Track")
                    .setDescription(`Jumped to **[${targetTrack.info.title}](${targetTrack.info.uri})** at queue position **${position}**.`)
                    .addFields(
                        { 
                          name: "Author",   
                          value: targetTrack.info.author || "Unknown",          
                          inline: true 
                        },
                        { 
                          name: "Duration", 
                          value: formatDuration(targetTrack.info.duration),     
                          inline: true 
                        }
                    )
                    .setFooter({ text: footer })
                    .setThumbnail(avatarURL)
                    .setTimestamp(),
            ],
        });
    },
};
  
