require("dotenv").config();
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require("discord.js");
const { formatDuration } = require("./formatDuration.js");
const { syncNpMessage } = require("./npButtonUtils.js");

const searchCache = new Map();

const CACHE_TTL_MS = 5 * 60 * 1000;

function storeSearchData(messageId, data) {
    searchCache.set(messageId, data);
    setTimeout(() => searchCache.delete(messageId), CACHE_TTL_MS);
}

function getSearchData(messageId) {
    return searchCache.get(messageId) ?? null;
}

function buildSearchRows(tracks) {
    const trackRow = new ActionRowBuilder();
    const allRow = new ActionRowBuilder();

    for (let i = 0; i < Math.min(tracks.length, 5); i++) {
        const label = tracks[i].info.title.length > 60
            ? tracks[i].info.title.slice(0, 57) + "..."
            : tracks[i].info.title;

        trackRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`search_track_${i}`)
                .setLabel(`${i + 1}. ${label}`)
                .setStyle(ButtonStyle.Secondary)
        );
    }

    allRow.addComponents(
        new ButtonBuilder()
            .setCustomId("search_track_all")
            .setLabel("🎵 Play All")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("search_cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger)
    );

    return [trackRow, allRow];
}

function buildDisabledSearchRows(tracks) {
    const trackRow = new ActionRowBuilder();
    const allRow = new ActionRowBuilder();

    for (let i = 0; i < Math.min(tracks.length, 5); i++) {
        const label = tracks[i].info.title.length > 60
            ? tracks[i].info.title.slice(0, 57) + "..."
            : tracks[i].info.title;

        trackRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`search_track_${i}`)
                .setLabel(`${i + 1}. ${label}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );
    }

    allRow.addComponents(
        new ButtonBuilder()
            .setCustomId("search_track_all")
            .setLabel("🎵 Play All")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId("search_cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
    );

    return [trackRow, allRow];
}

async function handleSearchButton(interaction, client) {
    const footer = process.env.FOOTER || "Dreama";
    const data = getSearchData(interaction.message.id);

    if (!data) {
        return interaction.reply({
            content: "❌ These search results have expired. Please run `/search` again.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const { tracks, query } = data;

    if (interaction.customId === "search_cancel") {
        await interaction.deferUpdate();
        await interaction.editReply({ components: buildDisabledSearchRows(tracks) });
        return interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setColor("ED4245")
                    .setDescription(`Searching for **${query}** has been cancelled!`)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
            flags: MessageFlags.Ephemeral,
        });
    }

    const voiceChannel = interaction.member.voice?.channel;

    if (!voiceChannel) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("FF0000")
                    .setTitle("‼️ Please Join A Voice Channel First!")
                    .setDescription("❌ You need to be in a voice channel to play music.")
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
            flags: MessageFlags.Ephemeral,
        });
    }

    const botVoiceChannel = interaction.guild.members.me?.voice?.channel;
    if (botVoiceChannel && botVoiceChannel.id !== voiceChannel.id) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("FF0000")
                    .setTitle("‼️ I'm Already Playing!")
                    .setDescription(`❌ I'm already in <#${botVoiceChannel.id}>. Join that channel to use me.`)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
            flags: MessageFlags.Ephemeral,
        });
    }

    await interaction.deferUpdate();

    const disabledRows = buildDisabledSearchRows(tracks);
    await interaction.editReply({ components: disabledRows });

    const player = client.lavalink.createPlayer({
        guildId: interaction.guildId,
        voiceChannelId: voiceChannel.id,
        textChannelId: interaction.channelId,
        selfDeaf: true,
    });

    if (!player.connected) await player.connect();

    const wasPlaying = player.playing || player.paused;
    const customId = interaction.customId;

    if (customId === "search_track_all") {
        await player.queue.add(tracks);

        if (!wasPlaying) {
            await player.play();
        } else {
            await syncNpMessage(player);
        }

        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setColor("50C878")
                    .setTitle("🎵 Added All to Queue")
                    .setDescription(`Added **${tracks.length}** tracks to the queue.`)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
        });
        return;
    }

    const index = parseInt(customId.replace("search_track_", ""), 10);
    const track = tracks[index];

    if (!track) return;

    await player.queue.add(track);

    if (!wasPlaying) {
        await player.play();
    } else {
        await syncNpMessage(player);

        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setColor("FF7F50")
                    .setTitle("🎵 Added to Queue")
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
                        }
                    )
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
        });
    }
}

module.exports = { storeSearchData, getSearchData, buildSearchRows, buildDisabledSearchRows, handleSearchButton };
        
