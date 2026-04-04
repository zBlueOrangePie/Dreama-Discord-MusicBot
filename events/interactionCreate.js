const { Events, MessageFlags, EmbedBuilder } = require("discord.js");
const { errorEmbed1, errorEmbed2 } = require("../utils/embedHandler.js");
const { handleNpButton } = require("../utils/npButtonUtils.js");
const { handleQueueButton } = require("../utils/queueButtonUtils.js");
const { handleSearchButton } = require("../utils/searchButtonUtils.js");
const { handleRecommendSelect } = require("../utils/recommendButtonUtils.js");
const { handlePlaylistViewButton } = require("../utils/playlistButtonUtils.js");
const { handleRemoveTrackSelect } = require("../commands/music/removetrack.js");
const { handleAddTrackSelect } = require("../commands/music/addtrack.js");
const GuildConfig = require("../utils/database/configDb.js");

const NP_BUTTON_IDS = ["np_pause_resume", "np_skip", "np_stop", "np_repeat", "np_autoplay"];
const QUEUE_BUTTON_PREFIX = "queue_";
const SEARCH_BUTTON_PREFIX = "search_track_";
const PLAYLIST_VIEW_PREFIX = "playlist_view_";

const MUSIC_COMMANDS = new Set([
    "play",
    "playnext",
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
    "move",
    "repeat",
    "nowplaying",
    "shuffle",
]);

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        const client = interaction.client;

        if (interaction.isStringSelectMenu()) {
            const id = interaction.customId;

            try {
                if (id === "recommend_genre") {
                    return await handleRecommendSelect(interaction, client);
                }

                if (id.startsWith("removetrack_select_")) {
                    return await handleRemoveTrackSelect(interaction, client);
                }

                if (id.startsWith("addtrack_pos_")) {
                    return await handleAddTrackSelect(interaction, client);
                }
            } catch (err) {
                console.error("[SelectMenu] ❌ Error handling select menu:", err);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: "❌ Something went wrong.", flags: MessageFlags.Ephemeral }).catch(() => null);
                }
            }

            return;
        }

        if (interaction.isButton()) {
            const id = interaction.customId;

            try {
                if (NP_BUTTON_IDS.includes(id)) {
                    return await handleNpButton(interaction, client);
                }

                if (id.startsWith(QUEUE_BUTTON_PREFIX) && !id.startsWith("queue_page_indicator")) {
                    return await handleQueueButton(interaction, client);
                }

                if (id.startsWith(SEARCH_BUTTON_PREFIX) || id === "search_track_all" || id === "search_cancel") {
                    return await handleSearchButton(interaction, client);
                }

                if (id.startsWith(PLAYLIST_VIEW_PREFIX) && !id.startsWith("playlist_view_indicator")) {
                    return await handlePlaylistViewButton(interaction, client);
                }
            } catch (err) {
                console.error("[Button] ❌ Error handling button:", err);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: "❌ Something went wrong.", flags: MessageFlags.Ephemeral }).catch(() => null);
                }
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

                // Attach to the interaction so commands can read it without a
                // second round-trip to MongoDB (which eats into the 3-second
                // window before deferReply must be called).
                interaction._guildConfig = config ?? null;

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
                // If the DB check fails, allow the command through
                interaction._guildConfig = null;
            }
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error("[InteractionCreate] ❌ Command threw an error:", error);

            try {
                if (interaction.replied) {
                    await interaction.followUp({
                        embeds: [errorEmbed1()],
                        flags: MessageFlags.Ephemeral,
                    });
                } else if (interaction.deferred) {
                    await interaction.editReply({
                        embeds: [errorEmbed1()],
                    });
                } else {
                    await interaction.reply({
                        embeds: [errorEmbed2()],
                        flags: MessageFlags.Ephemeral,
                    });
                }
            } catch (followUpError) {
                console.error("[InteractionCreate] ❌ Failed to send error response to user:", followUpError);
            }
        }
    },
};
