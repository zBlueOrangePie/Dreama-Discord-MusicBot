const { Events, MessageFlags } = require("discord.js");
const { errorEmbed1, errorEmbed2 } = require("../utils/embedHandler.js");
const { handleNpButton } = require("../utils/npButtonUtils.js");
const { handleQueueButton } = require("../utils/queueButtonUtils.js");

const NP_BUTTON_IDS = ["np_pause_resume", "np_skip", "np_stop", "np_repeat", "np_autoplay"];
const QUEUE_BUTTON_PREFIX = "queue_";

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        const client = interaction.client;

        if (interaction.isButton()) {
            const id = interaction.customId;

            if (NP_BUTTON_IDS.includes(id)) {
                return handleNpButton(interaction, client);
            }

            if (id.startsWith(QUEUE_BUTTON_PREFIX) && !id.startsWith("queue_page_indicator")) {
                return handleQueueButton(interaction, client);
            }

            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`[Commands] ❌ No command matching ${interaction.commandName} was found.`);
            return;
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
              
