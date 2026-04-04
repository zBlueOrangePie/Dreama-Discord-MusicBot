require("dotenv").config();
const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
    MessageFlags,
} = require("discord.js");
const { buildSearchCard } = require("../../utils/searchCard.js");
const { storeSearchData, buildSearchRows, buildDisabledSearchRows } = require("../../utils/searchButtonUtils.js");
const { logger } = require("../../utils/logger.js");
const GuildConfig = require("../../utils/database/configDb.js");

const COLORS = {
    DEFAULT: "FF7F50",
    ERROR:   "FF0000",
};

const BUTTON_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

module.exports = {
    data: new SlashCommandBuilder()
        .setName("search")
        .setDescription("Search for songs and choose what you want to play.")
        .addStringOption(option =>
            option
                .setName("query")
                .setDescription("Song name to search for.")
                .setRequired(true)
        ),

    async execute(interaction) {
        const client       = interaction.client;
        const member       = interaction.member;
        const guild        = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer       = process.env.FOOTER || "Dreama";
        const query        = interaction.options.getString("query");

        // ── Pre-defer validation ──────────────────────────────────────────────

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

        // Re-use the GuildConfig already fetched by interactionCreate.js so we
        // don't burn a second DB round-trip before deferReply is called.
        const guildConfig = interaction._guildConfig
            ?? await GuildConfig.findOne({ guildId: guild.id }).catch(() => null);

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
                        .setTitle("❌ No Nodes Available")
                        .setDescription("No music nodes are available right now. Please try again later.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        // ── Defer ─────────────────────────────────────────────────────────────
        // Everything past this point must use editReply(), not reply().

        await interaction.deferReply();

        // ── Player setup ──────────────────────────────────────────────────────

        const player = client.lavalink.createPlayer({
            guildId:        guild.id,
            voiceChannelId: voiceChannel.id,
            textChannelId:  interaction.channel.id,
            selfDeaf:       true,
        });

        if (!player.connected) await player.connect();

        // ── Search ────────────────────────────────────────────────────────────

        let result;
        try {
            result = await player.search({ query }, interaction.user);
        } catch (err) {
            logger.error("[Search] Search failed", err);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Search Failed")
                        .setDescription(
                            `Could not retrieve results for **${query}**.\n` +
                            "The source may be unavailable or rate-limited by the Lavalink server."
                        )
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        if (result.loadType === "error" || !result?.tracks?.length || result.loadType === "empty") {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ No Results Found")
                        .setDescription(`No results were found for **${query}**.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        // ── Build and send the result card ────────────────────────────────────

        const tracks = result.tracks.slice(0, 5);

        // Build the visual search card image. If canvas fails for any reason,
        // imageBuffer is null and we fall back to a text-only embed.
        const imageBuffer     = await buildSearchCard(tracks, query).catch(() => null);
        const imageAttachment = imageBuffer
            ? new AttachmentBuilder(imageBuffer, { name: "search.png" })
            : null;

        const searchEmbed = new EmbedBuilder()
            .setColor(COLORS.DEFAULT)
            .setTitle("🔍 Search Results")
            .setDescription(
                `Showing **${tracks.length}** result(s) for **${query}**.\n` +
                "Select a song below, click **Play All** to queue everything, " +
                "or click **Cancel** to dismiss.\n\n" +
                "⏳ These buttons expire in **5 minutes**."
            )
            .setFooter({ text: footer })
            .setTimestamp();

        if (imageAttachment) searchEmbed.setImage("attachment://search.png");

        const rows = buildSearchRows(tracks);

        const replyOptions = { embeds: [searchEmbed], components: rows };
        if (imageAttachment) replyOptions.files = [imageAttachment];

        const sentMessage = await interaction.editReply(replyOptions);

        // Store the track list so the button handler can access it later.
        storeSearchData(sentMessage.id, { tracks, query });

        // After the timeout, disable all buttons so users get clear visual
        // feedback that the search session has expired.
        setTimeout(async () => {
            await sentMessage.edit({ components: buildDisabledSearchRows(tracks) }).catch(() => null);
        }, BUTTON_TIMEOUT_MS);
    },
};
