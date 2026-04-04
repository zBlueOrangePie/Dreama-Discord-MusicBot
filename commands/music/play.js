require("dotenv").config();
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ContainerBuilder,
    MessageFlags,
    SeparatorSpacingSize,
} = require("discord.js");
const { formatDuration } = require("../../utils/formatDuration.js");
const { syncNpMessage } = require("../../utils/npButtonUtils.js");
const { logger } = require("../../utils/logger.js");
const GuildConfig = require("../../utils/database/configDb.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR:   "FF0000",
};

const SUPPORTED_URL_PATTERNS = [
    /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i,
    /^https?:\/\/(www\.)?soundcloud\.com/i,
    /^https?:\/\/(www\.)?deezer\.com/i,
    /^https?:\/\/open\.spotify\.com/i,
    /^https?:\/\/(www\.)?twitch\.tv/i,
    /^https?:\/\/(www\.)?vimeo\.com/i,
];

const URL_REGEX = /^https?:\/\//i;

// Builds a quick ephemeral error reply before deferring.
function replyError(interaction, title, description, footer) {
    return interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle(title)
                .setDescription(description)
                .setFooter({ text: footer })
                .setTimestamp(),
        ],
        flags: MessageFlags.Ephemeral,
    });
}

// Builds a deferred error reply after deferring (edits the "thinking" message).
function editError(interaction, title, description, footer) {
    return interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle(title)
                .setDescription(description)
                .setFooter({ text: footer })
                .setTimestamp(),
        ],
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song or playlist from a search query or URL.")
        .addStringOption(option =>
            option
                .setName("query")
                .setDescription("Song name or direct URL")
                .setRequired(true)
        ),

    async execute(interaction) {
        const client       = interaction.client;
        const member       = interaction.member;
        const guild        = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer       = process.env.FOOTER || "Dreama";
        const avatarURL    = client?.user?.displayAvatarURL({ dynamic: true, size: 256 })
            ?? "https://cdn.discordapp.com/embed/avatars/0.png";
        const query        = interaction.options.getString("query");

        // ── Pre-defer validation (these must use reply(), not editReply()) ───

        if (!voiceChannel) {
            return replyError(
                interaction,
                "‼️ Please Join A Voice Channel First!",
                "You need to be in a voice channel to use this command.",
                footer,
            );
        }

        const botVoiceChannel = guild.members.me?.voice?.channel;
        if (botVoiceChannel && botVoiceChannel.id !== voiceChannel.id) {
            return replyError(
                interaction,
                "‼️ I'm Already Playing!",
                `I'm already in <#${botVoiceChannel.id}>. Join that channel to use me.`,
                footer,
            );
        }

        // Re-use the GuildConfig already fetched by interactionCreate.js so we
        // don't burn a second DB round-trip before deferReply is called.
        const guildConfig = interaction._guildConfig
            ?? await GuildConfig.findOne({ guildId: guild.id }).catch(() => null);

        if (guildConfig?.musicVoice && voiceChannel.id !== guildConfig.musicVoice) {
            return replyError(
                interaction,
                "‼️ Wrong Voice Channel!",
                `Dreama is configured to only play music in <#${guildConfig.musicVoice}>. Please join that voice channel.`,
                footer,
            );
        }

        if (!client.lavalink.useable) {
            return replyError(
                interaction,
                "❌ No Nodes Available",
                "No music nodes are available right now. Please try again later.",
                footer,
            );
        }

        // ── Defer ────────────────────────────────────────────────────────────
        // Everything past this point must use editReply(), not reply().

        await interaction.deferReply();

        // ── Player setup ─────────────────────────────────────────────────────

        const player = client.lavalink.createPlayer({
            guildId:        guild.id,
            voiceChannelId: voiceChannel.id,
            textChannelId:  interaction.channel.id,
            selfDeaf:       true,
        });

        if (!player.connected) await player.connect();

        // ── URL validation ───────────────────────────────────────────────────

        if (URL_REGEX.test(query)) {
            const isSupported = SUPPORTED_URL_PATTERNS.some(p => p.test(query));
            if (!isSupported) {
                return editError(
                    interaction,
                    "❌ Unsupported Platform!",
                    "The URL you provided is not from a supported platform.\n\n" +
                    "**Supported platforms:** YouTube, SoundCloud, Deezer, Spotify, Twitch, Vimeo\n\n" +
                    "Try a search query or a link from a supported platform.",
                    footer,
                );
            }
        }

        // ── Search ───────────────────────────────────────────────────────────

        let result;
        try {
            result = await player.search({ query }, interaction.user);
        } catch (err) {
            logger.error("[Play] Search failed", err);
            return editError(
                interaction,
                "❌ Search Failed",
                `Could not retrieve results for **${query}**. The source may be unavailable or rate-limited.`,
                footer,
            );
        }

        if (result.loadType === "error") {
            return editError(
                interaction,
                "❌ Load Error",
                "An error occurred while loading the track. Please try again.",
                footer,
            );
        }

        if (result.loadType === "empty" || !result.tracks?.length) {
            return editError(
                interaction,
                "❌ No Results Found",
                `No results were found for **${query}**.`,
                footer,
            );
        }

        // ── Queue and respond ─────────────────────────────────────────────────

        const wasPlaying = player.playing || player.paused;

        // ── Playlist ──────────────────────────────────────────────────────────
        if (result.loadType === "playlist") {
            await player.queue.add(result.tracks);
            if (wasPlaying) await syncNpMessage(player);
            if (!wasPlaying) await player.play();

            const playlistThumb = result.tracks[0]?.info?.artworkUrl || avatarURL;

            const container = new ContainerBuilder()
                .setAccentColor(0x50C878)
                .addSectionComponents(section =>
                    section
                        .addTextDisplayComponents(text =>
                            text.setContent(
                                `## 📋 Playlist Added to Queue!\n**[${result.playlist.name}](${query})**`
                            )
                        )
                        .setThumbnailAccessory(thumb => thumb.setURL(playlistThumb))
                )
                .addSeparatorComponents(sep =>
                    sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(text =>
                    text.setContent(
                        `**Tracks:** ${result.tracks.length}\n` +
                        `**Requested by:** ${interaction.user}\n-# ${footer}`
                    )
                );

            return interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        // ── Single track ───────────────────────────────────────────────────────
        const track = result.tracks[0];
        await player.queue.add(track);

        // Already playing — show "Added to Queue" and update the NP card.
        if (wasPlaying) {
            await syncNpMessage(player);

            const thumbnailUrl = track.info.artworkUrl || avatarURL;

            const container = new ContainerBuilder()
                .setAccentColor(0xFF7F50)
                .addSectionComponents(section =>
                    section
                        .addTextDisplayComponents(text =>
                            text.setContent(
                                `## 🎵 Added to Queue!\n**[${track.info.title}](${track.info.uri})**`
                            )
                        )
                        .setThumbnailAccessory(thumb => thumb.setURL(thumbnailUrl))
                )
                .addSeparatorComponents(sep =>
                    sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents(text =>
                    text.setContent(
                        `**Author:** ${track.info.author || "Unknown"}\n` +
                        `**Duration:** ${formatDuration(track.info.duration)}\n` +
                        `**Requested by:** ${interaction.user}\n-# ${footer}`
                    )
                );

            return interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        // Not playing — the trackStart event will send the full NP card.
        // We delete the deferred reply so it doesn't linger above the NP card.
        // If deletion fails for any reason we fall back to an editReply so the
        // "thinking..." state is always resolved and never left hanging.
        try {
            await interaction.deleteReply();
        } catch (err) {
            logger.error("[Play] deleteReply failed, falling back to editReply", err);
            await interaction.editReply({ content: "▶️ Starting playback..." }).catch(() => null);
        }

        await player.play();
    },
};
