require("dotenv").config();
const { ContainerBuilder, StringSelectMenuBuilder, MessageFlags, SeparatorSpacingSize } = require("discord.js");
const { formatDuration } = require("./formatDuration.js");
const { syncNpMessage } = require("./npButtonUtils.js");

/* You can add more songs into each genres, add it inside the songs: [] array.
You can remove or modify one genres right in here! */

const GENRES = {
    pop: {
        label: "🎵 Pop",
        description: "Modern chart-topping pop hits",
        songs: [
            "Blinding Lights The Weeknd",
            "Shape of You Ed Sheeran",
            "Anti-Hero Taylor Swift",
            "Stay The Kid LAROI Justin Bieber",
            "As It Was Harry Styles",
            "Levitating Dua Lipa",
            "Bad Guy Billie Eilish",
            "Watermelon Sugar Harry Styles",
            "Shake It Off Taylor Swift",
            "Uptown Funk Bruno Mars",
            "Flowers Miley Cyrus",
            "Kill Bill SZA",
            "Good 4 U Olivia Rodrigo",
            "Heat Waves Glass Animals",
            "Golden Hour JVKE",
            "Shivers Ed Sheeran",
            "Peaches Justin Bieber",
            "Dynamite BTS",
            "Butter BTS",
            "Permission to Dance BTS",
        ],
    },
    hiphop: {
        label: "🎤 Hip-Hop",
        description: "Rap and hip-hop bangers",
        songs: [
            "God's Plan Drake",
            "HUMBLE Kendrick Lamar",
            "Lucid Dreams Juice WRLD",
            "Rockstar Post Malone",
            "Sicko Mode Travis Scott",
            "Sunflower Post Malone Spider-Man",
            "XO Tour Llif3 Lil Uzi Vert",
            "Hotline Bling Drake",
            "The Box Roddy Ricch",
            "Life Is Good Future Drake",
            "Rich Flex Drake 21 Savage",
            "First Class Jack Harlow",
            "Wait For U Future Drake",
            "Jimmy Cooks Drake",
            "Industry Baby Lil Nas X",
            "Montero Lil Nas X",
            "Mask Off Future",
            "Congratulations Post Malone",
            "No Role Modelz J Cole",
            "Love Yourz J Cole",
            "Body Rock",
        ],
    },
    rock: {
        label: "🎸 Rock",
        description: "Classic and modern rock anthems",
        songs: [
            "Mr. Brightside The Killers",
            "Bohemian Rhapsody Queen",
            "Sweet Child O Mine Guns N Roses",
            "Smells Like Teen Spirit Nirvana",
            "Wonderwall Oasis",
            "Seven Nation Army The White Stripes",
            "Basket Case Green Day",
            "Highway to Hell AC DC",
            "Welcome to the Black Parade My Chemical Romance",
            "Don't Stop Believin Journey",
            "Believer Imagine Dragons",
            "Thunder Imagine Dragons",
            "Enemy Imagine Dragons",
            "Radioactive Imagine Dragons",
            "Do I Wanna Know Arctic Monkeys",
            "R U Mine Arctic Monkeys",
            "Pumped Up Kicks Foster The People",
            "In the End Linkin Park",
            "Breaking the Habit Linkin Park",
            "Chop Suey System Of A Down",
        ],
    },
    rnb: {
        label: "💜 R&B / Soul",
        description: "Smooth R&B and soulful tracks",
        songs: [
            "No Scrubs TLC",
            "Crazy in Love Beyonce",
            "Leave The Door Open Silk Sonic",
            "Essence Wizkid",
            "Love On Top Beyonce",
            "Earned It The Weeknd",
            "Stay With Me Sam Smith",
            "Adorn Miguel",
            "Do I Do Stevie Wonder",
            "Differences Ginuwine",
            "Best Part Daniel Caesar",
            "Location Khalid",
            "Talk Khalid",
            "Young Dumb Broke Khalid",
            "No Guidance Chris Brown",
            "Come Through H.E.R.",
            "Slow Motion Trey Songz",
            "Superstar Usher",
            "Burn Usher",
            "Say Yes Floetry",
        ],
    },
    edm: {
        label: "🎹 Electronic / EDM",
        description: "High-energy electronic dance music",
        songs: [
            "Titanium David Guetta",
            "Wake Me Up Avicii",
            "Animals Martin Garrix",
            "Levels Avicii",
            "Don't You Worry Child Swedish House Mafia",
            "Midnight City M83",
            "Clarity Zedd",
            "Lean On Major Lazer",
            "Scared to Be Lonely Martin Garrix",
            "Happier Marshmello Bastille",
            "One More Time Daft Punk",
            "Get Lucky Daft Punk",
            "Turn Down For What DJ Snake Lil Jon",
            "Pompeii Bastille",
            "Blue Da Ba Dee Eiffel 65",
            "Beautiful Now Zedd",
            "Stay the Night Zedd Hayley Williams",
            "Summer Calvin Harris",
            "This Is What You Came For Calvin Harris",
            "Lean On DJ Snake",
        ],
    },
    classical: {
        label: "🎻 Classical",
        description: "Beautiful classical masterpieces",
        songs: [
            "Moonlight Sonata Beethoven",
            "Clair de Lune Debussy",
            "Canon in D Pachelbel",
            "Four Seasons Summer Vivaldi",
            "Symphony No 5 Beethoven",
            "Fur Elise Beethoven",
            "Nocturne Op 9 No 2 Chopin",
            "The Blue Danube Strauss",
            "Gymnopedie No 1 Erik Satie",
            "Air on G String Bach",
            "Symphony No 9 Beethoven",
            "Toccata and Fugue in D Minor Bach",
            "Four Seasons Spring Vivaldi",
            "Symphony No 40 Mozart",
            "La Mer Debussy",
            "Gymnopedie No 3 Satie",
            "Waltz in B Minor Chopin",
            "Etude Op 10 No 4 Chopin",
            "Ode to Joy Beethoven",
            "Hungarian Rhapsody No 2 Liszt",
        ],
    },
    lofi: {
        label: "☁️ Lo-Fi / Chill",
        description: "Relaxing lo-fi beats to chill to",
        songs: [
            "Snowfall lofi Oneheart",
            "lofi hip hop study beats",
            "coffee break lofi chill",
            "sunset lofi hip hop",
            "midnight lofi beats",
            "dreamy lofi piano chill",
            "rainy day lofi music",
            "lofi chill vibes study",
            "sleepy lofi beats",
            "peaceful lofi morning",
            "late night lofi music",
            "lofi winter vibes",
            "calm lofi study music",
            "lofi jazz hip hop",
            "chillhop essentials",
            "lofi anime beats",
            "lofi city pop vibes",
            "cozy lofi evening",
            "lofi piano relax",
            "focus lofi music beats",
        ],
    },
    opm: {
        label: "🌍 OPM (Original Pilipino Music)",
        description: "Top OPM hits in the Philippines",
        songs: [
            "Mundo Iv Of Spades",
            "Simpleng Tao Gloc 9",
            "Saranggola Ben&Ben",
            "Torete Moira Dela Torre",
            "Ulan Cuèshe",
            "Multo Cup Of Joe",
            "214 Rivermaya",
            "Your Universe Rico Blanco",
            "Pagtingin Ben&Ben",
            "Huling Sandali December Avenue",
            "Come Inside Of My Heart Iv Of Spades",
            "Bagsakan Parokya Ni Edgar",
            "Blue Sky Hale",
            "Ere Ka Sa Eraserheads",
            "Ligaya Eraserheads",
            "With A Smile Eraserheads",
            "Narda Kamikazee",
            "Magbalik Callalily",
            "Tadhana Up Dharma Down",
            "Kathang Isip Ben&Ben",
            "Di Na Muli December Avenue",
            "Migraine December Avenue",
            "Hawak Kamay Yeng Constantino",
            "Ikaw At Ako Moira Dela Torre Jason Marvin",
        ],
    },
};

function buildMenuOptions() {
    return Object.entries(GENRES).map(([key, genre]) => ({
        label: genre.label,
        description: genre.description,
        value: key,
    }));
}

function buildRecommendComponents(client) {
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? "https://cdn.discordapp.com/embed/avatars/0.png";

    const container = new ContainerBuilder()
        .setAccentColor(0xFF7F50)
        .addSectionComponents((section) =>
            section
                .addTextDisplayComponents((text) =>
                    text.setContent(
                        "## ❔ Confused?\n" +
                        "Got nothing to play? **Dreama** has you covered with the **Recommend System!**\n" +
                        "Choose your favorite genre below and Dreama will pick a **🎶 Song** just for you."
                    )
                )
                .setThumbnailAccessory((thumb) => thumb.setURL(avatarURL))
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents((row) =>
            row.addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("recommend_genre")
                    .setPlaceholder("🎶 Pick your favorite genre...")
                    .addOptions(buildMenuOptions())
            )
        );

    return [container];
}

function buildRecommendResultComponents(track, genre, wasPlaying, avatarURL, interaction) {
    const thumbnailUrl = track.info.artworkUrl || avatarURL;
    const options = buildMenuOptions();

    const container = new ContainerBuilder()
        .setAccentColor(0xFF7F50)
        .addSectionComponents((section) =>
            section
                .addTextDisplayComponents((text) =>
                    text.setContent(
                        `## 🎶 Dreama Recommends — ${genre.label}\n` +
                        `**[${track.info.title}](${track.info.uri})**\n\n` +
                        (wasPlaying ? "-# ✅ Added to queue!" : "-# ▶️ Now playing!")
                    )
                )
                .setThumbnailAccessory((thumb) => thumb.setURL(thumbnailUrl))
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents((text) =>
            text.setContent(
                `**Author:** ${track.info.author || "Unknown"}\n` +
                `**Duration:** ${formatDuration(track.info.duration)}\n` +
                `**Requested by:** ${interaction.user}`
            )
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents((row) =>
            row.addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("recommend_genre")
                    .setPlaceholder("🎶 Pick your favorite genre...")
                    .addOptions(options)
                    .setDisabled(true)
            )
        );

    return [container];
}

function buildRecommendErrorComponents(message, avatarURL) {
    const options = buildMenuOptions();

    const container = new ContainerBuilder()
        .setAccentColor(0xFF7F50)
        .addSectionComponents((section) =>
            section
                .addTextDisplayComponents((text) =>
                    text.setContent(`## ❌ Something Went Wrong\n${message}`)
                )
                .setThumbnailAccessory((thumb) => thumb.setURL(avatarURL))
        )
        .addSeparatorComponents((sep) =>
            sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addActionRowComponents((row) =>
            row.addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("recommend_genre")
                    .setPlaceholder("🎶 Pick your favorite genre...")
                    .addOptions(options)
                    .setDisabled(true)
            )
        );

    return [container];
}

async function handleRecommendSelect(interaction, client) {
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? "https://cdn.discordapp.com/embed/avatars/0.png";
    const footer = process.env.FOOTER || "Dreama";
    const genreKey = interaction.values[0];
    const genre = GENRES[genreKey];

    if (!genre) {
        return interaction.reply({
            content: "❌ Unknown genre selected.",
            flags: MessageFlags.Ephemeral,
        });
    }

    const voiceChannel = interaction.member.voice?.channel;

    if (!voiceChannel) {
        return interaction.reply({
            embeds: [{
                color: 0xFF7F50,
                title: "‼️ Please Join A Voice Channel First!",
                description: "You need to be in a voice channel to use the recommend system.",
                thumbnail: { url: avatarURL },
                timestamp: new Date().toISOString(),
                footer: { text: footer },
            }],
            flags: MessageFlags.Ephemeral,
        });
    }

    const botVC = interaction.guild.members.me?.voice?.channel;
    if (botVC && botVC.id !== voiceChannel.id) {
        return interaction.reply({
            embeds: [{
                color: 0xFF7F50,
                title: "‼️ I'm Already Playing!",
                description: `I'm already in <#${botVC.id}>. Join that channel to use me.`,
                thumbnail: { url: avatarURL },
                timestamp: new Date().toISOString(),
                footer: { text: footer },
            }],
            flags: MessageFlags.Ephemeral,
        });
    }

    if (!client.lavalink.useable) {
        return interaction.reply({
            embeds: [{
                color: 0xFF7F50,
                title: "❌ Internal Error Occurred.",
                description: "No music nodes are available right now. Please try again later.",
                thumbnail: { url: avatarURL },
                timestamp: new Date().toISOString(),
                footer: { text: footer },
            }],
            flags: MessageFlags.Ephemeral,
        });
    }

    await interaction.deferUpdate();

    const randomSong = genre.songs[Math.floor(Math.random() * genre.songs.length)];

    try {
        const player = client.lavalink.createPlayer({
            guildId: interaction.guildId,
            voiceChannelId: voiceChannel.id,
            textChannelId: interaction.channelId,
            selfDeaf: true,
        });

        if (!player.connected) await player.connect();

        const result = await player.search({ query: randomSong }, interaction.user);

        if (!result?.tracks?.length || result.loadType === "empty" || result.loadType === "error") {
            return interaction.editReply({
                components: buildRecommendErrorComponents(
                    `Dreama tried to find a **${genre.label}** song but couldn't load any results. Please try again!`,
                    avatarURL
                ),
                flags: MessageFlags.IsComponentsV2,
            });
        }

        const pickCount = Math.min(result.tracks.length, 3);
        const track = result.tracks[Math.floor(Math.random() * pickCount)];
        const wasPlaying = player.playing || player.paused;

        await player.queue.add(track);
        if (!wasPlaying) await player.play();
        else await syncNpMessage(player);

        return interaction.editReply({
            components: buildRecommendResultComponents(track, genre, wasPlaying, avatarURL, interaction),
            flags: MessageFlags.IsComponentsV2,
        });

    } catch {
        return interaction.editReply({
            components: buildRecommendErrorComponents(
                "Dreama ran into an error while fetching your recommendation. Please try again.",
                avatarURL
            ),
            flags: MessageFlags.IsComponentsV2,
        });
    }
}

module.exports = { buildRecommendComponents, handleRecommendSelect };
