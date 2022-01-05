const mongoose = require('mongoose');
const bookSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    ISBN : {
        type: String,
        required: true
    },
    author:{
        type:String,
        required: true
    },
    image: {
        type: String
    },
    pdf:{
        type:String
    },
    description: {
        type:String,
        required:true
    },
    price:{
        type:String,
        required:true
    },
    category:{
        type:String,
        required: true
    }
});

module.exports = new mongoose.model('book',bookSchema);