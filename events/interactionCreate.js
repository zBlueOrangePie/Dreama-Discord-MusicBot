const { Events, MessageFlags, EmbedBuilder } = require("discord.js");
const { errorEmbed1, errorEmbed2 } = require("../utils/embedHandler.js");
const { handleNpButton } = require("../utils/npButtonUtils.js");
const { handleQueueButton } = require("../utils/queueButtonUtils.js");
const { handleSearchButton } = require("../utils/searchButtonUtils.js");
const { handleRecommendSelect } = require("../utils/recommendButtonUtils.js");
const { handlePlaylistViewButton, handlePlaylistSearchButton } = require("../utils/playlistButtonUtils.js");
const { handleRemoveTrackSelect } = require("../commands/music/removetrack.js");
const { handleAddTrackSelect } = require("../commands/music/addtrack.js");
const GuildConfig = require("../utils/database/configDb.js");

const NP_BUTTON_IDS = ["np_pause_resume", "np_skip", "np_stop", "np_repeat", "np_autoplay"];
const QUEUE_BUTTON_PREFIX = "queue_";
const SEARCH_BUTTON_PREFIX = "search_track_";
const PLAYLIST_VIEW_PREFIX = "playlist_view_";
const PLAYLIST_SRCH_PREFIX = "playlist_srch_";

const MUSIC_COMMANDS = new Set([
    "play",
    "stop",
    "pause",
    "resume",
    "queue",
    "filter",
    "autoplay",
    "volume",
    "search",
    "skip",
    "seek",
    "skipto",
    "recent",
    "rewind",
    "forward",
    "recommend",
    "removetrack",
    "addtrack",
    "clearqueue",
    "join",
]);

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        const client = interaction.client;

        if (interaction.isStringSelectMenu()) {
            const id = interaction.customId;

            if (id === "recommend_genre") {
                return handleRecommendSelect(interaction, client);
            }

            if (id.startsWith("removetrack_select_")) {
                return handleRemoveTrackSelect(interaction, client);
            }

            if (id.startsWith("addtrack_pos_")) {
                return handleAddTrackSelect(interaction, client);
            }

            return;
        }

        if (interaction.isButton()) {
            const id = interaction.customId;

            if (NP_BUTTON_IDS.includes(id)) {
                return handleNpButton(interaction, client);
            }

            if (id.startsWith(QUEUE_BUTTON_PREFIX) && !id.startsWith("queue_page_indicator")) {
                return handleQueueButton(interaction, client);
            }

            if (id.startsWith(SEARCH_BUTTON_PREFIX) || id === "search_track_all" || id === "search_cancel") {
                return handleSearchButton(interaction, client);
            }

            if (id.startsWith(PLAYLIST_VIEW_PREFIX) && !id.startsWith("playlist_view_indicator")) {
                return handlePlaylistViewButton(interaction, client);
            }

            if (id.startsWith(PLAYLIST_SRCH_PREFIX) && !id.startsWith("playlist_srch_indicator")) {
                return handlePlaylistSearchButton(interaction, client);
            }

            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`[Commands] ❌ No command matching ${interaction.commandName} was found.`);
            return;
        }

        if (MUSIC_COMMANDS.has(interaction.commandName)) {
            try {
                const config = await GuildConfig.findOne({ guildId: interaction.guildId });

                if (config?.musicChannel && interaction.channelId !== config.musicChannel) {
                    const footer = process.env.FOOTER || "Dreama";

                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("FF0000")
                                .setTitle("❌ Wrong Channel!")
                                .setDescription(`Music commands can only be used in <#${config.musicChannel}>.`)
                                .setFooter({ text: footer })
                                .setTimestamp(),
                        ],
                        flags: MessageFlags.Ephemeral,
                    });
                }
            } catch {
                /* If the DB check fails, allow the command through rather than blocking the user */
            }
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    embeds: [errorEmbed1],
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    embeds: [errorEmbed2],
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    },
};
