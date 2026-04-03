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

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR:   "FF0000",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("playnext")
        .setDescription("Queue a song to play immediately after the current track.")
        .addStringOption(option =>
            option
                .setName("query")
                .setDescription("Song name or URL to search for.")
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
                        .setDescription("There is no active player in this server. Use `/play` to start one first.")
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

        await interaction.deferReply();

        let result;
        try {
            result = await player.search({ query }, interaction.user);
        } catch (err) {
            logger.error("Search failed in /playnext", err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Search Failed")
                        .setDescription(`Could not retrieve results for **${query}**.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        if (!result?.tracks?.length || result.loadType === "empty" || result.loadType === "error") {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ No Results Found")
                        .setDescription(`No results found for **${query}**.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        const track = result.tracks[0];

        // Insert the track at position 0 of the upcoming queue (right after current)
        player.queue.tracks.unshift(track);

        await syncNpMessage(player);

        const thumbnailUrl = track.info.artworkUrl || avatarURL;

        const container = new ContainerBuilder()
            .setAccentColor(0x50C878)
            .addSectionComponents((section) =>
                section
                    .addTextDisplayComponents((text) =>
                        text.setContent(
                            `## ⏩ Playing Next!\n**[${track.info.title}](${track.info.uri})**`
                        )
                    )
                    .setThumbnailAccessory((thumb) => thumb.setURL(thumbnailUrl))
            )
            .addSeparatorComponents((sep) =>
                sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents((text) =>
                text.setContent(
                    `**Author:** ${track.info.author || "Unknown"}   ·   ` +
                    `**Duration:** ${formatDuration(track.info.duration)}   ·   ` +
                    `**Requested by:** ${interaction.user}\n` +
                    `-# ${footer} · This track will play right after the current one.`
                )
            );

        return interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
