require('dotenv').config();
const { EmbedBuilder } = require("discord.js");

const username = process.env.USERNAME || "Dreama";
const footer = process.env.FOOTER || "Dreama";

const errorEmbed1 = new EmbedBuilder()
    .setColor("FF0000")
    .setTitle("Error")
    .setDescription("An error occurred while executing this command.")
    .setFooter({ text: footer })
    .setTimestamp();

const errorEmbed2 = new EmbedBuilder()
    .setColor("FF0000")
    .setTitle("Error")
    .setDescription("Something went wrong. Please try again later.")
    .setFooter({ text: footer })
    .setTimestamp();
    
const helpEmbed = new EmbedBuilder()
    .setColor("5865F2")
    .setTitle(`${username} - Command Information Guide`)
    
    .setDescription(`👋 Hi! Im ${username} and im ready to help you! All
    available commands can be found right here.` +
    `${username} only uses slash commands **(/)**.`)
    .addFields(
     {
     name: "Music Commands",
     value: "**/play**, **/pause**, **resume**, **/queue**, **/filters**, /autoplay",
     inline: false
    },
    {
     name: "Utility Commands",
     value: "**/help**, **/ping**, **/uptime**",
     inline: false
    }
    )
    .setFooter({ text: footer })
    .setTimestamp();

module.exports = { errorEmbed1, errorEmbed2, helpEmbed };
