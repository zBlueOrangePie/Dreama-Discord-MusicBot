require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder, ContainerBuilder, MessageFlags, SeparatorSpacingSize } = require("discord.js");
const { formatDuration } = require("../../utils/formatDuration.js");
const { syncNpMessage } = require("../../utils/npButtonUtils.js");
const { logger } = require("../../utils/logger.js");
const GuildConfig = require("../../utils/database/configDb.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR: "FF0000",
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
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer = process.env.FOOTER || "Dreama";
        const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? "https://cdn.discordapp.com/embed/avatars/0.png";

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ Please Join A Voice Channel First!")
                        .setDescription("Dreama says that you need to be in a voice channel to use this command.")
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

        const guildConfig = await GuildConfig.findOne({ guildId: guild.id });
        if (guildConfig?.musicVoice && voiceChannel.id !== guildConfig.musicVoice) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ Wrong Voice Channel!")
                        .setDescription(`Dreama is configured to only play music in <#${guildConfig.musicVoice}>. Please join that voice channel.`)
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
                        .setTitle("❌ Internal Error Occurred.")
                        .setDescription("No music nodes are available right now. Please try again later.")
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

        const query = interaction.options.getString("query");

        if (URL_REGEX.test(query)) {
            const isSupported = SUPPORTED_URL_PATTERNS.some(p => p.test(query));
            if (!isSupported) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Unsupported Platform!")
                            .setDescription(
                                "The URL you provided is not from a supported platform.\n\n" +
                                "**Supported platforms:** YouTube, SoundCloud, Deezer, Spotify, Twitch, Vimeo\n\n" +
                                "Try using a search query instead or a link from a supported platform."
                            )
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                });
            }
        }

        let result;
        try {
            result = await player.search({ query }, interaction.user);
        } catch (err) {
            logger.error("Search failed in /play", err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Search Failed")
                        .setDescription(`Could not retrieve results for **${query}**. The source may be unavailable, unsupported, or rate-limited by the Lavalink server.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        if (result.loadType === "empty" || !result.tracks.length) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Search Failed")
                        .setDescription(`No results found for **${query}**.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        if (result.loadType === "error") {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ An Error Occurred!")
                        .setDescription("An error occurred while searching. Please try again.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        const wasPlaying = player.playing || player.paused;

        if (result.loadType === "playlist") {
            await player.queue.add(result.tracks);
            if (wasPlaying) await syncNpMessage(player);

            const playlistThumb = result.tracks[0]?.info?.artworkUrl || avatarURL;

            const container = new ContainerBuilder()
                .setAccentColor(0xFF7F50)
                .addSectionComponents((section) =>
                    section
                        .addTextDisplayComponents((text) =>
                            text.setContent(
                                `## 📋 Playlist Added to Queue!\n**[${result.playlist.name}](${query})**`
                            )
                        )
                        .setThumbnailAccessory((thumb) => thumb.setURL(playlistThumb))
                )
                .addSeparatorComponents((sep) =>
                    sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents((text) =>
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

        const track = result.tracks[0];
        await player.queue.add(track);

        if (wasPlaying) {
            await syncNpMessage(player);

            const thumbnailUrl = track.info.artworkUrl || avatarURL;

            const container = new ContainerBuilder()
                .setAccentColor(0xFF7F50)
                .addSectionComponents((section) =>
                    section
                        .addTextDisplayComponents((text) =>
                            text.setContent(
                                `## 🎵 Added to Queue!\n**[${track.info.title}](${track.info.uri})**`
                            )
                        )
                        .setThumbnailAccessory((thumb) => thumb.setURL(thumbnailUrl))
                )
                .addSeparatorComponents((sep) =>
                    sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents((text) =>
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

        await interaction.deleteReply().catch(() => null);
        await player.play();
    },
};
