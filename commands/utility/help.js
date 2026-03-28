const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { helpEmbed } = require("../../utils/embedHandler.js");

module.exports = {
  data: new SlashCommandBuilder()
  .setName("help")
  .setDescription("Shows all available commands that can be used."),

  async execute(interaction) {
    interaction.reply({ embeds: [helpEmbed] });
  }
}
