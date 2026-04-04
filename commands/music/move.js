require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ChannelType } = require("discord.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR:   "FF0000",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("move")
        .setDescription("Move the bot to a different voice channel.")
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("The voice channel to move the bot to. Leave empty to move it to your current channel.")
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(false)
        ),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild  = interaction.guild;
        const footer = process.env.FOOTER || "Dreama";

        const player = client.lavalink.getPlayer(guild.id);

        if (!player || !player.connected) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Bot Is Not In A Voice Channel!")
                        .setDescription("There is no active player in this server. Use `/play` to start one first.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        // Determine the target channel — either the option or the user's current VC
        const specifiedChannel = interaction.options.getChannel("channel");
        const userVoiceChannel = member.voice?.channel;
        const targetChannel    = specifiedChannel ?? userVoiceChannel;

        if (!targetChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ No Target Channel!")
                        .setDescription(
                            "Please either join a voice channel or specify a channel to move the bot to.\n\n" +
                            "Usage: `/move` (moves to your VC) or `/move channel:#your-channel`."
                        )
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        // Already there
        if (player.voiceChannelId === targetChannel.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ Already There!")
                        .setDescription(`I'm already in <#${targetChannel.id}>. No need to move.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        const previousChannelId = player.voiceChannelId;

        try {
            await player.move(targetChannel.id);
        } catch (err) {
            console.error("[Move] ❌ Failed to move bot:", err);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Move Failed")
                        .setDescription("Could not move the bot to that channel. Make sure I have permission to join it.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setTitle("✅ Moved Voice Channel")
                    .setDescription(`Moved from <#${previousChannelId}> to <#${targetChannel.id}>.`)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
        });
    },
};
