require("dotenv").config();
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { formatDuration } = require("../../utils/formatDuration.js");

const COLORS = {
    DEFAULT: "5865F2",
    SUCCESS: "50C878",
    ERROR: "FF0000",
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song or playlist from a search query or URL.")
        .addStringOption(option =>
            option
                .setName("query")
                .setDescription("Song name or direct URL")
                .setRequired(true)
        ),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild = interaction.guild;
        const voiceChannel = member.voice?.channel;
        const footer = process.env.FOOTER || "Dreama";

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
                ephemeral: true,
            });
        }

        const botVoiceChannel = guild.members.me?.voice?.channel;
        if (botVoiceChannel && botVoiceChannel.id !== voiceChannel.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("‼️ I'm Already Playing!")
                        .setDescription(`❌ I'm already in <#${botVoiceChannel.id}>. Join that channel to use me.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!client.lavalink.useable) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Internal Error Occurred.")
                        .setDescription("❌ No music nodes are available right now. Please try again later.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply();

        const player = client.lavalink.createPlayer({
            guildId: guild.id,
            voiceChannelId: voiceChannel.id,
            textChannelId: interaction.channel.id,
            selfDeaf: true,
        });

        if (!player.connected) await player.connect();

        const query = interaction.options.getString("query");
        const result = await player.search({ query }, interaction.user);

        if (result.loadType === "empty" || !result.tracks.length) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ Search Failed")
                        .setDescription(`No results found for **${query}**.`)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        if (result.loadType === "error") {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle("❌ An Error Occurred!")
                        .setDescription("An error occurred while searching. Please try again.")
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
              flags: MessageFlags.Ephemeral,
            });
        }

        const wasPlaying = player.playing || player.paused;

        if (result.loadType === "playlist") {
            await player.queue.add(result.tracks);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.SUCCESS)
                        .setTitle("📋 Playlist Added to Queue")
                        .setDescription(`**[${result.playlist.name}](${query})**`)
                        .addFields(
                            { 
                              name: "Tracks",       
                              value: `${result.tracks.length}`, 
                              inline: true 
                            },
                            { 
                              name: "Requested By", 
                              value: `${interaction.user}`,    
                              inline: true 
                            },
                        )
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        } else {
            const track = result.tracks[0];
            const artworkUrl = typeof track.info.artworkUrl === "string" && track.info.artworkUrl.startsWith("http")
                ? track.info.artworkUrl
                : null;

            await player.queue.add(track);

            if (wasPlaying) {
                const addedEmbed = new EmbedBuilder()
                    .setColor(COLORS.DEFAULT)
                    .setTitle("🎵 Added to Queue!")
                    .setDescription(`**[${track.info.title}](${track.info.uri})**`)
                    .addFields(
                        { 
                          name: "Author",       
                          value: track.info.author || "Unknown",    
                          inline: true 
                        },
                        { 
                          name: "Duration",     
                          value: formatDuration(track.info.duration), 
                          inline: true 
                        },
                        { 
                          name: "Requested By", 
                          value: `${interaction.user}`,               
                          inline: true 
                        },
                    )
                    .setFooter({ text: footer })
                    .setTimestamp();

                if (artworkUrl) addedEmbed.setThumbnail(artworkUrl);

                await interaction.editReply({ embeds: [addedEmbed] });
            } else {
                await interaction.deleteReply().catch(() => null);
            }
        }

        if (!wasPlaying) await player.play();
    },
};
  
