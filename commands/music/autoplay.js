require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { syncNpMessage } = require("../../utils/npButtonUtils.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR: "FF0000",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("autoplay")
        .setDescription("Toggle autoplay. Keeps the music going with recommendations when the queue ends.")
        .addStringOption(option =>
            option
                .setName("state")
                .setDescription("Turn autoplay on or off.")
                .setRequired(true)
                .addChoices(
                    { 
                      name: "On",  
                      value: "on"  
                    },
                    { 
                      name: "Off", 
                      value: "off" 
                    },
                )
        ),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer = process.env.FOOTER || "Dreama";
        const state = interaction.options.getString("state");
        
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ Please Join A Voice Channel First!")
                        .setDescription("You need to be in a voice channel to use this command.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const player = client.lavalink.getPlayer(guild.id);

        if (!player || !player.connected) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Nothing Is Playing!")
                        .setDescription("There is no active player in this server.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (player.voiceChannelId !== voiceChannel.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ Wrong Voice Channel!")
                        .setDescription(`You must be in <#${player.voiceChannelId}> to control playback.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const enabled = state === "on";
        player.set("autoplay", enabled);

        await syncNpMessage(player);

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(enabled ? COLORS.SUCCESS : COLORS.DEFAULT)
                    .setTitle(enabled ? "🔀 Autoplay Enabled" : "🔀 Autoplay Disabled")
                    .setDescription(
                        enabled
                            ? "Autoplay is now **on**. When the queue ends, I will automatically play recommended tracks."
                            : "Autoplay is now **off**. I will stop when the queue is empty."
                    )
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
        });
    },
};
          
