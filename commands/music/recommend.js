require("dotenv").config();
const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { buildRecommendComponents, buildGenreSelectMenu } = require("../../utils/recommendButtonUtils.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("recommend")
        .setDescription("Let Dreama recommend a song for you based on your favorite genre!"),

    async execute(interaction) {
        return interaction.reply({
            components: buildRecommendComponents(interaction.client),
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
