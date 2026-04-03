require("dotenv").config();
const {
    ContainerBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    SeparatorSpacingSize,
} = require("discord.js");
const { formatDuration } = require("./formatDuration.js");
const { syncNpMessage } = require("./npButtonUtils.js");
const Playlist = require("./database/playlistDb.js");

const TRACKS_PER_PAGE = 10;
const CACHE_TTL_MS    = 10 * 60 * 1000;

const playlistSearchCache = new Map();

function storePlaylistSearchCache(messageId, data) {
    playlistSearchCache.set(messageId, data);
    setTimeout(() => playlistSearchCache.delete(messageId), CACHE_TTL_MS);
}

function getPlaylistSearchCache(messageId) {
    return playlistSearchCache.get(messageId) ?? null;
}

function buildViewComponents(playlist, page, client) {
    const footer     = process.env.FOOTER || "Dreama";
    const avatarURL  = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? "https://cdn.discordapp.com/embed/avatars/0.png";
    const songs      = playlist.songs;
    const total      = songs.length;
    const totalPages = Math.max(1, Math.ceil(total / TRACKS_PER_PAGE));
    const totalDur   = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
    const start      = page * TRACKS_PER_PAGE;
    const slice      = songs.slice(start, start + TRACKS_PER_PAGE);

    let trackList = "No songs have been added to this playlist yet.";

    if (slice.length > 0) {
        trackList = slice.map((s, i) => {
            const pos   = start + i + 1;
            const title = s.title.length > 50 ? s.title.slice(0, 47) + "..." : s.title;
            return `\`${pos}.\` **${title}**\n   ${s.author} · ${formatDuration(s.duration)} · Added by ${s.addedBy}`;
        }).join("\n\n");
    }

    const typeLabel    = playlist.type === "global" ? "🌍 Global" : "🏠 Server";
    const creatorLabel = `${playlist.creatorDisplayName} (@${playlist.creatorUsername})`;

    const infoText = [
        `**Total Songs:** ${total}`,
        `**Total Duration:** ${formatDuration(totalDur)}`,
        `**Type:** ${typeLabel}`,
        `**Created By:** ${creatorLabel}`,
        `\`\`\`Playlist ID: ${playlist.playlistId}\`\`\``,
        `-# ${footer} · Page ${page + 1}/${totalPages}`,
    ].join("\n");

    const container = new ContainerBuilder()
        .setAccentColor(0xFF7F50)
        .addSectionComponents((section) =>
            section
                .addTextDisplayComponents((text) =>
                    text.setContent(
                        `## 📋 ${playlist.name}\n${playlist.description || "No description provided."}`
                    )
                )
                .setThumbnailAccessory((thumb) => thumb.setURL(avatarURL))
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
        )
        .addTextDisplayComponents((text) =>
            text.setContent(`### 🎵 Tracks\n${trackList}`)
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents((text) =>
            text.setContent(infoText)
        );

    if (songs.length > TRACKS_PER_PAGE) {
        container.addActionRowComponents((row) =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`playlist_view_prev:${page}:${playlist.playlistId}`)
                    .setLabel("◀️ Previous")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId("playlist_view_indicator")
                    .setLabel(`Page ${page + 1} / ${totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`playlist_view_next:${page}:${playlist.playlistId}`)
                    .setLabel("Next ▶️")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages - 1)
            )
        );
    }

    return [container];
}

function buildSearchViewComponents(playlist, page, client) {
    const footer     = process.env.FOOTER || "Dreama";
    const avatarURL  = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? "https://cdn.discordapp.com/embed/avatars/0.png";
    const songs      = playlist.songs;
    const total      = songs.length;
    const totalPages = Math.max(1, Math.ceil(total / TRACKS_PER_PAGE));
    const totalDur   = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
    const start      = page * TRACKS_PER_PAGE;
    const slice      = songs.slice(start, start + TRACKS_PER_PAGE);

    let trackList = "No songs have been added to this playlist yet.";

    if (slice.length > 0) {
        trackList = slice.map((s, i) => {
            const pos   = start + i + 1;
            const title = s.title.length > 50 ? s.title.slice(0, 47) + "..." : s.title;
            return `\`${pos}.\` **${title}**\n   ${s.author} · ${formatDuration(s.duration)} · Added by ${s.addedBy}`;
        }).join("\n\n");
    }

    const creatorLabel = `${playlist.creatorDisplayName} (@${playlist.creatorUsername})`;

    const infoText = [
        `**Total Songs:** ${total}`,
        `**Total Duration:** ${formatDuration(totalDur)}`,
        `**Created By:** ${creatorLabel}`,
        `\`\`\`Playlist ID: ${playlist.playlistId}\`\`\``,
        `-# ${footer} · Page ${page + 1}/${totalPages}`,
    ].join("\n");

    const playLabel = `▶️ Play ${playlist.name.length > 20 ? playlist.name.slice(0, 17) + "..." : playlist.name} Now!`;

    const container = new ContainerBuilder()
        .setAccentColor(0xFF7F50)
        .addSectionComponents((section) =>
            section
                .addTextDisplayComponents((text) =>
                    text.setContent(
                        `## 🔍 ${playlist.name}\n${playlist.description || "No description provided."}`
                    )
                )
                .setThumbnailAccessory((thumb) => thumb.setURL(avatarURL))
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Large)
        )
        .addTextDisplayComponents((text) =>
            text.setContent(`### 🎵 Tracks\n${trackList}`)
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents((text) =>
            text.setContent(infoText)
        );

    if (songs.length > TRACKS_PER_PAGE) {
        container.addActionRowComponents((row) =>
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`playlist_srch_prev:${page}:${playlist.playlistId}`)
                    .setLabel("◀️ Previous")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId("playlist_srch_indicator")
                    .setLabel(`Page ${page + 1} / ${totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId(`playlist_srch_next:${page}:${playlist.playlistId}`)
                    .setLabel("Next ▶️")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page >= totalPages - 1)
            )
        );
    }

    container.addActionRowComponents((row) =>
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`playlist_srch_play:${playlist.playlistId}`)
                .setLabel(playLabel)
                .setStyle(ButtonStyle.Success)
        )
    );

    return [container];
}

async function handlePlaylistViewButton(interaction, client) {
    const parts   = interaction.customId.split(":");
    const dir     = parts[0].replace("playlist_view_", "");
    const curPage = parseInt(parts[1], 10);
    const plId    = parts[2];

    const playlist = await Playlist.findOne({ playlistId: plId }).lean();

    if (!playlist) {
        return interaction.reply({
            content: "❌ This playlist no longer exists.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const totalPages = Math.max(1, Math.ceil(playlist.songs.length / TRACKS_PER_PAGE));
    let nextPage = curPage;
    if (dir === "next") nextPage = Math.min(curPage + 1, totalPages - 1);
    if (dir === "prev") nextPage = Math.max(curPage - 1, 0);

    return interaction.update({
        components: buildViewComponents(playlist, nextPage, client),
        flags: MessageFlags.IsComponentsV2,
    });
}

async function handlePlaylistSearchButton(interaction, client) {
    const footer    = process.env.FOOTER || "Dreama";
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? "https://cdn.discordapp.com/embed/avatars/0.png";
    const id        = interaction.customId;

    if (id.startsWith("playlist_srch_play:")) {
        const playlistId = id.replace("playlist_srch_play:", "");
        const playlist   = await Playlist.findOne({ playlistId }).lean();

        if (!playlist || !playlist.songs.length) {
            return interaction.reply({
                embeds: [{
                    color: 0xFF7F50,
                    title: "❌ Cannot Play Playlist",
                    description: "This playlist is empty or no longer exists.",
                    timestamp: new Date().toISOString(),
                    footer: { text: footer },
                }],
                flags: MessageFlags.Ephemeral,
            });
        }

        const voiceChannel = interaction.member.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [{
                    color: 0xFF7F50,
                    title: "‼️ Please Join A Voice Channel First!",
                    description: "You need to be in a voice channel to play this playlist.",
                    thumbnail: { url: avatarURL },
                    timestamp: new Date().toISOString(),
                    footer: { text: footer },
                }],
                flags: MessageFlags.Ephemeral,
            });
        }

        const botVC = interaction.guild.members.me?.voice?.channel;
        if (botVC && botVC.id !== voiceChannel.id) {
            return interaction.reply({
                embeds: [{
                    color: 0xFF7F50,
                    title: "‼️ I'm Already Playing!",
                    description: `I'm already in <#${botVC.id}>. Join that channel to use me.`,
                    thumbnail: { url: avatarURL },
                    timestamp: new Date().toISOString(),
                    footer: { text: footer },
                }],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!client.lavalink.useable) {
            return interaction.reply({
                embeds: [{
                    color: 0xFF7F50,
                    title: "❌ Internal Error Occurred.",
                    description: "No music nodes are available right now. Please try again later.",
                    thumbnail: { url: avatarURL },
                    timestamp: new Date().toISOString(),
                    footer: { text: footer },
                }],
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
        const node  = nodes.find(n => n.connected) || nodes[0];

        if (!node) {
            return interaction.editReply({
                embeds: [{
                    color: 0xFF7F50,
                    title: "❌ No Nodes Available",
                    description: "Cannot resolve tracks right now. Please try again later.",
                    timestamp: new Date().toISOString(),
                    footer: { text: footer },
                }],
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

        const resultContainer = new ContainerBuilder()
            .setAccentColor(0xFF7F50)
            .addSectionComponents((section) =>
                section
                    .addTextDisplayComponents((text) =>
                        text.setContent(
                            `## 📋 Playlist Added to Queue!\n` +
                            `**${playlist.name}** — ${loaded} track(s) loaded into the queue.`
                        )
                    )
                    .setThumbnailAccessory((thumb) => thumb.setURL(avatarURL))
            )
            .addSeparatorComponents((sep) =>
                sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents((text) =>
                text.setContent(`-# ${footer} · Requested by ${interaction.user.username}`)
            );

        return interaction.editReply({
            components: [resultContainer],
            flags: MessageFlags.IsComponentsV2,
        });
    }

    const parts   = id.split(":");
    const dir     = parts[0].includes("prev") ? "prev" : "next";
    const curPage = parseInt(parts[1], 10);
    const plId    = parts[2];

    const playlist = await Playlist.findOne({ playlistId: plId }).lean();

    if (!playlist) {
        return interaction.reply({
            content: "❌ This playlist no longer exists.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const totalPages = Math.max(1, Math.ceil(playlist.songs.length / TRACKS_PER_PAGE));
    let nextPage = curPage;
    if (dir === "next") nextPage = Math.min(curPage + 1, totalPages - 1);
    if (dir === "prev") nextPage = Math.max(curPage - 1, 0);

    return interaction.update({
        components: buildSearchViewComponents(playlist, nextPage, client),
        flags: MessageFlags.IsComponentsV2,
    });
}

module.exports = {
    storePlaylistSearchCache,
    getPlaylistSearchCache,
    buildViewComponents,
    buildSearchViewComponents,
    handlePlaylistViewButton,
    handlePlaylistSearchButton,
    TRACKS_PER_PAGE,
};
