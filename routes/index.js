const express=require('express');
const router = express.Router();
const bodyparser = require('body-parser');
const bcrypt = require('bcrypt');
const user = require('../models/user.js');
const admin = require('../models/admin.js');
const book = require('../models/books');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const Razorpay = require('razorpay');
const Comment = require('../models/comment');
const dotenv = require('dotenv');
dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET
});


router.use(bodyparser.urlencoded({extended:true}));

router.use(cookieParser('secret'));
router.use(session({
    secret: 'secret',
    maxAge: 3600000,
    resave: true,
    saveUninitialized: true,

}))
router.use(passport.initialize());
router.use(passport.session());

router.use(flash());
router.use(function(req,res,next){
    res.locals.success_message = req.flash('success_message');
    res.locals.error_message = req.flash('error_message');
    res.locals.error = req.flash('error');
    next();
});

const ensureAuthenticated = function(req,res,next){
    if(req.isAuthenticated()){
        res.set('Cache-Control','no-cache,private,no-store,must-revalidate,post-check=0,pre-check=0');
        return next();
    }else res.redirect('/login');
}

const ensureAdminAuthenticated = function(req,res,next){
    if(req.isAuthenticated()){
        res.set('Cache-Control','no-cache,private,no-store,must-revalidate,post-check=0,pre-check=0');
        return next();
    }else res.redirect('/adminlogin');
}

router.get('/',(req,res)=>{
    res.render('register');
});

router.post('/register',(req,res)=>{
  let { name, email, password, confirmPassword }= req.body;
  if(!name || !email || !password || !confirmPassword) {
    err="Please fill all the fields";
    res.render('register', { 'err' : err });
  }
  if(password != confirmPassword){
      err='Passwords dont match';
      res.render('register',{ 'err':err, 'email':email, 'name':name, 'password':password});
  }
  if(typeof err == 'undefined'){
    user.findOne({email:email}, function(err,data){
        if(err) throw err;
        if(data){
            err='Email exists...';
            res.render('register', {'name':name, 'err': err});
        }
        else{
            bcrypt.genSalt(10, (err,salt)=>{
                if(err) throw err;
                bcrypt.hash(password, salt, (err,hash)=>{
                    if(err) throw err;
                    password = hash;
                    user({
                        name, email, password
                    }).save((err,data)=>{
                        if(err) throw err;
                        req.flash('success_message', "Please Login to Continue....");
                        res.redirect('/login');
                    });
                })
            })
        }
    })
  }
  
});


var localStrategy = require('passport-local').Strategy;
passport.use('user',new localStrategy({usernameField:'email'}, (email,password,done)=>{
    user.findOne({ email:email},(err,data)=>{
        if(err) throw err;
        if(!data){
            return done(null,false, { message: 'User Doesnot Exists..'});
        }
        bcrypt.compare(password, data.password, (err,match)=>{
            if(err) return done(null,false);
            if(!match) return done(null,false, { message: 'Password Doesnot Exists..'});
            if(match) return done(null,data);
        })
    })
}));

passport.use('admin',new localStrategy({usernameField:'email'}, (email,password,done)=>{
    admin.findOne({ email:email},(err,data)=>{
        if(err) throw err;
        if(!data){
            return done(null,false, { message: 'Email is incorrect..'});
        }
        if(password == data.password){
            return done(null,data);
        }
        else{
            return done(null,false,{ message: 'Password is Incorrect..'});
        }
    })
}));

passport.serializeUser(function(user,cb){
    cb(null,user.id);
});

passport.deserializeUser(function(id,cb){
    user.findById(id, function(err,user){
        if(err) cb(err);
        if(user) cb(null,user);
        else{
            admin.findById(id, function(err,user){
                if(err) cb(err);
                cb(null,user);
            })
        }
    })
});

router.get('/login', (req,res)=>{
    res.render('login');
});

router.post('/login', (req,res,next)=>{
    passport.authenticate('user',{
        failureRedirect: '/login',
        successRedirect: '/dashboard',
        failureFlash: true,
    })(req,res,next);
});

router.post('/adminlogin', (req,res,next)=>{
    passport.authenticate('admin',{
        failureRedirect: '/adminlogin',
        successRedirect: '/adminDashboard',
        failureFlash: true,
    })(req,res,next);
});

router.get('/dashboard',ensureAuthenticated,(req,res)=>{
    book.find({}, function(err,data){
        res.render('userDashboard',{ books: data, user: req.user});
    });
})

router.get('/adminDashboard',ensureAdminAuthenticated,(req,res)=>{
    book.find({}, function(err,data){
        res.render('adminDashboard',{ books: data});
    });
    
});

router.get('/adminlogin', (req,res)=>{
    res.render('adminlogin');
})

router.get('/logout', (req,res)=>{
    req.logout();
    res.redirect('/login');
});

router.get('/adminLogout', (req,res)=>{
    req.logout();
    res.redirect('/adminLogin');
});

router.get('/showDetails/:id',ensureAuthenticated, (req,res)=>{
    book.findById(req.params.id).populate({path: "comments", model: Comment}).exec((err,data)=>{
        if(err) throw err;
        else res.render('bookDetails',{books:data, user:req.user})
    })
    // book.findById(req.params.id, function(err,data){
    //     if(err) throw err;
    //     else res.render('bookDetails',{books:data, user:req.user});
    // })
});

router.post('/createOrder/:amt',(req,res)=>{
    let options = {
        amount: req.params.amt*100,
        currency : "INR",
    }
    razorpay.orders.create(options, (err,order)=>{
        console.log(order);
        res.json(order);
    })
});

router.post('/isComplete/:id',ensureAuthenticated, (req,res)=>{
    razorpay.payments.fetch(req.body.razorpay_payment_id).then((doc)=>{
        if(doc.status=='captured'){
            user.findOne({_id: req.user._id}, function(err, data){
                data.booksBought.push(req.params.id);
                data.save(function(err, d){
                    if(err) throw err;
                    else{
                        user.findById(req.user._id).populate({path:"booksBought", model: book}).exec(function(err, bookData){
                            if(err) res.send(err);
                            else{
                                res.render('library',{data: bookData, user: req.user});
                                // console.log(bookData);
                            }
                        })
                    }
                })
            })
        }
        else res.send('Payment Incomplete');
    })

})

router.get('/library', ensureAuthenticated, (req,res)=>{
    user.findById(req.user._id).populate({path:"booksBought", model: book}).exec(function(err, bookData){
        if(err) res.send(err);
        else{
            res.render('library',{data: bookData, user:req.user});
            console.log(bookData);
        }
    })
});

router.get('/fiction',ensureAuthenticated, (req,res)=>{
    book.find({category: 'Fiction'}, function(err, data){
        if(err) throw err;
        else{
            res.render('fiction', {books: data, user: req.user});
        }
    })
})

router.get('/nonFiction',ensureAuthenticated, (req,res)=>{
    book.find({category: 'nonFiction'}, function(err, data){
        if(err) throw err;
        else{
            res.render('nonfiction', {books: data, user: req.user});
        }
    })
});

router.get('/education',ensureAuthenticated, (req,res)=>{
    book.find({category: 'Engineering'}, function(err, data){
        if(err) throw err;
        else{
            res.render('education', {books: data, user: req.user});
        }
    })
});

router.get('/search', ensureAuthenticated, (req,res)=>{
    var query = req.query.dsearch;
    book.find({$or:[{name:{'$regex': query, '$options':'i'}},{author: {'$regex': query, '$options':'i'}}]}, (err,data)=>{
        if(err) throw err;
        else res.render('userDashboard',{books:data, user:req.user});
    })
});

router.get('/adminsearch',ensureAdminAuthenticated, (req,res)=>{
    var query = req.query.dsearch;
    book.find({$or:[{name:{'$regex': query, '$options':'i'}},{author: {'$regex': query, '$options':'i'}}]}, (err,data)=>{
        if(err) throw err;
        else res.render('adminDashboard',{books:data});
    })
});

router.get('/fictionsearch',ensureAuthenticated, (req,res)=>{
    var query = req.query.dsearch;
    book.find({$or:[{name:{'$regex': query, '$options':'i'}},{author: {'$regex': query, '$options':'i'}}]}, (err,data)=>{
        if(err) throw err;
        else res.render('fiction',{books:data, user:req.user});
    })
});

router.get('/nonfictionsearch',ensureAuthenticated, (req,res)=>{
    var query = req.query.dsearch;
    book.find({$or:[{name:{'$regex': query, '$options':'i'}},{author: {'$regex': query, '$options':'i'}}]}, (err,data)=>{
        if(err) throw err;
        else res.render('nonFiction',{books:data, user:req.user});
    })
});

router.get('/educationsearch',ensureAuthenticated, (req,res)=>{
    var query = req.query.dsearch;
    book.find({$or:[{name:{'$regex': query, '$options':'i'}},{author: {'$regex': query, '$options':'i'}}]}, (err,data)=>{
        if(err) throw err;
        else res.render('education',{books:data, user:req.user});
    })
});

router.get('/autocomplete',(req,res)=>{
    var query = new RegExp(req.query["term"],'i');
    var bookfilter= book.find({name: query},{'name':1}).sort({"updated_at":-1}).sort({"created_at":-1}).limit(10);
    bookfilter.exec((err,data)=>{
      // console.log(data);
          var result=[];
         if(!err){
             if(data && data.length && data.length>0){
                 data.forEach(user=>{
                    let obj={
                        id: user._id,
                        label: user.name
                    }
                    result.push(obj);
                 })
                 
                
             }
         }
         res.jsonp(result);
     })
    
});

router.get('/details/:book/comment', ensureAuthenticated, (req,res)=>{
    res.render('comment', {books: req.params.book});
});

router.post('/details/:book/comment', ensureAuthenticated, async(req,res)=>{
    const comment_text = req.body.comments;
    const user_id = req.user._id;
    const user_name = req.user.name;

    const book_id = req.params.book;

    const bookDetails = await book.findById(book_id);
    const comments = new Comment({
        comment : comment_text,
        author : {
            id:user_id,
            name:user_name,
        },
        book: {
            id : bookDetails._id,
            bookName : bookDetails.name,
        }
    });

    await comments.save();

    bookDetails.comments.push(comments._id);
    await bookDetails.save();
    res.redirect(`/showDetails/${book_id}`);
});


module.exports=router;