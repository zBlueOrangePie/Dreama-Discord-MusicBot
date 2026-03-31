const { Events, MessageFlags, EmbedBuilder } = require("discord.js");
const { errorEmbed1, errorEmbed2 } = require("../utils/embedHandler.js");
const { handleNpButton } = require("../utils/npButtonUtils.js");
const { handleQueueButton } = require("../utils/queueButtonUtils.js");
const { handleSearchButton } = require("../utils/searchButtonUtils.js");
const GuildConfig = require("../utils/database/configDb.js");

const NP_BUTTON_IDS = ["np_pause_resume", "np_skip", "np_stop", "np_repeat", "np_autoplay"];
const QUEUE_BUTTON_PREFIX = "queue_";
const SEARCH_BUTTON_PREFIX = "search_track_";

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
]); /*Checks this commands if they have configured music channel only.
    This acts like a guard for these, they are loaded automatically. you can add more if you want.*/

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;
        const client = interaction.client;

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
                                .setThumbnail(avatarURL)
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
                    flags:  MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    embeds: [errorEmbed2],
                    flags:  MessageFlags.Ephemeral,
                });
            }
        }
    },
};
