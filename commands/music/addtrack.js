require('dotenv').config();
const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
    MessageFlags,
} = require('discord.js');
const { formatDuration } = require('../../utils/formatDuration.js');
const { syncNpMessage } = require('../../utils/npButtonUtils.js');
const { logger } = require('../../utils/logger.js');

const CACHE_TTL_MS = 3 * 60 * 1000;
const addtrackCache = new Map();

const COLORS = {
    DEFAULT: 'FF7F50',
    SUCCESS: '50C878',
    ERROR: 'FF7F50',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addtrack')
        .setDescription('Add a song to the queue at a specific position.')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('Song name or URL to search for.')
                .setRequired(true)
        ),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer = process.env.FOOTER || 'Dreama';
        const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;
        const query = interaction.options.getString('query');

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

        const botVoiceChannel = guild.members.me?.voice?.channel;
        if (botVoiceChannel && botVoiceChannel.id !== voiceChannel.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ I'm Already Playing!")
                        .setDescription(`I'm already in <#${botVoiceChannel.id}>. Join that channel to use me.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!client.lavalink.useable) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('❌ Internal Error Occurred.')
                        .setDescription('No music nodes are available right now. Please try again later.')
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply();

        const player = client.lavalink.createPlayer({
            guildId: guild.id,
            voiceChannelId: voiceChannel.id,
            textChannelId: interaction.channel.id,
            selfDeaf: true,
        });

        if (!player.connected) await player.connect();

        let result;
        try {
            result = await player.search({ query }, interaction.user);
        } catch (err) {
            logger.error('Search failed in /addtrack', err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('❌ Search Failed')
                        .setDescription(`Could not retrieve results for **${query}**.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        if (!result?.tracks?.length || result.loadType === 'empty' || result.loadType === 'error') {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('❌ No Results Found')
                        .setDescription(`No results found for **${query}**.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        const track = result.tracks[0];
        const queueTracks = player.queue.tracks;
        const queueLength = queueTracks.length;

        const maxOptions = 25;
        const optionCount = Math.min(queueLength + 1, maxOptions);

        const options = [];

        for (let i = 1; i <= optionCount; i++) {
            let label;
            let description;

            if (i === 1 && queueLength > 0) {
                const nextTitle = queueTracks[0].info.title;
                label = `Position 1 — Play Next`;
                description = `Before: ${nextTitle.slice(0, 60)}`;
            } else if (i > queueLength) {
                label = `Position ${i} — End of Queue`;
                description = 'Add after all current tracks';
            } else {
                const atTitle = queueTracks[i - 1]?.info?.title ?? '';
                label = `Position ${i}`;
                description = `Before: ${atTitle.slice(0, 60)}`;
            }

            options.push({
                label: label.slice(0, 100),
                description: description.slice(0, 100),
                value: `${i}`,
            });
        }

        if (queueLength === 0) {
            options.push({
                label: 'Position 1 — Add to Queue',
                description: 'Queue is currently empty',
                value: '1',
            });
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId(`addtrack_pos_${interaction.id}`)
            .setPlaceholder('📍 Select a position to insert the track...')
            .addOptions(options.length ? options : [{ label: 'Position 1', value: '1', description: 'Add to queue' }]);

        const row = new ActionRowBuilder().addComponents(menu);

        const reply = await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.DEFAULT)
                    .setTitle('📍 Choose an Insert Position')
                    .setDescription(`Found **[${track.info.title}](${track.info.uri})**\nBy **${track.info.author || 'Unknown'}** • ${formatDuration(track.info.duration)}\n\nSelect where you want to insert this track in the queue.`)
                    .setThumbnail(track.info.artworkUrl || avatarURL)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
            components: [row],
        });

        addtrackCache.set(reply.id, { userId: interaction.user.id, track });
        setTimeout(() => addtrackCache.delete(reply.id), CACHE_TTL_MS);
    },
};

async function handleAddTrackSelect(interaction, client) {
    const footer = process.env.FOOTER || 'Dreama';
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;

    const cached = addtrackCache.get(interaction.message.id);

    if (!cached) {
        return interaction.reply({
            content: '❌ This menu has expired. Please run `/addtrack` again.',
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
        addtrackCache.delete(interaction.message.id);
        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor('FF7F50')
                    .setTitle('❌ Player Disconnected')
                    .setDescription('The player stopped before the track could be added.')
                    .setThumbnail(avatarURL)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
            components: [],
        });
    }

    const position = parseInt(interaction.values[0], 10);
    const { track } = cached;
    const insertIndex = position - 1;

    const currentQueueLength = player.queue.tracks.length;
    const clampedIndex = Math.min(Math.max(insertIndex, 0), currentQueueLength);

    if (clampedIndex === currentQueueLength) {
        await player.queue.add(track);
    } else {
        player.queue.tracks.splice(clampedIndex, 0, track);
    }

    const wasPlaying = player.playing || player.paused;
    if (!wasPlaying) {
        await player.play();
    } else {
        await syncNpMessage(player);
    }

    addtrackCache.delete(interaction.message.id);

    return interaction.update({
        embeds: [
            new EmbedBuilder()
                .setColor('FF7F50')
                .setTitle('✅ Track Added to Queue')
                .setDescription(`**[${track.info.title}](${track.info.uri})**`)
                .addFields(
                    { 
                      name: 'Author', 
                      value: track.info.author || 'Unknown', 
                      inline: true 
                    },
                    { 
                      name: 'Duration', 
                      value: formatDuration(track.info.duration), 
                      inline: true 
                    },
                    { 
                      name: 'Inserted at Position', 
                      value: `${clampedIndex + 1}`, 
                      inline: true 
                    },
                )
                .setThumbnail(track.info.artworkUrl || avatarURL)
                .setFooter({ text: footer })
                .setTimestamp(),
        ],
        components: [],
    });
}

module.exports.handleAddTrackSelect = handleAddTrackSelect;
