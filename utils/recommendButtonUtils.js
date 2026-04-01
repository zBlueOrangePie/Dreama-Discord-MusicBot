require('dotenv').config();
const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, MessageFlags, } = require('discord.js');
const { formatDuration } = require('./formatDuration.js');
const { syncNpMessage } = require('./npButtonUtils.js');

const GENRES = {
    pop: {
        label: '🎵 Pop',
        description: 'Modern chart-topping pop hits',
        songs: [
            'Blinding Lights The Weeknd',
            'Shape of You Ed Sheeran',
            'Anti-Hero Taylor Swift',
            'Stay The Kid LAROI Justin Bieber',
            'As It Was Harry Styles',
            'Levitating Dua Lipa',
            'Bad Guy Billie Eilish',
            'Watermelon Sugar Harry Styles',
            'Shake It Off Taylor Swift',
            'Uptown Funk Bruno Mars',
        ],
    },
    hiphop: {
        label: '🎤 Hip-Hop',
        description: 'Rap and hip-hop bangers',
        songs: [
            "God's Plan Drake",
            'HUMBLE Kendrick Lamar',
            'Lucid Dreams Juice WRLD',
            'Rockstar Post Malone',
            'Sicko Mode Travis Scott',
            'Sunflower Post Malone Spider-Man',
            'XO Tour Llif3 Lil Uzi Vert',
            'Hotline Bling Drake',
            'The Box Roddy Ricch',
            'Life Is Good Future Drake',
        ],
    },
    rock: {
        label: '🎸 Rock',
        description: 'Classic and modern rock anthems',
        songs: [
            'Mr. Brightside The Killers',
            'Bohemian Rhapsody Queen',
            "Sweet Child O Mine Guns N Roses",
            'Smells Like Teen Spirit Nirvana',
            'Wonderwall Oasis',
            'Seven Nation Army The White Stripes',
            'Basket Case Green Day',
            'Highway to Hell AC DC',
            'Welcome to the Black Parade My Chemical Romance',
            "Don't Stop Believin Journey",
        ],
    },
    rnb: {
        label: '💜 R&B / Soul',
        description: 'Smooth R&B and soulful tracks',
        songs: [
            'No Scrubs TLC',
            'Crazy in Love Beyonce',
            'Leave The Door Open Silk Sonic',
            'Essence Wizkid',
            'Love On Top Beyonce',
            'Earned It The Weeknd',
            'Stay With Me Sam Smith',
            'Adorn Miguel',
            'Do I Do Stevie Wonder',
            'Differences Ginuwine',
        ],
    },
    edm: {
        label: '🎹 Electronic / EDM',
        description: 'High-energy electronic dance music',
        songs: [
            'Titanium David Guetta',
            'Wake Me Up Avicii',
            'Animals Martin Garrix',
            'Levels Avicii',
            "Don't You Worry Child Swedish House Mafia",
            'Midnight City M83',
            'Clarity Zedd',
            'Lean On Major Lazer',
            'Scared to Be Lonely Martin Garrix',
            'Happier Marshmello Bastille',
        ],
    },
    jazz: {
        label: '🎺 Jazz',
        description: 'Timeless jazz classics',
        songs: [
            'Take Five Dave Brubeck',
            'So What Miles Davis',
            'Autumn Leaves Chet Baker',
            'Fly Me to the Moon Frank Sinatra',
            'What a Wonderful World Louis Armstrong',
            'Summertime Billie Holiday',
            'Blue in Green Bill Evans',
            'Round Midnight Thelonious Monk',
            'My Favorite Things John Coltrane',
            'Girl from Ipanema Stan Getz',
        ],
    },
    classical: {
        label: '🎻 Classical',
        description: 'Beautiful classical masterpieces',
        songs: [
            'Moonlight Sonata Beethoven',
            'Clair de Lune Debussy',
            'Canon in D Pachelbel',
            'Four Seasons Summer Vivaldi',
            'Symphony No 5 Beethoven',
            'Fur Elise Beethoven',
            'Nocturne Op 9 No 2 Chopin',
            'The Blue Danube Strauss',
            'Gymnopedie No 1 Erik Satie',
            'Air on G String Bach',
        ],
    },
    lofi: {
        label: '☁️ Lo-Fi / Chill',
        description: 'Relaxing lo-fi beats to chill to',
        songs: [
            'Snowfall lofi Oneheart',
            'lofi hip hop study beats',
            'coffee break lofi chill',
            'sunset lofi hip hop',
            'midnight lofi beats',
            'dreamy lofi piano chill',
            'rainy day lofi music',
            'lofi chill vibes study',
            'sleepy lofi beats',
            'peaceful lofi morning',
        ],
    },
    opm: {
        label: '🌍 OPM (Original Pilipino Music)',
        description: 'Top OPM hits in the Philippines',
        songs: [
            'Mundo Iv Of Spades',
            'Simpleng Tao Gloc 9',
            'Saranggola Ben&Ben',
            "Torete Moira Dela Torre",
            'Ulan Cuèshe',
            'Multo Cup Of Joe',
            '214 Rivermaya',
            'Your Universe Rico Blanco',
            'Pagtingin Ben&Ben',
            'Huling Sandali December Avenue',
            'Come Inside Of My Heart Iv Of Spades',
            'Bagsakan Parokya Ni Edgar',
            'Blue Sky Hale',
        ],
    },
    country: {
        label: '🤠 Country',
        description: 'Classic and modern country tunes',
        songs: [
            'Old Town Road Lil Nas X',
            'Friends in Low Places Garth Brooks',
            'Before He Cheats Carrie Underwood',
            'Jolene Dolly Parton',
            'Take Me Home Country Roads John Denver',
            'Wagon Wheel Darius Rucker',
            'Tennessee Whiskey Chris Stapleton',
            'Cruise Florida Georgia Line',
            'Body Like a Back Road Sam Hunt',
            'Die a Happy Man Thomas Rhett',
        ],
    },
};

function buildGenreSelectMenu() {
    const options = Object.entries(GENRES).map(([key, genre]) => ({
        label: genre.label,
        description: genre.description,
        value: key,
    }));

    const menu = new StringSelectMenuBuilder()
        .setCustomId('recommend_genre')
        .setPlaceholder('🎶 Pick your favorite genre...')
        .addOptions(options);

    return new ActionRowBuilder().addComponents(menu);
}

function buildRecommendEmbed(client) {
    const footer = process.env.FOOTER || 'Dreama';
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;

    const embed = new EmbedBuilder()
        .setColor('FF7F50')
        .setTitle('❔ Confused?')
        .setDescription(
            "Got Nothing To Play? Okay then! __**Dreama**__ got you covered with our **recommend system!** " +
            "Just choose whats your favorite genre and we will be picking any **🎶 SONG** from that genre"
        )
        .setFooter({ text: footer })
        .setTimestamp();

    if (avatarURL) embed.setThumbnail(avatarURL);

    return embed;
}

async function handleRecommendSelect(interaction, client) {
    const footer = process.env.FOOTER || 'Dreama';
    const avatarURL = client?.user?.displayAvatarURL({ dynamic: true, size: 256 }) ?? null;

    const genreKey = interaction.values[0];
    const genre = GENRES[genreKey];

    if (!genre) {
        return interaction.reply({
            content: '❌ Unknown genre selected.',
            flags: MessageFlags.Ephemeral,
        });
    }

    const voiceChannel = interaction.member.voice?.channel;

    if (!voiceChannel) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('FF7F50')
                    .setTitle('‼️ Please Join A Voice Channel First!')
                    .setDescription('You need to be in a voice channel to use the recommend system.')
                    .setFooter({ text: footer })
                    .setThumbnail(avatarURL)
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
                    .setColor('FF7F50')
                    .setTitle("‼️ I'm Already Playing!")
                    .setDescription(`I'm already in <#${botVoiceChannel.id}>. Join that channel to use me.`)
                    .setFooter({ text: footer })
                    .setThumbnail(avatarURL)
                    .setTimestamp(),
            ],
            flags: MessageFlags.Ephemeral,
        });
    }

    if (!client.lavalink.useable) {
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('FF7F50')
                    .setTitle('❌ Internal Error Occurred.')
                    .setDescription('No music nodes are available right now. Please try again later.')
                    .setFooter({ text: footer })
                    .setThumbnail(avatarURL)
                    .setTimestamp(),
            ],
            flags: MessageFlags.Ephemeral,
        });
    }

    await interaction.deferUpdate();

    const randomSong = genre.songs[Math.floor(Math.random() * genre.songs.length)];

    let result;
    try {
        const player = client.lavalink.createPlayer({
            guildId: interaction.guildId,
            voiceChannelId: voiceChannel.id,
            textChannelId: interaction.channelId,
            selfDeaf: true,
        });

        if (!player.connected) await player.connect();

        result = await player.search({ query: randomSong }, interaction.user);

        if (!result?.tracks?.length || result.loadType === 'empty' || result.loadType === 'error') {
            const disabledRow = buildDisabledGenreSelectMenu();
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('FF7F50')
                        .setTitle('❌ Could Not Find a Song')
                        .setDescription(`Dreama tried to find a **${genre.label}** song but couldn't load any results. Please try again!`)
                        .setFooter({ text: footer })
                        .setThumbnail(avatarURL)
                        .setTimestamp(),
                ],
                components: [disabledRow],
            });
        }

        const pickCount = Math.min(result.tracks.length, 3);
        const track = result.tracks[Math.floor(Math.random() * pickCount)];

        const wasPlaying = player.playing || player.paused;
        await player.queue.add(track);
        if (!wasPlaying) await player.play();
        else await syncNpMessage(player);

        const disabledRow = buildDisabledGenreSelectMenu();

        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor('FF7F50')
                    .setTitle(`🎶 Dreama Recommends — ${genre.label}`)
                    .setDescription(`**[${track.info.title}](${track.info.uri})**`)
                    .addFields(
                        { 
                          name: 'Author', 
                          value: track.info.author || 'Unknown', 
                          inline: true 
                        },
                        { 
                          name: 'Duration', 
                          value: formatDuration(track.info.duration), 
                          inline: true 
                        },
                        { 
                          name: 'Requested By', 
                          value: `${interaction.user}`, 
                          inline: true 
                        },
                    )
                    .setThumbnail(track.info.artworkUrl || avatarURL)
                    .setFooter({ text: footer })
                    .setTimestamp(),
            ],
            components: [disabledRow],
        });
    } catch (err) {
        const disabledRow = buildDisabledGenreSelectMenu();
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor('FF7F50')
                    .setTitle('❌ Something Went Wrong')
                    .setDescription('Dreama ran into an error while fetching your recommendation. Please try again.')
                    .setFooter({ text: footer })
                    .setThumbnail(avatarURL)
                    .setTimestamp(),
            ],
            components: [disabledRow],
        });
    }
}

function buildDisabledGenreSelectMenu() {
    const options = Object.entries(GENRES).map(([key, genre]) => ({
        label: genre.label,
        description: genre.description,
        value: key,
    }));

    const menu = new StringSelectMenuBuilder()
        .setCustomId('recommend_genre')
        .setPlaceholder('🎶 Pick your favorite genre...')
        .addOptions(options)
        .setDisabled(true);

    return new ActionRowBuilder().addComponents(menu);
}

module.exports = { buildRecommendEmbed, buildGenreSelectMenu, handleRecommendSelect };
