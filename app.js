const express = require('express');
const app = express();
const router = express.Router();
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI,{
    useNewUrlParser: true, useUnifiedTopology: true,
}).then(()=>{
    console.log('Database connected...');
});

const port = process.env.PORT || 3000;

app.set('view engine','ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname+'/public'));

app.use('/', require('./routes/index'));
app.use('/books', require('./routes/book'));

app.listen(port, ()=>{console.log('You are listening on port 3000')});
