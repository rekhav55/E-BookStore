const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email : {
        type: String,
        required: true
    },
    password : {
        type: String,
        required: true
    },
    booksBought : [{
        type: String
    }]
});

module.exports = new mongoose.model('user', userSchema);