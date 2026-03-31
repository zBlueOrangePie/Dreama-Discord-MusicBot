require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { formatDuration } = require('../../utils/formatDuration.js');
const RecentTrack = require('../../utils/database/musicDb.js');

const COLORS = {
    DEFAULT: 'FF7F50',
    ERROR: 'FF0000',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recent')
        .setDescription('Shows the tracks played in the last hour.'),

    async execute(interaction) {
        const guild = interaction.guild;
        const footer = process.env.FOOTER || 'Dreama';
        const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const tracks = await RecentTrack.find({
            guildId: guild.id,
            playedAt: { $gte: oneHourAgo },
        }).sort({ playedAt: -1 }).limit(15);

        if (!tracks.length) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('📭 No Recent Tracks')
                        .setDescription('No tracks have been played in the last hour.')
                        .setFooter({ text: footer })
                        .setThumbnail(avatarURL)
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const description = tracks.map((track, i) => {
            const diffMs = Date.now() - track.playedAt.getTime();
            const diffMin = Math.floor(diffMs / 1000 / 60);
            const timeAgo = diffMin < 1 ? 'just now' : `${diffMin}m ago`;

            return `**${i + 1}.** [${track.title}](${track.uri}) by **${track.author}**\n\`${formatDuration(track.duration)}\` • Requested by **${track.requestedBy}** • ${timeAgo}`;
        }).join('\n\n');

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.DEFAULT)
                    .setTitle('🕐 Recently Played')
                    .setDescription(description)
                    .setFooter({ text: `${footer} • Showing the last ${tracks.length} track(s) within the hour` })
                    .setThumbnail(avatarURL)
                    .setTimestamp(),
            ],
        });
    },
};
