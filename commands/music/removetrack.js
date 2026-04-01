require('dotenv').config();
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, MessageFlags, } = require('discord.js');
const { formatDuration } = require('../../utils/formatDuration.js');
const { syncNpMessage } = require('../../utils/npButtonUtils.js');

const CACHE_TTL_MS = 3 * 60 * 1000;
const removetrackCache = new Map();

const COLORS = {
    DEFAULT: 'FF7F50',
    SUCCESS: '50C878',
    ERROR: 'FF7F50',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removetrack')
        .setDescription('Remove a track from the queue by selecting it from a menu.'),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer = process.env.FOOTER || 'Dreama';
        const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('‼️ Please Join A Voice Channel First!')
                        .setDescription('You need to be in a voice channel to use this command.')
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
                        .setTitle('❌ Nothing Is Playing!')
                        .setDescription('There is no active player in this server.')
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
                        .setTitle('‼️ Wrong Voice Channel!')
                        .setDescription(`You must be in <#${player.voiceChannelId}> to manage the queue.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const tracks = player.queue.tracks;

        if (!tracks.length) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('📭 Queue Is Empty!')
                        .setDescription('There are no tracks in the queue to remove.')
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const options = tracks.slice(0, 25).map((track, i) => {
            const title = track.info.title.length > 90
                ? track.info.title.slice(0, 87) + '...'
                : track.info.title;
            const desc = `By ${(track.info.author || 'Unknown').slice(0, 30)} • ${formatDuration(track.info.duration)}`;

            return {
                label: `${i + 1}. ${title}`,
                description: desc.length > 100 ? desc.slice(0, 97) + '...' : desc,
                value: `${i}`,
            };
        });

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`removetrack_select_${interaction.id}`)
            .setPlaceholder('🗑️ Select a track to remove...')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(menu);

        const reply = await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.DEFAULT)
                    .setTitle('🗑️ Remove a Track')
                    .setDescription(
                        `The queue currently has **${tracks.length}** track(s).` +
                        (tracks.length > 25 ? ' Showing the first **25** tracks.' : '') +
                        '\n\nSelect the track you want to remove from the dropdown below.'
                    )
                    .setThumbnail(avatarURL)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
            components: [row],
            fetchReply: true,
        });

        removetrackCache.set(reply.id, { userId: interaction.user.id, guildId: guild.id });
        setTimeout(() => removetrackCache.delete(reply.id), CACHE_TTL_MS);
    },
};

async function handleRemoveTrackSelect(interaction, client) {
    const footer = process.env.FOOTER || 'Dreama';
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;

    const cached = removetrackCache.get(interaction.message.id);

    if (!cached) {
        return interaction.reply({
            content: '❌ This menu has expired. Please run `/removetrack` again.',
            flags: MessageFlags.Ephemeral,
        });
    }

    if (cached.userId !== interaction.user.id) {
        return interaction.reply({
            content: '❌ Only the person who ran this command can use this menu.',
            flags: MessageFlags.Ephemeral,
        });
    }

    const player = client.lavalink.getPlayer(interaction.guildId);

    if (!player || !player.connected) {
        removetrackCache.delete(interaction.message.id);
        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor('FF7F50')
                    .setTitle('❌ Player Disconnected')
                    .setDescription('The player stopped before the track could be removed.')
                    .setThumbnail(avatarURL)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
            components: [],
        });
    }

    const trackIndex = parseInt(interaction.values[0], 10);
    const tracks = player.queue.tracks;

    if (trackIndex >= tracks.length || trackIndex < 0) {
        removetrackCache.delete(interaction.message.id);
        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor('FF7F50')
                    .setTitle('❌ Track No Longer Exists')
                    .setDescription('That track is no longer in the queue.')
                    .setThumbnail(avatarURL)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
            components: [],
        });
    }

    const removed = tracks[trackIndex];
    player.queue.splice(trackIndex, 1);
    await syncNpMessage(player);

    removetrackCache.delete(interaction.message.id);

    return interaction.update({
        embeds: [
            new EmbedBuilder()
                .setColor('50C878')
                .setTitle('🗑️ Track Removed')
                .setDescription(`Removed **[${removed.info.title}](${removed.info.uri})** from the queue.`)
                .addFields(
                    { 
                      name: 'Author', 
                      value: removed.info.author || 'Unknown', 
                      inline: true 
                    },
                    { 
                      name: 'Duration', 
                      value: formatDuration(removed.info.duration), 
                      inline: true 
                    },
                    { 
                      name: 'Was at Position', 
                      value: `${trackIndex + 1}`, 
                      inline: true 
                    },
                )
                .setThumbnail(removed.info.artworkUrl || avatarURL)
                .setFooter({ text: footer })
                .setTimestamp(),
        ],
        components: [],
    });
}

module.exports.handleRemoveTrackSelect = handleRemoveTrackSelect;
