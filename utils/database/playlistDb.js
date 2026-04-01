const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    title: { 
      type: String, 
      required: true 
    },
    uri: { 
      type: String, 
      required: true 
    },
    author: { 
      type: String, 
      default: 'Unknown' 
    },
    duration: { 
      type: Number, 
      default: 0 
    },
    sourceName: { 
      type: String, 
      default: 'unknown' 
    },
    artworkUrl: { 
      type: String, 
      default: null 
    },
    addedBy: { 
      type: String, 
      default: 'Unknown' 
    },
    addedAt: { 
      type: Date, 
      default: Date.now 
    },
}, { _id: false });

const playlistSchema = new mongoose.Schema({
    playlistId: { 
      type: String, 
      required: true, 
      unique: true 
    },
    name: { 
      type: String, 
      required: true 
    },
    description: { 
      type: String, 
      default: '' 
    },
    type: { 
      type: String, 
      enum: ['global', 'server'], 
      required: true 
    },
    guildId: { 
      type: String, 
      default: null 
    },
    creatorId: { 
      type: String, 
      required: true 
    },
    creatorUsername: { 
      type: String, 
      default: 'Unknown' 
    },
    creatorDisplayName: { 
      type: String, 
      default: 'Unknown' 
    },
    songs: [songSchema],
    createdAt: { 
      type: Date, 
      default: Date.now 
    },
});

module.exports = mongoose.model('Playlist', playlistSchema);
  
