require("dotenv").config();
const { EmbedBuilder } = require("discord.js");

const username = process.env.USERNAME || "Dreama";
const footer = process.env.FOOTER || "Dreama";

const errorEmbed1 = new EmbedBuilder()
    .setColor("FF0000")
    .setTitle("Error")
    .setDescription("An error occurred while executing this command.")
    .setFooter({ text: footer })
    .setThumbnail(avatarURL)
    .setTimestamp();

const errorEmbed2 = new EmbedBuilder()
    .setColor("FF0000")
    .setTitle("Error")
    .setDescription("Something went wrong. Please try again later.")
    .setFooter({ text: footer })
    .setThumbnail(avatarURL)
    .setTimestamp();

function buildHelpEmbed(client) {
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;
    const embed = new EmbedBuilder()
        .setColor("FF7F50")
        .setTitle(`${username} - Command Information Guide`)
        .setDescription(
            `👋 Hi! I'm ${username} and I'm ready to help you! All available commands can be found right here.\n\n` +
            `${username} only uses slash commands **(/)**.`
        )
        .addFields(
            {
                name: "🎶 Music Commands",
                value: "**/play**, **/stop**, **/pause**, **/resume**, **/queue**, **/filters**, **/autoplay**, **/volume**, **/search**, **/skip**, **/seek**, **/skipto**, **/recent**, **/rewind**, **/forward**",
                inline: false,
            },
            {
                name: "⚙️ Utility Commands",
                value: "**/help**, **/ping**, **/uptime**, **/avatar**",
                inline: false,
            },
            {
                name: "⚒️ Admin Commands",
                value: "**/config**",
                inline: false,
            }
        )
        .setFooter({ text: footer })
        .setTimestamp();

    if (avatarURL) embed.setThumbnail(avatarURL);

    return embed;
}

module.exports = { errorEmbed1, errorEmbed2, buildHelpEmbed };
