require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, MessageFlags } = require("discord.js");
const { buildNpImageCard } = require("../../utils/npImageCard.js");
const { formatDuration } = require("../../utils/formatDuration.js");

const COLORS = {
    DEFAULT: "FF7F50",
    ERROR:   "FF0000",
};

const REPEAT_LABELS = {
    off:   "Off",
    track: "🔂 Track",
    queue: "🔁 Queue",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nowplaying")
        .setDescription("Show what is currently playing."),

    async execute(interaction) {
        const client = interaction.client;
        const guild  = interaction.guild;
        const footer = process.env.FOOTER || "Dreama";

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

        const track = player.queue.current;

        if (!track) {
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

        const repeatMode  = player.repeatMode ?? "off";
        const autoplay    = player.get("autoplay") ?? false;
        const queueLength = player.queue?.tracks?.length ?? 0;
        const positionMs  = player.position ?? 0;
        const durationMs  = track.info.duration ?? 0;

        // Build the image card
        const imageBuffer     = await buildNpImageCard(track).catch(() => null);
        const imageAttachment = imageBuffer
            ? new AttachmentBuilder(imageBuffer, { name: "nowplaying.png" })
            : null;

        // Build the simple embed (different from the trackStart container — no buttons)
        const npEmbed = new EmbedBuilder()
            .setColor(COLORS.DEFAULT)
            .setTitle("🎵 Now Playing")
            .setDescription(`**[${track.info.title}](${track.info.uri})**`)
            .addFields(
                { name: "Author",       value: track.info.author     || "Unknown",                    inline: true  },
                { name: "Source",       value: track.info.sourceName || "Unknown",                    inline: true  },
                { name: "Requested by", value: track.requester?.username ?? "Unknown",                inline: true  },
                { name: "Progress",     value: `${formatDuration(positionMs)} / ${formatDuration(durationMs)}`, inline: true  },
                { name: "Repeat",       value: REPEAT_LABELS[repeatMode] ?? "Off",                    inline: true  },
                { name: "Autoplay",     value: autoplay ? "On" : "Off",                               inline: true  },
                { name: "In Queue",     value: `${queueLength} track(s) remaining`,                   inline: false },
            )
            .setFooter({ text: footer })
            .setTimestamp();

        if (imageAttachment) {
            npEmbed.setImage("attachment://nowplaying.png");
        } else if (track.info.artworkUrl) {
            npEmbed.setThumbnail(track.info.artworkUrl);
        }

        const replyOptions = { embeds: [npEmbed] };
        if (imageAttachment) replyOptions.files = [imageAttachment];

        return interaction.editReply(replyOptions);
    },
};
