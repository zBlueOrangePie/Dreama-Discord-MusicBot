require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { syncNpMessage } = require("../../utils/npButtonUtils.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR: "FF0000",
};

const MODE_INFO = {
    off: {
        title: "🔁 Repeat Disabled",
        description: "Repeat is now **off**. The queue will play through once and stop.",
        color: COLORS.DEFAULT,
    },
    track: {
        title: "🔂 Repeating Current Track",
        description: "Now repeating the **current track** on loop. Use `/repeat mode:Queue` or `/repeat mode:Off` to change.",
        color: COLORS.DEFAULT,
    },
    queue: {
        title: "🔁 Repeating Queue",
        description: "Now repeating the **entire queue** on loop. Use `/repeat mode:Off` to stop.",
        color: COLORS.DEFAULT,
    },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("repeat")
        .setDescription("Set the repeat mode for the current playback.")
        .addStringOption(option =>
            option
                .setName("mode")
                .setDescription("Choose a repeat mode.")
                .setRequired(true)
                .addChoices(
                    { 
                        name: "🔂 Track — loop the current song",  
                        value: "track" 
                    },
                    { 
                        name: "🔁 Queue — loop the entire queue",  
                        value: "queue" 
                    },
                    {
                        name: "⛔ Off   — disable repeat",     
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
        const mode = interaction.options.getString("mode");

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

        await player.setRepeatMode(mode);
        await syncNpMessage(player);

        const info = MODE_INFO[mode];

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(info.color)
                    .setTitle(info.title)
                    .setDescription(info.description)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
        });
    },
};
