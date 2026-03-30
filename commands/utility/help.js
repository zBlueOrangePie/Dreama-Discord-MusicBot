const { SlashCommandBuilder } = require("discord.js");
const { buildHelpEmbed } = require("../../utils/embedHandler.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Shows all available commands that can be used."),

    async execute(interaction) {
        const embed = buildHelpEmbed(interaction.client);
        return interaction.reply({ embeds: [embed] });
    },
};
