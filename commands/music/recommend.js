require('dotenv').config();
const { SlashCommandBuilder } = require('discord.js');
const { buildRecommendEmbed, buildGenreSelectMenu } = require('../../utils/recommendButtonUtils.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recommend')
        .setDescription('Let Dreama recommend a song for you based on your favorite genre!'),

    async execute(interaction) {
        const embed = buildRecommendEmbed(interaction.client);
        const row = buildGenreSelectMenu();

        return interaction.reply({
            embeds: [embed],
            components: [row],
        });
    },
};
