require('dotenv').config();
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, } = require('discord.js');
const { formatDuration } = require('./formatDuration.js');
const { syncNpMessage } = require('./npButtonUtils.js');
const Playlist = require('./database/playlistDb.js');

const TRACKS_PER_PAGE = 10;
const CACHE_TTL_MS = 10 * 60 * 1000;

const playlistSearchCache = new Map();

function storePlaylistSearchCache(messageId, data) {
    playlistSearchCache.set(messageId, data);
    setTimeout(() => playlistSearchCache.delete(messageId), CACHE_TTL_MS);
}

function getPlaylistSearchCache(messageId) {
    return playlistSearchCache.get(messageId) ?? null;
}

function buildViewButtons(currentPage, totalPages, playlistId) {
    const prev = new ButtonBuilder()
        .setCustomId(`playlist_view_prev:${currentPage}:${playlistId}`)
        .setLabel('◀️ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0);

    const indicator = new ButtonBuilder()
        .setCustomId('playlist_view_indicator')
        .setLabel(`Page ${currentPage + 1} / ${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

    const next = new ButtonBuilder()
        .setCustomId(`playlist_view_next:${currentPage}:${playlistId}`)
        .setLabel('Next ▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages - 1);

    return new ActionRowBuilder().addComponents(prev, indicator, next);
}

function buildViewEmbed(playlist, page, client) {
    const footer = process.env.FOOTER || 'Dreama';
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;
    const songs = playlist.songs;
    const total = songs.length;
    const totalPages = Math.max(1, Math.ceil(total / TRACKS_PER_PAGE));
    const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);

    const start = page * TRACKS_PER_PAGE;
    const slice = songs.slice(start, start + TRACKS_PER_PAGE);

    let trackList = 'No songs have been added to this playlist yet.';

    if (slice.length > 0) {
        trackList = slice.map((s, i) => {
            const pos = start + i + 1;
            const title = s.title.length > 50 ? s.title.slice(0, 47) + '...' : s.title;
            return `\`${pos}.\` **${title}**\n   ${s.author} • ${formatDuration(s.duration)} • Added by ${s.addedBy}`;
        }).join('\n\n');
    }

    const embed = new EmbedBuilder()
        .setColor('FF7F50')
        .setTitle(`📋 ${playlist.name}`)
        .setDescription(playlist.description || 'No description provided.')
        .addFields(
            { 
              name: '🎵 Tracks', 
              value: trackList || 'No tracks.', 
              inline: false 
            },
            { 
              name: 'Total Songs', 
              value: `${total}`, 
              inline: true 
            },
            { 
              name: 'Total Duration', 
              value: formatDuration(totalDuration), 
              inline: true 
            },
            { 
              name: 'Type', 
              value: playlist.type === 'global' ? '🌍 Global' : '🏠 Server', 
              inline: true 
            },
            { 
              name: 'Created By', 
              value: `${playlist.creatorDisplayName} (@${playlist.creatorUsername})`, 
              inline: true 
            },
        )
        .setFooter({ text: `${footer} • Playlist ID: ${playlist.playlistId} • Page ${page + 1}/${totalPages}` })
        .setTimestamp();

    if (avatarURL) embed.setThumbnail(avatarURL);

    return embed;
}

function buildSearchViewEmbed(playlist, page, client) {
    const footer = process.env.FOOTER || 'Dreama';
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;
    const songs = playlist.songs;
    const total = songs.length;
    const totalPages = Math.max(1, Math.ceil(total / TRACKS_PER_PAGE));
    const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);

    const start = page * TRACKS_PER_PAGE;
    const slice = songs.slice(start, start + TRACKS_PER_PAGE);

    let trackList = 'No songs have been added to this playlist yet.';

    if (slice.length > 0) {
        trackList = slice.map((s, i) => {
            const pos = start + i + 1;
            const title = s.title.length > 50 ? s.title.slice(0, 47) + '...' : s.title;
            return `\`${pos}.\` **${title}**\n   ${s.author} • ${formatDuration(s.duration)} • Added by ${s.addedBy}`;
        }).join('\n\n');
    }

    const embed = new EmbedBuilder()
        .setColor('FF7F50')
        .setTitle(`🔍 ${playlist.name}`)
        .setDescription(playlist.description || 'No description provided.')
        .addFields(
            { 
              name: '🎵 Tracks', 
              value: trackList || 'No tracks.', 
              inline: false 
            },
            { 
              name: 'Total Songs', 
              value: `${total}`, 
              inline: true 
            },
            { 
              name: 'Total Duration', 
              value: formatDuration(totalDuration), 
              inline: true 
            },
            { 
              name: 'Created By', 
              value: `${playlist.creatorDisplayName} (@${playlist.creatorUsername})`, 
              inline: true 
            },
        )
        .setFooter({ text: `${footer} • Playlist ID: ${playlist.playlistId} • Page ${page + 1}/${totalPages}` })
        .setTimestamp();

    if (avatarURL) embed.setThumbnail(avatarURL);

    return embed;
}

function buildSearchNavButtons(currentPage, totalPages, playlistId) {
    const components = [];

    if (totalPages > 1) {
        const prev = new ButtonBuilder()
            .setCustomId(`playlist_srch_prev:${currentPage}:${playlistId}`)
            .setLabel('◀️ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0);

        const indicator = new ButtonBuilder()
            .setCustomId('playlist_srch_indicator')
            .setLabel(`Page ${currentPage + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const next = new ButtonBuilder()
            .setCustomId(`playlist_srch_next:${currentPage}:${playlistId}`)
            .setLabel('Next ▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= totalPages - 1);

        components.push(new ActionRowBuilder().addComponents(prev, indicator, next));
    }

    return components;
}

function buildPlayButton(playlistId, playlistName) {
    const label = `▶️ Play ${playlistName.length > 20 ? playlistName.slice(0, 17) + '...' : playlistName} Now!!`;

    const playBtn = new ButtonBuilder()
        .setCustomId(`playlist_srch_play:${playlistId}`)
        .setLabel(label)
        .setStyle(ButtonStyle.Success);

    return new ActionRowBuilder().addComponents(playBtn);
}

async function handlePlaylistViewButton(interaction, client) {
    const footer = process.env.FOOTER || 'Dreama';
    const id = interaction.customId;

    const parts = id.split(':');
    const direction = parts[0].replace('playlist_view_', '');
    const currentPage = parseInt(parts[1], 10);
    const playlistId = parts[2];

    const playlist = await Playlist.findOne({ playlistId }).lean();

    if (!playlist) {
        return interaction.reply({
            content: '❌ This playlist no longer exists.',
            flags: MessageFlags.Ephemeral,
        });
    }

    const totalPages = Math.max(1, Math.ceil(playlist.songs.length / TRACKS_PER_PAGE));

    let nextPage = currentPage;
    if (direction === 'next') nextPage = Math.min(currentPage + 1, totalPages - 1);
    if (direction === 'prev') nextPage = Math.max(currentPage - 1, 0);

    const embed = buildViewEmbed(playlist, nextPage, client);

    const components = [];
    if (playlist.songs.length > TRACKS_PER_PAGE) {
        components.push(buildViewButtons(nextPage, totalPages, playlistId));
    }

    return interaction.update({ embeds: [embed], components });
}

async function handlePlaylistSearchButton(interaction, client) {
    const footer = process.env.FOOTER || 'Dreama';
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;
    const id = interaction.customId;

    if (id.startsWith('playlist_srch_play:')) {
        const playlistId = id.replace('playlist_srch_play:', '');

        const playlist = await Playlist.findOne({ playlistId }).lean();

        if (!playlist || !playlist.songs.length) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('FF7F50')
                        .setTitle('❌ Cannot Play Playlist')
                        .setDescription('This playlist is empty or no longer exists.')
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const voiceChannel = interaction.member.voice?.channel;

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('FF7F50')
                        .setTitle('‼️ Please Join A Voice Channel First!')
                        .setDescription('You need to be in a voice channel to play this playlist.')
                        .setFooter({ text: footer })
                        .setThumbnail(avatarURL)
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const botVoiceChannel = interaction.guild.members.me?.voice?.channel;
        if (botVoiceChannel && botVoiceChannel.id !== voiceChannel.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('FF7F50')
                        .setTitle("‼️ I'm Already Playing!")
                        .setDescription(`I'm already in <#${botVoiceChannel.id}>. Join that channel to use me.`)
                        .setFooter({ text: footer })
                        .setThumbnail(avatarURL)
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!client.lavalink.useable) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('FF7F50')
                        .setTitle('❌ Internal Error Occurred.')
                        .setDescription('No music nodes are available right now. Please try again later.')
                        .setFooter({ text: footer })
                        .setThumbnail(avatarURL)
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply();

        const player = client.lavalink.createPlayer({
            guildId: interaction.guildId,
            voiceChannelId: voiceChannel.id,
            textChannelId: interaction.channelId,
            selfDeaf: true,
        });

        if (!player.connected) await player.connect();

        const nodes = [...client.lavalink.nodeManager.nodes.values()];
        const node = nodes.find(n => n.connected) || nodes[0];

        if (!node) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('FF7F50')
                        .setTitle('❌ No Nodes Available')
                        .setDescription('Cannot resolve tracks right now. Please try again later.')
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        const wasPlaying = player.playing || player.paused;
        let loaded = 0;

        for (const song of playlist.songs) {
            try {
                const res = await node.search({ query: song.uri }, interaction.user);
                if (res?.tracks?.length) {
                    await player.queue.add(res.tracks[0]);
                    loaded++;
                }
            } catch { /* skip failed tracks */ }
        }

        if (!wasPlaying && loaded > 0) await player.play();
        else if (wasPlaying) await syncNpMessage(player);

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor('FF7F50')
                    .setTitle('📋 Playlist Added to Queue')
                    .setDescription(`**${playlist.name}** — ${loaded} track(s) loaded into the queue.`)
                    .setThumbnail(avatarURL)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
        });
    }

    const parts = id.split(':');
    const direction = parts[0].includes('prev') ? 'prev' : 'next';
    const currentPage = parseInt(parts[1], 10);
    const playlistId = parts[2];

    const playlist = await Playlist.findOne({ playlistId }).lean();

    if (!playlist) {
        return interaction.reply({
            content: '❌ This playlist no longer exists.',
            flags: MessageFlags.Ephemeral,
        });
    }

    const totalPages = Math.max(1, Math.ceil(playlist.songs.length / TRACKS_PER_PAGE));

    let nextPage = currentPage;
    if (direction === 'next') nextPage = Math.min(currentPage + 1, totalPages - 1);
    if (direction === 'prev') nextPage = Math.max(currentPage - 1, 0);

    const embed = buildSearchViewEmbed(playlist, nextPage, client);
    const navRows = buildSearchNavButtons(nextPage, totalPages, playlistId);
    const playRow = buildPlayButton(playlistId, playlist.name);

    return interaction.update({ 
       embeds: [embed], 
       components: [...navRows, playRow] 
      });
}

module.exports = {
    storePlaylistSearchCache,
    getPlaylistSearchCache,
    buildViewEmbed,
    buildViewButtons,
    buildSearchViewEmbed,
    buildSearchNavButtons,
    buildPlayButton,
    handlePlaylistViewButton,
    handlePlaylistSearchButton,
    TRACKS_PER_PAGE,
};
