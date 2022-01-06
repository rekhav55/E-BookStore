const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
    comment : String,
    author : {
        id : {
           type : mongoose.Schema.Types.ObjectId,
           ref: "user"
        },
        name : String
    },

    book : {
        id : {
            type : mongoose.Schema.Types.ObjectId,
            ref: "books"
        },

        bookName : String
    },
    date : {type : Date, default : Date.now()},
});

module.exports = new mongoose.model("comment", commentSchema);