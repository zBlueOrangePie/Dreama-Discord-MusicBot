require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, MessageFlags } = require("discord.js");
const { buildVolumeCard } = require("../../utils/volumeCard.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR: "FF0000",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("volume")
        .setDescription("Set the playback volume.")
        .addIntegerOption(option =>
            option
                .setName("level")
                .setDescription("Volume level between 1 and 100.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer = process.env.FOOTER || "Dreama";
        const level = interaction.options.getInteger("level");

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ Please Join A Voice Channel First!")
                        .setDescription("❌ You need to be in a voice channel to use this command.")
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
                        .setDescription(`❌ You must be in <#${player.voiceChannelId}> to control playback.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!player.queue.current) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Nothing Is Playing!")
                        .setDescription("There is no track currently playing.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply();

        await player.setVolume(level);

        if (player.npMessage) {
            const currentEmbed = player.npMessage.embeds[0];
            const updatedEmbed = EmbedBuilder.from(currentEmbed);
            const fields = updatedEmbed.data.fields ?? [];
            const volumeIndex = fields.findIndex(f => f.name === "Volume");

            if (volumeIndex !== -1) {
                updatedEmbed.spliceFields(volumeIndex, 1, {
                    name: "Volume",
                    value: `🔊 ${level}%`,
                    inline: true,
                });
                player.npMessage.edit({ embeds: [updatedEmbed] }).catch(() => null);
            }
        }

        const trackTitle = player.queue.current?.info?.title ?? null;
        const imageBuffer = await buildVolumeCard(level, trackTitle).catch(() => null);
        const imageAttachment = imageBuffer ? new AttachmentBuilder(imageBuffer, { name: "volume.png" }) : null;

        const volumeEmbed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle("🔊 Volume Updated")
            .setDescription(`Volume has been set to **${level}%**.`)
            .setFooter({ text: footer })
            .setTimestamp();

        if (imageAttachment) 
          volumeEmbed.setImage("attachment://volume.png");

        const replyOptions = { embeds: [volumeEmbed] };
        if (imageAttachment) 
          replyOptions.files = [imageAttachment];

        return interaction.editReply(replyOptions);
    },
};
