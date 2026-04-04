require("dotenv").config();
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ContainerBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SeparatorSpacingSize,
} = require("discord.js");
const Playlist   = require("../../utils/database/playlistDb.js");
const GuildConfig = require("../../utils/database/configDb.js");
const { formatDuration } = require("../../utils/formatDuration.js");
const { buildViewComponents } = require("../../utils/playlistButtonUtils.js");
const { syncNpMessage } = require("../../utils/npButtonUtils.js");
const { logger } = require("../../utils/logger.js");

const COLORS = {
    DEFAULT: "FF7F50",
    SUCCESS: "50C878",
    ERROR:   "FF0000",
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
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 7; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

async function generateUniqueId() {
    let id;
    let exists = true;
    while (exists) {
        id     = generatePlaylistId();
        exists = await Playlist.exists({ playlistId: id });
    }
    return id;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("playlist")
        .setDescription("Manage and play your playlists.")

        // ─── Create ────────────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName("create-server")
                .setDescription("Create a server playlist. Only usable in this guild. (Admin / Manage Guild only)")
                .addStringOption(o => o.setName("name").setDescription("Name of the playlist.").setRequired(true))
                .addStringOption(o => o.setName("description").setDescription("Short description of the playlist.").setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName("create-global")
                .setDescription("Create a private global playlist. Only you can use it, but from any server.")
                .addStringOption(o => o.setName("name").setDescription("Name of the playlist.").setRequired(true))
                .addStringOption(o => o.setName("description").setDescription("Short description of the playlist.").setRequired(true))
        )

        // ─── Browse ────────────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName("list")
                .setDescription("Show all playlists you have created.")
        )
        .addSubcommand(sub =>
            sub
                .setName("search")
                .setDescription("Search through your own playlists by name.")
                .addStringOption(o => o.setName("name").setDescription("Name to search for.").setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName("view")
                .setDescription("View all songs inside one of your playlists.")
                .addStringOption(o => o.setName("playlist-id").setDescription("The 7-character playlist ID.").setRequired(true))
        )

        // ─── Manage ────────────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName("add-song")
                .setDescription("Add a song to one of your playlists.")
                .addStringOption(o => o.setName("playlist-id").setDescription("The 7-character playlist ID.").setRequired(true))
                .addStringOption(o => o.setName("query").setDescription("Song name or URL (YouTube, SoundCloud, Deezer, Spotify, Twitch, Vimeo).").setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName("remove-song")
                .setDescription("Remove a song from one of your playlists.")
                .addStringOption(o => o.setName("playlist-id").setDescription("The 7-character playlist ID.").setRequired(true))
                .addStringOption(o => o.setName("song").setDescription("Track title or URL to remove.").setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName("delete-server")
                .setDescription("Permanently delete one of your server playlists.")
                .addStringOption(o => o.setName("playlist-id").setDescription("The 7-character playlist ID.").setRequired(true))
        )
        .addSubcommand(sub =>
            sub
                .setName("delete-global")
                .setDescription("Permanently delete one of your private global playlists.")
                .addStringOption(o => o.setName("playlist-id").setDescription("The 7-character playlist ID.").setRequired(true))
        )

        // ─── Play ──────────────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName("play")
                .setDescription("Play one of your playlists.")
                .addStringOption(o => o.setName("playlist-id").setDescription("The 7-character playlist ID.").setRequired(true))
        ),


    async execute(interaction) {
        const client     = interaction.client;
        const guild      = interaction.guild;
        const user       = interaction.user;
        const member     = interaction.member;
        const footer     = process.env.FOOTER || "Dreama";
        const avatarURL  = client?.user?.displayAvatarURL({ dynamic: true, size: 256 })
            ?? "https://cdn.discordapp.com/embed/avatars/0.png";
        const subcommand = interaction.options.getSubcommand();


        // ─────────────────────────────────────────────────────────────────
        // CREATE-SERVER
        // ─────────────────────────────────────────────────────────────────
        if (subcommand === "create-server") {
            const hasPerms =
                member.permissions.has(PermissionFlagsBits.Administrator) ||
                member.permissions.has(PermissionFlagsBits.ManageGuild);

            if (!hasPerms) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Missing Permissions!")
                            .setDescription("You need **Administrator** or **Manage Server** permissions to create server playlists.")
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
                            .setTitle("❌ Server Playlists Disabled")
                            .setDescription("Server playlist creation has been disabled by an administrator. Use `/config playlists state:Enable` to turn it back on.")
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const name        = interaction.options.getString("name");
            const description = interaction.options.getString("description");
            const playlistId  = await generateUniqueId();

            await Playlist.create({
                playlistId,
                name,
                description,
                type:               "server",
                guildId:            guild.id,
                creatorId:          user.id,
                creatorUsername:    user.username,
                creatorDisplayName: user.displayName || user.globalName || user.username,
                songs:              [],
            });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.SUCCESS)
                        .setTitle("🏠 Server Playlist Created!")
                        .setDescription(`Your server playlist **${name}** has been created successfully!`)
                        .addFields(
                            { name: "Playlist ID", value: `\`${playlistId}\``, inline: true },
                            { name: "Type",        value: "🏠 Server",          inline: true },
                        )
                        .setThumbnail(avatarURL)
                        .setFooter({ text: `${footer} • This playlist is only usable in this server.` })
                        .setTimestamp(),
                ],
            });
        }


        // ─────────────────────────────────────────────────────────────────
        // CREATE-GLOBAL
        // ─────────────────────────────────────────────────────────────────
        if (subcommand === "create-global") {
            const name        = interaction.options.getString("name");
            const description = interaction.options.getString("description");
            const playlistId  = await generateUniqueId();

            await Playlist.create({
                playlistId,
                name,
                description,
                type:               "global",
                guildId:            null,
                creatorId:          user.id,
                creatorUsername:    user.username,
                creatorDisplayName: user.displayName || user.globalName || user.username,
                songs:              [],
            });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.DEFAULT)
                        .setTitle("🔒 Private Global Playlist Created!")
                        .setDescription(`Your private global playlist **${name}** has been created successfully!`)
                        .addFields(
                            { name: "Playlist ID", value: `\`${playlistId}\``, inline: true },
                            { name: "Type",        value: "🔒 Private Global", inline: true },
                        )
                        .setThumbnail(avatarURL)
                        .setFooter({ text: `${footer} • Only you can view, manage, and play this playlist.` })
                        .setTimestamp(),
                ],
            });
        }


        // ─────────────────────────────────────────────────────────────────
        // LIST — show all playlists the user has created
        // ─────────────────────────────────────────────────────────────────
        if (subcommand === "list") {
            const [serverPlaylists, globalPlaylists] = await Promise.all([
                Playlist.find({ creatorId: user.id, type: "server", guildId: guild.id }).lean(),
                Playlist.find({ creatorId: user.id, type: "global" }).lean(),
            ]);

            const totalCount = serverPlaylists.length + globalPlaylists.length;

            if (totalCount === 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("📭 No Playlists Found")
                            .setDescription(
                                "You haven't created any playlists yet.\n\n" +
                                "Use `/playlist create-server` to create a server playlist, or " +
                                "`/playlist create-global` for a private playlist you can use anywhere."
                            )
                            .setThumbnail(avatarURL)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const serverList = serverPlaylists.length > 0
                ? serverPlaylists.map(p =>
                    `\`${p.playlistId}\` — **${p.name}** • ${p.songs.length} song(s)`
                  ).join("\n")
                : "*No server playlists in this guild.*";

            const globalList = globalPlaylists.length > 0
                ? globalPlaylists.map(p =>
                    `\`${p.playlistId}\` — **${p.name}** • ${p.songs.length} song(s)`
                  ).join("\n")
                : "*No private global playlists.*";

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.DEFAULT)
                        .setTitle("📋 Your Playlists")
                        .addFields(
                            { name: "🏠 Server Playlists (this guild)", value: serverList, inline: false },
                            { name: "🔒 Private Global Playlists",      value: globalList, inline: false },
                        )
                        .setThumbnail(avatarURL)
                        .setFooter({ text: `${footer} • Use /playlist view <id> to inspect a playlist` })
                        .setTimestamp(),
                ],
            });
        }


        // ─────────────────────────────────────────────────────────────────
        // SEARCH — search the user's own playlists by name
        // ─────────────────────────────────────────────────────────────────
        if (subcommand === "search") {
            const query = interaction.options.getString("name");

            const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex     = new RegExp(safeQuery, "i");

            const results = await Playlist.find({
                creatorId: user.id,
                name: { $regex: regex },
            }).lean();

            if (!results.length) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("🔍 No Results Found")
                            .setDescription(`None of your playlists match **${query}**.`)
                            .setThumbnail(avatarURL)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const list = results.map(p => {
                const typeLabel = p.type === "server" ? "🏠 Server" : "🔒 Global";
                return `\`${p.playlistId}\` — **${p.name}** • ${typeLabel} • ${p.songs.length} song(s)`;
            }).join("\n");

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.DEFAULT)
                        .setTitle(`🔍 Search Results for "${query}"`)
                        .setDescription(list)
                        .setThumbnail(avatarURL)
                        .setFooter({ text: `${footer} • ${results.length} result(s) found • Use /playlist view <id> to see a playlist` })
                        .setTimestamp(),
                ],
            });
        }


        // ─────────────────────────────────────────────────────────────────
        // VIEW
        // ─────────────────────────────────────────────────────────────────
        if (subcommand === "view") {
            const playlistId = interaction.options.getString("playlist-id");
            const playlist   = await Playlist.findOne({ playlistId }).lean();

            if (!playlist) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Playlist Not Found")
                            .setDescription(`No playlist exists with ID \`${playlistId}\`.`)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            // Server playlists are guild-restricted
            if (playlist.type === "server" && playlist.guildId !== guild.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Access Denied")
                            .setDescription("This is a server playlist from another guild.")
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            // Global playlists are private to their creator
            if (playlist.type === "global" && playlist.creatorId !== user.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Access Denied")
                            .setDescription("This is a private playlist. Only its creator can view it.")
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            return interaction.reply({
                components: buildViewComponents(playlist, 0, client),
                flags: MessageFlags.IsComponentsV2,
            });
        }


        // ─────────────────────────────────────────────────────────────────
        // ADD-SONG
        // ─────────────────────────────────────────────────────────────────
        if (subcommand === "add-song") {
            const playlistId = interaction.options.getString("playlist-id");
            const query      = interaction.options.getString("query");

            if (!isUrlSupported(query)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Unsupported Platform!")
                            .setDescription(
                                "The URL you provided is not from a supported platform.\n\n" +
                                "**Supported:** YouTube, SoundCloud, Deezer, Spotify, Twitch, Vimeo, or a direct stream URL.\n\n" +
                                "You can also just type a song name as a search query."
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
                            .setTitle("❌ Playlist Not Found")
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
                            .setTitle("❌ Not Your Playlist")
                            .setDescription("Only the creator of this playlist can add songs to it.")
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (playlist.type === "server" && playlist.guildId !== guild.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Access Denied")
                            .setDescription("This server playlist belongs to another guild.")
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
                            .setTitle("❌ No Nodes Available")
                            .setDescription("No music nodes are available right now. Please try again later.")
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            await interaction.deferReply();

            const nodes = [...client.lavalink.nodeManager.nodes.values()];
            const node  = nodes.find(n => n.connected) || nodes[0];

            if (!node) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ No Nodes Available")
                            .setDescription("Cannot resolve tracks right now. Please try again later.")
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                });
            }

            let result;
            try {
                result = await node.search({ query }, user);
            } catch (err) {
                logger.error("Search failed in /playlist add-song", err);
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Search Failed")
                            .setDescription(`Could not retrieve results for **${query}**.`)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                });
            }

            if (!result?.tracks?.length || result.loadType === "empty" || result.loadType === "error") {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ No Results Found")
                            .setDescription(`No results found for **${query}**.`)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                });
            }

            let tracksToAdd = [];

            if (result.loadType === "playlist") {
                tracksToAdd = result.tracks.map(t => ({
                    title:      t.info.title,
                    uri:        t.info.uri,
                    author:     t.info.author     || "Unknown",
                    duration:   t.info.duration   || 0,
                    sourceName: t.info.sourceName || "unknown",
                    artworkUrl: t.info.artworkUrl || null,
                    addedBy:    user.username,
                }));
            } else {
                const track = result.tracks[0];
                tracksToAdd = [{
                    title:      track.info.title,
                    uri:        track.info.uri,
                    author:     track.info.author     || "Unknown",
                    duration:   track.info.duration   || 0,
                    sourceName: track.info.sourceName || "unknown",
                    artworkUrl: track.info.artworkUrl || null,
                    addedBy:    user.username,
                }];
            }

            await Playlist.updateOne(
                { playlistId },
                { $push: { songs: { $each: tracksToAdd } } }
            );

            const first = tracksToAdd[0];

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.SUCCESS)
                        .setTitle(result.loadType === "playlist" ? "📋 Playlist Songs Added!" : "✅ Song Added to Playlist!")
                        .setDescription(
                            result.loadType === "playlist"
                                ? `Added **${tracksToAdd.length}** tracks from **${result.playlist?.name ?? "playlist"}** to \`${playlistId}\`.`
                                : `**[${first.title}](${first.uri})** has been added to \`${playlistId}\`.`
                        )
                        .addFields(
                            result.loadType !== "playlist"
                                ? [
                                    { name: "Author",   value: first.author,                   inline: true },
                                    { name: "Duration", value: formatDuration(first.duration), inline: true },
                                ]
                                : [
                                    { name: "Tracks Added", value: `${tracksToAdd.length}`, inline: true },
                                ]
                        )
                        .setThumbnail(first.artworkUrl || avatarURL)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }


        // ─────────────────────────────────────────────────────────────────
        // REMOVE-SONG
        // ─────────────────────────────────────────────────────────────────
        if (subcommand === "remove-song") {
            const playlistId = interaction.options.getString("playlist-id");
            const songQuery  = interaction.options.getString("song");
            const playlist   = await Playlist.findOne({ playlistId });

            if (!playlist) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Playlist Not Found")
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
                            .setTitle("❌ Not Your Playlist")
                            .setDescription("Only the creator of this playlist can remove songs from it.")
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const lowerQuery = songQuery.toLowerCase().trim();
            const songIndex  = playlist.songs.findIndex(s =>
                s.uri === songQuery ||
                s.title.toLowerCase() === lowerQuery ||
                s.title.toLowerCase().includes(lowerQuery)
            );

            if (songIndex === -1) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Song Not Found")
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
                        .setTitle("🗑️ Song Removed from Playlist")
                        .setDescription(`**${removedSong.title}** has been permanently removed from \`${playlistId}\`.`)
                        .addFields(
                            { name: "Author",   value: removedSong.author || "Unknown",      inline: true },
                            { name: "Duration", value: formatDuration(removedSong.duration), inline: true },
                        )
                        .setThumbnail(removedSong.artworkUrl || avatarURL)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }


        // ─────────────────────────────────────────────────────────────────
        // DELETE-SERVER
        // ─────────────────────────────────────────────────────────────────
        if (subcommand === "delete-server") {
            const playlistId = interaction.options.getString("playlist-id");
            const playlist   = await Playlist.findOne({ playlistId });

            if (!playlist) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Playlist Not Found")
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
                            .setTitle("❌ Not Your Playlist")
                            .setDescription("You can only delete playlists you created.")
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (playlist.type !== "server") {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Wrong Playlist Type")
                            .setDescription("Use `/playlist delete-global` to delete a private global playlist.")
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
                            .setTitle("❌ Access Denied")
                            .setDescription("This server playlist belongs to another guild.")
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
                        .setTitle("🗑️ Server Playlist Deleted")
                        .setDescription(`The server playlist **${playlist.name}** (\`${playlistId}\`) has been permanently deleted.`)
                        .setThumbnail(avatarURL)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }


        // ─────────────────────────────────────────────────────────────────
        // DELETE-GLOBAL
        // ─────────────────────────────────────────────────────────────────
        if (subcommand === "delete-global") {
            const playlistId = interaction.options.getString("playlist-id");
            const playlist   = await Playlist.findOne({ playlistId });

            if (!playlist) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Playlist Not Found")
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
                            .setTitle("❌ Not Your Playlist")
                            .setDescription("You can only delete playlists you created.")
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (playlist.type !== "global") {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Wrong Playlist Type")
                            .setDescription("Use `/playlist delete-server` to delete a server playlist.")
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
                        .setTitle("🗑️ Private Playlist Deleted")
                        .setDescription(`Your private playlist **${playlist.name}** (\`${playlistId}\`) has been permanently deleted.`)
                        .setThumbnail(avatarURL)
                        .setFooter({ text: footer })
                        .setTimestamp(),
                ],
            });
        }


        // ─────────────────────────────────────────────────────────────────
        // PLAY
        // ─────────────────────────────────────────────────────────────────
        if (subcommand === "play") {
            const playlistId = interaction.options.getString("playlist-id");
            const playlist   = await Playlist.findOne({ playlistId }).lean();

            if (!playlist) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Playlist Not Found")
                            .setDescription(`No playlist exists with the ID \`${playlistId}\`.`)
                            .setThumbnail(avatarURL)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            // Access control
            if (playlist.type === "server" && playlist.guildId !== guild.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Access Denied")
                            .setDescription("This server playlist belongs to another guild and cannot be played here.")
                            .setThumbnail(avatarURL)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (playlist.type === "global" && playlist.creatorId !== user.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Access Denied")
                            .setDescription("This is a private playlist. Only its creator can play it.")
                            .setThumbnail(avatarURL)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (!playlist.songs.length) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("📭 Playlist Is Empty")
                            .setDescription(`The playlist **${playlist.name}** has no songs yet. Add some with \`/playlist add-song\`.`)
                            .setThumbnail(avatarURL)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const voiceChannel = member.voice?.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("‼️ Please Join A Voice Channel First!")
                            .setDescription("You need to be in a voice channel to play a playlist.")
                            .setThumbnail(avatarURL)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            const botVC = guild.members.me?.voice?.channel;
            if (botVC && botVC.id !== voiceChannel.id) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("‼️ I'm Already Playing!")
                            .setDescription(`I'm already in <#${botVC.id}>. Join that channel to use me.`)
                            .setThumbnail(avatarURL)
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
                            .setTitle("❌ No Nodes Available")
                            .setDescription("No music nodes are available right now. Please try again later.")
                            .setThumbnail(avatarURL)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                    flags: MessageFlags.Ephemeral,
                });
            }

            await interaction.deferReply();

            const player = client.lavalink.createPlayer({
                guildId:        interaction.guildId,
                voiceChannelId: voiceChannel.id,
                textChannelId:  interaction.channelId,
                selfDeaf:       true,
            });

            if (!player.connected) await player.connect();

            const wasPlaying = player.playing || player.paused;
            let loaded       = 0;

            for (const song of playlist.songs) {
                try {
                    // Try the stored URI first. If lavalink cannot resolve it
                    // (e.g. expired YouTube stream), fall back to a title search.
                    let res = await player.search({ query: song.uri }, user);

                    if (!res?.tracks?.length || res.loadType === "empty" || res.loadType === "error") {
                        res = await player.search(
                            { query: `${song.title} ${song.author}` },
                            user
                        );
                    }

                    if (res?.tracks?.length) {
                        await player.queue.add(res.tracks[0]);
                        loaded++;
                    }
                } catch {
                    // Skip any individual track that fails to resolve
                }
            }

            if (loaded === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(COLORS.ERROR)
                            .setTitle("❌ Could Not Load Playlist")
                            .setDescription(`None of the songs in **${playlist.name}** could be resolved. They may have been removed from their source platform.`)
                            .setFooter({ text: footer })
                            .setTimestamp(),
                    ],
                });
            }

            if (!wasPlaying) {
                await player.play();
            } else {
                await syncNpMessage(player);
            }

            const typeLabel = playlist.type === "global" ? "🔒 Private Global" : "🏠 Server";

            const resultContainer = new ContainerBuilder()
                .setAccentColor(0xFF7F50)
                .addSectionComponents((section) =>
                    section
                        .addTextDisplayComponents((text) =>
                            text.setContent(
                                `## 📋 Playlist Loaded!\n` +
                                `**${playlist.name}** — ${loaded} of ${playlist.songs.length} track(s) added to the queue.\n` +
                                (wasPlaying ? "-# ✅ Tracks appended to the current queue." : "-# ▶️ Playback starting now.")
                            )
                        )
                        .setThumbnailAccessory((thumb) => thumb.setURL(avatarURL))
                )
                .addSeparatorComponents((sep) =>
                    sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
                )
                .addTextDisplayComponents((text) =>
                    text.setContent(
                        `**Type:** ${typeLabel}   ·   **Requested by:** ${user}\n` +
                        `-# ${footer} · Playlist ID: ${playlist.playlistId}`
                    )
                );

            return interaction.editReply({
                components: [resultContainer],
                flags: MessageFlags.IsComponentsV2,
            });
        }
    },
};
