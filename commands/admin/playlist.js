require('dotenv').config();
const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js');
const Playlist = require('../../utils/database/playlistDb.js');
const GuildConfig = require('../../utils/database/configDb.js');
const { formatDuration } = require('../../utils/formatDuration.js');
const {
    buildViewEmbed,
    buildViewButtons,
    buildSearchViewEmbed,
    buildSearchNavButtons,
    buildPlayButton,
    TRACKS_PER_PAGE,
} = require('../../utils/playlistButtonUtils.js');
const { logger } = require('../../utils/logger.js');

const COLORS = {
    DEFAULT: 'FF7F50',
    SUCCESS: '50C878',
    ERROR: 'FF7F50',
};

const SUPPORTED_URL_PATTERNS = [
    /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i,
    /^https?:\/\/(www\.)?soundcloud\.com/i,
    /^https?:\/\/(www\.)?deezer\.com/i,
    /^https?:\/\/open\.spotify\.com/i,
    /^https?:\/\/(www\.)?twitch\.tv/i,
    /^https?:\/\/(www\.)?vimeo\.com/i,
    /^https?:\/\//i,
];

const URL_REGEX = /^https?:\/\//i;

function isUrlSupported(query) {
    if (!URL_REGEX.test(query)) return true;
    return SUPPORTED_URL_PATTERNS.some(p => p.test(query));
}

function generatePlaylistId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 7; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

async function generateUniqueId() {
    let id;
    let exists = true;
    while (exists) {
        id = generatePlaylistId();
        exists = await Playlist.exists({ playlistId: id });
    }
    return id;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Manage and play playlists.')
        .addSubcommand(sub =>
            sub
                .setName('create-global')
                .setDescription('Create a global playlist anyone can use.')
                .addStringOption(o => o.setName('playlist-name').setDescription('Name of the playlist.').setRequired(true))
                .addStringOption(o => o.setName('description').setDescription('Short description of the playlist.').setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName('create-server')
                .setDescription('Create a server-only playlist. (Admin / Manage Guild only)')
                .addStringOption(o => o.setName('playlist-name').setDescription('Name of the playlist.').setRequired(true))
                .addStringOption(o => o.setName('description').setDescription('Short description of the playlist.').setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName('view')
                .setDescription('View all songs in a playlist.')
                .addStringOption(o => o.setName('playlist-id').setDescription('The 7-character playlist ID.').setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName('server')
                .setDescription('Show all your server playlists in this guild.')
        )
        .addSubcommand(sub =>
            sub
                .setName('global')
                .setDescription('Show all your global playlists.')
        )
        .addSubcommand(sub =>
            sub
                .setName('add-song')
                .setDescription('Add a song to one of your playlists.')
                .addStringOption(o => o.setName('playlist-id').setDescription('The 7-character playlist ID.').setRequired(true))
                .addStringOption(o => o.setName('query').setDescription('Song name or URL (YouTube, SoundCloud, Deezer, Spotify, Twitch, Vimeo).').setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName('remove-song')
                .setDescription('Remove a song from your playlist by title or URL.')
                .addStringOption(o => o.setName('playlist-id').setDescription('The 7-character playlist ID.').setRequired(true))
                .addStringOption(o => o.setName('song').setDescription('Track title or URL to remove.').setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName('search')
                .setDescription('Search for a global playlist by name and play it.')
                .addStringOption(o => o.setName('playlist-name').setDescription('Name of the playlist to search for.').setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName('delete-global')
                .setDescription('Permanently delete one of your global playlists.')
                .addStringOption(o => o.setName('playlist-id').setDescription('The 7-character playlist ID.').setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName('delete-server')
                .setDescription('Permanently delete one of your server playlists.')
                .addStringOption(o => o.setName('playlist-id').setDescription('The 7-character playlist ID.').setRequired(true))
        ),

    async execute(interaction) {
        const client = interaction.client;
        const guild = interaction.guild;
        const user = interaction.user;
        const member = interaction.member;
        const footer = process.env.FOOTER || 'Dreama';
        const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create-global') {
            const name = interaction.options.getString('playlist-name');
            const description = interaction.options.getString('description');

            const playlistId = await generateUniqueId();

            await Playlist.create({
                playlistId,
                name,
                description,
                type: 'global',
                guildId: null,
                creatorId: user.id,
                creatorUsername: user.username,
                creatorDisplayName: user.displayName || user.globalName || user.username,
                songs: [],
            });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.SUCCESS)
                        .setTitle('🌍 Global Playlist Created!')
                        .setDescription(`Your global playlist **${name}** has been created successfully!`)
                        .addFields(
                            { name: 'Playlist ID', value: `\`${playlistId}\``, inline: true },
                            { name: 'Type', value: '🌍 Global', inline: true },
                        )
                        .setThumbnail(avatarURL)
                        .setFooter({ text: `${footer} • Share your Playlist ID so others can find it!` })
                        .setTimestamp(),
                ],
            });
        }

        if (subcommand === 'create-server') {
            const hasPerms =
                member.permissions.has(PermissionFlagsBits.Administrator) ||
                member.permissions.has(PermissionFlagsBits.ManageGuild);

            if (!hasPerms) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Missing Permissions!")
                            .setDescription('You need **Administrator** or **Manage Server** permissions to create server playlists.')
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const guildConfig = await GuildConfig.findOne({ guildId: guild.id });

            if (guildConfig?.playlistsEnabled === false) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Server Playlists Disabled')
                            .setDescription('Server playlist creation has been disabled by an administrator. Use `/config playlists state:Enable` to turn it back on.')
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const name = interaction.options.getString('playlist-name');
            const description = interaction.options.getString('description');

            const playlistId = await generateUniqueId();

            await Playlist.create({
                playlistId,
                name,
                description,
                type: 'server',
                guildId: guild.id,
                creatorId: user.id,
                creatorUsername: user.username,
                creatorDisplayName: user.displayName || user.globalName || user.username,
                songs: [],
            });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.SUCCESS)
                        .setTitle('🏠 Server Playlist Created!')
                        .setDescription(`Your server playlist **${name}** has been created successfully!`)
                        .addFields(
                            { name: 'Playlist ID', value: `\`${playlistId}\``, inline: true },
                            { name: 'Type', value: '🏠 Server', inline: true },
                        )
                        .setThumbnail(avatarURL)
                        .setFooter({ text: `${footer} • This playlist is only visible in this server.` })
                        .setTimestamp(),
                ],
            });
        }

        if (subcommand === 'view') {
            const playlistId = interaction.options.getString('playlist-id');
            const playlist = await Playlist.findOne({ playlistId }).lean();

            if (!playlist) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Playlist Not Found')
                            .setDescription(`No playlist exists with ID \`${playlistId}\`.`)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (playlist.type === 'server' && playlist.guildId !== guild.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Access Denied')
                            .setDescription('This is a server playlist from another server.')
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const totalPages = Math.max(1, Math.ceil(playlist.songs.length / TRACKS_PER_PAGE));
            const embed = buildViewEmbed(playlist, 0, client);
            const components = [];

            if (playlist.songs.length > TRACKS_PER_PAGE) {
                components.push(buildViewButtons(0, totalPages, playlistId));
            }

            return interaction.reply({ embeds: [embed], components });
        }

        if (subcommand === 'server') {
            const playlists = await Playlist.find({
                creatorId: user.id,
                type: 'server',
                guildId: guild.id,
            }).lean();

            if (!playlists.length) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('📭 No Server Playlists Found')
                            .setDescription("You haven't created any server playlists in this guild yet. Use `/playlist create-server` to get started.")
                            .setThumbnail(avatarURL)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const list = playlists.map(p =>
                `\`${p.playlistId}\` — **${p.name}** • ${p.songs.length} song(s)`
            ).join('\n');

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.DEFAULT)
                        .setTitle('🏠 Your Server Playlists')
                        .setDescription(list)
                        .setThumbnail(avatarURL)
                        .setFooter({ text: `${footer} • Use /playlist view <playlist-id> to see a playlist` })
                        .setTimestamp(),
                ],
            });
        }

        if (subcommand === 'global') {
            const playlists = await Playlist.find({
                creatorId: user.id,
                type: 'global',
            }).lean();

            if (!playlists.length) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('📭 No Global Playlists Found')
                            .setDescription("You haven't created any global playlists yet. Use `/playlist create-global` to get started.")
                            .setThumbnail(avatarURL)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const list = playlists.map(p =>
                `\`${p.playlistId}\` — **${p.name}** • ${p.songs.length} song(s)`
            ).join('\n');

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.DEFAULT)
                        .setTitle('🌍 Your Global Playlists')
                        .setDescription(list)
                        .setThumbnail(avatarURL)
                        .setFooter({ text: `${footer} • Use /playlist view <playlist-id> to see a playlist` })
                        .setTimestamp(),
                ],
            });
        }

        if (subcommand === 'add-song') {
            const playlistId = interaction.options.getString('playlist-id');
            const query = interaction.options.getString('query');

            if (!isUrlSupported(query)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Unsupported Platform!')
                            .setDescription(
                                'The URL you provided is not from a supported platform.\n\n' +
                                '**Supported platforms:** YouTube, SoundCloud, Deezer, Spotify, Twitch, Vimeo, or a direct HTTP stream.\n\n' +
                                'Try using a song name as a search query instead.'
                            )
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const playlist = await Playlist.findOne({ playlistId });

            if (!playlist) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Playlist Not Found')
                            .setDescription(`No playlist exists with ID \`${playlistId}\`.`)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (playlist.creatorId !== user.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Not Your Playlist')
                            .setDescription('You can only add songs to playlists you created.')
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (playlist.type === 'server' && playlist.guildId !== guild.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Access Denied')
                            .setDescription('This server playlist belongs to another server.')
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
                            .setTitle('❌ Internal Error Occurred.')
                            .setDescription('No music nodes are available right now. Please try again later.')
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            await interaction.deferReply();

            const nodes = [...client.lavalink.nodeManager.nodes.values()];
            const node = nodes.find(n => n.connected) || nodes[0];

            if (!node) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ No Nodes Available')
                            .setDescription('Cannot resolve tracks right now. Please try again later.')
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                });
            }

            let result;
            try {
                result = await node.search({ query }, user);
            } catch (err) {
                logger.error('Search failed in /playlist add-song', err);
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Search Failed')
                            .setDescription(`Could not retrieve results for **${query}**.`)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                });
            }

            if (!result?.tracks?.length || result.loadType === 'empty' || result.loadType === 'error') {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ No Results Found')
                            .setDescription(`No results found for **${query}**.`)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                });
            }

            let tracksToAdd = [];

            if (result.loadType === 'playlist') {
                tracksToAdd = result.tracks.map(t => ({
                    title: t.info.title,
                    uri: t.info.uri,
                    author: t.info.author || 'Unknown',
                    duration: t.info.duration || 0,
                    sourceName: t.info.sourceName || 'unknown',
                    artworkUrl: t.info.artworkUrl || null,
                    addedBy: user.username,
                }));
            } else {
                const track = result.tracks[0];
                tracksToAdd = [{
                    title: track.info.title,
                    uri: track.info.uri,
                    author: track.info.author || 'Unknown',
                    duration: track.info.duration || 0,
                    sourceName: track.info.sourceName || 'unknown',
                    artworkUrl: track.info.artworkUrl || null,
                    addedBy: user.username,
                }];
            }

            await Playlist.updateOne(
                { playlistId },
                { $push: { songs: { $each: tracksToAdd } } }
            );

            const addedTrack = tracksToAdd[0];

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.SUCCESS)
                        .setTitle(result.loadType === 'playlist' ? '📋 Playlist Songs Added!' : '✅ Song Added to Playlist!')
                        .setDescription(
                            result.loadType === 'playlist'
                                ? `Added **${tracksToAdd.length}** tracks from **${result.playlist?.name ?? 'playlist'}** to \`${playlistId}\`.`
                                : `**[${addedTrack.title}](${addedTrack.uri})** has been added to \`${playlistId}\`.`
                        )
                        .addFields(
                            result.loadType !== 'playlist'
                                ? [
                                    { name: 'Author', value: addedTrack.author, inline: true },
                                    { name: 'Duration', value: formatDuration(addedTrack.duration), inline: true },
                                ]
                                : [
                                    { name: 'Tracks Added', value: `${tracksToAdd.length}`, inline: true },
                                ]
                        )
                        .setThumbnail(addedTrack.artworkUrl || avatarURL)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        if (subcommand === 'remove-song') {
            const playlistId = interaction.options.getString('playlist-id');
            const songQuery = interaction.options.getString('song');

            const playlist = await Playlist.findOne({ playlistId });

            if (!playlist) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Playlist Not Found')
                            .setDescription(`No playlist exists with ID \`${playlistId}\`.`)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (playlist.creatorId !== user.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Not Your Playlist')
                            .setDescription('You can only remove songs from playlists you created.')
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const lowerQuery = songQuery.toLowerCase().trim();
            const songIndex = playlist.songs.findIndex(s =>
                s.uri === songQuery ||
                s.title.toLowerCase() === lowerQuery ||
                s.title.toLowerCase().includes(lowerQuery)
            );

            if (songIndex === -1) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Song Not Found')
                            .setDescription(`Could not find **${songQuery}** in this playlist. Try using the exact title or URL.`)
                            .setThumbnail(avatarURL)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const removedSong = playlist.songs[songIndex];

            await Playlist.updateOne(
                { playlistId },
                { $pull: { songs: { uri: removedSong.uri, title: removedSong.title } } }
            );

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.SUCCESS)
                        .setTitle('🗑️ Song Removed from Playlist')
                        .setDescription(`**${removedSong.title}** has been permanently removed from \`${playlistId}\`.`)
                        .addFields(
                            { name: 'Author', value: removedSong.author || 'Unknown', inline: true },
                            { name: 'Duration', value: formatDuration(removedSong.duration), inline: true },
                        )
                        .setThumbnail(removedSong.artworkUrl || avatarURL)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        if (subcommand === 'search') {
            const searchName = interaction.options.getString('playlist-name');

            const playlist = await Playlist.findOne({
                name: { $regex: new RegExp(searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
                type: 'global',
            }).lean();

            if (!playlist) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('🔍 No Results Found')
                            .setDescription(`No global playlist matching **${searchName}** was found.`)
                            .setThumbnail(avatarURL)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const totalPages = Math.max(1, Math.ceil(playlist.songs.length / TRACKS_PER_PAGE));
            const embed = buildSearchViewEmbed(playlist, 0, client);
            const navRows = buildSearchNavButtons(0, totalPages, playlist.playlistId);
            const playRow = buildPlayButton(playlist.playlistId, playlist.name);

            return interaction.reply({
                embeds: [embed],
                components: [...navRows, playRow],
            });
        }

        if (subcommand === 'delete-global') {
            const playlistId = interaction.options.getString('playlist-id');

            const playlist = await Playlist.findOne({ playlistId });

            if (!playlist) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Playlist Not Found')
                            .setDescription(`No playlist exists with ID \`${playlistId}\`.`)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (playlist.creatorId !== user.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Not Your Playlist')
                            .setDescription('You can only delete playlists you created.')
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (playlist.type !== 'global') {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Wrong Playlist Type')
                            .setDescription('Use `/playlist delete-server` to delete a server playlist.')
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            await Playlist.deleteOne({ playlistId });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.SUCCESS)
                        .setTitle('🗑️ Global Playlist Deleted')
                        .setDescription(`The global playlist **${playlist.name}** (\`${playlistId}\`) has been permanently deleted.`)
                        .setThumbnail(avatarURL)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }

        if (subcommand === 'delete-server') {
            const playlistId = interaction.options.getString('playlist-id');

            const playlist = await Playlist.findOne({ playlistId });

            if (!playlist) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Playlist Not Found')
                            .setDescription(`No playlist exists with ID \`${playlistId}\`.`)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (playlist.creatorId !== user.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Not Your Playlist')
                            .setDescription('You can only delete playlists you created.')
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (playlist.type !== 'server') {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Wrong Playlist Type')
                            .setDescription('Use `/playlist delete-global` to delete a global playlist.')
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (playlist.guildId !== guild.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle('❌ Access Denied')
                            .setDescription('This server playlist belongs to another server.')
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            await Playlist.deleteOne({ playlistId });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.SUCCESS)
                        .setTitle('🗑️ Server Playlist Deleted')
                        .setDescription(`The server playlist **${playlist.name}** (\`${playlistId}\`) has been permanently deleted.`)
                        .setThumbnail(avatarURL)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }
    },
};
