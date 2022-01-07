const mongoose = require('mongoose');
const activitySchema = new mongoose.Schema({
    user : {
        id: String,
        name: String
    },
    category: String,
    book : {
        id: String,
        name: String
    },
    comment: {
        id: String,
        text: String
    },
    entryTime : {
        type: Date,
        default: Date.now(),
    }
});

module.exports = new mongoose.model('activity', activitySchema);