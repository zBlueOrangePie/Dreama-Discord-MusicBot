require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, MessageFlags } = require("discord.js");
const { buildSearchCard } = require("../../utils/searchCard.js");
const { storeSearchData, buildSearchRows, buildDisabledSearchRows } = require("../../utils/searchButtonUtils.js");
const { logger } = require("../../utils/logger.js");

const COLORS = {
    DEFAULT: "FF7F50",
    ERROR: "FF0000",
};

const BUTTON_TIMEOUT_MS = 5 * 60 * 1000;

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
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer = process.env.FOOTER || "Dreama";
        const query = interaction.options.getString("query");

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ Please Join A Voice Channel First!")
                        .setDescription("❌ You need to be in a voice channel to use this command.")
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
                        .setDescription(`❌ I'm already in <#${botVoiceChannel.id}>. Join that channel to use me.`)
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
                        .setDescription("❌ No music nodes are available right now. Please try again later.")
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

        if (!player.connected)
            await player.connect();

        let result;
        try {
            result = await player.search({ query }, interaction.user);
        } catch (err) {
            logger.error("Search failed in /search", err);
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

        if (!result?.tracks?.length || result.loadType === "empty" || result.loadType === "error") {
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

        const tracks = result.tracks.slice(0, 5);

        const imageBuffer = await buildSearchCard(tracks, query).catch(() => null);
        const imageAttachment = imageBuffer ? new AttachmentBuilder(imageBuffer, { name: "search.png" }) : null;

        const searchEmbed = new EmbedBuilder()
            .setColor(COLORS.DEFAULT)
            .setTitle("🔍 Search Results")
            .setDescription(`Showing **${tracks.length}** result(s) for **${query}**.\nSelect a song below or click **Play All** to queue everything.\n\n⏳ These buttons will expire in **5 minutes**.`)
            .setFooter({ text: footer })
            .setTimestamp();

        if (imageAttachment)
            searchEmbed.setImage("attachment://search.png");

        const rows = buildSearchRows(tracks);

        const sendOptions = { embeds: [searchEmbed], components: rows };
        if (imageAttachment)
            sendOptions.files = [imageAttachment];

        const sentMessage = await interaction.editReply(sendOptions);

        storeSearchData(sentMessage.id, { tracks, query });

        setTimeout(async () => {
            await sentMessage.edit({ components: buildDisabledSearchRows(tracks) }).catch(() => null);
        }, BUTTON_TIMEOUT_MS);
    },
};
    
