const express= require('express');
const router = express.Router();
const upload = require("../utils/multer");
const cloudinary = require("../utils/cloudinary");
// const multer = require('multer');
const book = require('../models/books');
const activity = require('../models/activity');
const comment = require('../models/comment');
const path=require('path');
const alert = require('alert');

router.use(express.static(__dirname+'/public'));
// const storage = multer.diskStorage({
//     destination: function(req,file,cb){
//         cb(null,'./public/uploads');
//     },

//     filename: function(req,file,cb){
//         cb(null,file.fieldname + "-" + Date.now() + path.extname(file.originalname));
//     }
// });

// const upload = multer({
//     storage: storage
// });
var multipleUpload = upload.fields([{name:'image', maxCount:1},{name:'pdf',maxCount:1}]);
// var multipleUpload = upload.fields([{name:'image', maxCount:1},{name:'pdf',maxCount:1}]);

router.get('/add',(req,res)=>{
    res.render('addBook');
});

router.post('/add',multipleUpload, async(req,res)=>{
    // const { name, author, ISBN, description, price, category} = req.body;
    const result = await cloudinary.uploader.upload(req.files['image'][0].path);
    const result2 = await cloudinary.uploader.upload(req.files['pdf'][0].path);
    // const image = req.files['image'][0].filename;
    // const pdf = req.files['pdf'][0].filename;
    // const {image} = result.secure_url;
    // const {pdf}=result2.secure_url;

    book.findOne({ISBN: req.body.ISBN}, async(err,data)=>{
        if(err) throw err;
        if(data){
            err = 'Book Already Exists'
            res.render('addBook',{'name': name, 'err':err});
        }
        else{
            let books = new book({
                name: req.body.name,
                author: req.body.author,
                ISBN: req.body.ISBN,
                description: req.body.description,
                price: req.body.price,
                category: req.body.category,
                image: result.secure_url,
                pdf: result2.secure_url
            })
            await books.save((err,data)=>{
                if(err) throw err;
                res.redirect('/adminDashboard');
            });
        }
    })
});

router.get('/delete/:id', (req,res)=>{
    const x = req.params.id;
    book.findByIdAndRemove(x, function(err,data){
        if(err) throw err;
        else res.redirect('/adminDashboard');
    })
});

router.get('/update/:id', (req,res)=>{
    const x = req.params.id;
    book.findById(x, function(err,data){
        if(err) throw err;
        else res.render('updateBook',{bookData: data});
    });
});

router.post('/update/:id', (req,res)=>{
    const updatedData = {
        name: req.body.name,
        author: req.body.author,
        description: req.body.description,
        price: req.body.price
    }
    book.findByIdAndUpdate(req.params.id, updatedData, function(err){
        if(err) throw err;
        else res.redirect('/adminDashboard');
    })
})

router.get('/activity/purchase', (req,res)=>{
    activity.find({category: 'Book Bought'}, (err,data)=>{
        res.render('purchases',{activities: data});
    })
});

router.get('/activity/review', (req,res)=>{
    const review = activity.find({category: 'Comment'}).sort({'entryTime':-1});
    review.exec((err,data)=>{
        if(err) throw err;
        res.render('reviews',{activities: data});
    })
});

router.get('/delete/:comment/:activity', (req,res)=>{
    comment.findByIdAndRemove(req.params.comment, (err,data)=>{
        if(err) throw err;
    })
    activity.findByIdAndRemove(req.params.activity, (err,data)=>{
        if(err) throw err;
        else{
            res.redirect('/books/activity/review');
        }
    })
})

// router.get('/showDetails/:id',(req,res)=>{
//     book.findById(req.params.id, function(err,data){
//         if(err) throw err;
//         else res.render('bookDetails',{books:data});
//     })
// });

module.exports=router;
