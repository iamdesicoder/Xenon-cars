//jshint esversion:6
require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
const app = express()


app.use(express.static('public'))
app.set('view engine','ejs')
app.use(bodyParser.urlencoded({extended : true})) 

app.use(session({
    secret : 'our little secret.',
    resave : false,
    saveUninitialized : false
}))

app.use(passport.initialize())
app.use(passport.session())



mongoose.connect("mongodb+srv://"+process.env.MONGO_ID+":"+process.env.MONGO_PASSWORD+"@cluster0.fygu4xm.mongodb.net/xenonCarsDB",{useNewUrlParser : true})

const userSchema = new mongoose.Schema({
    email : String,
    password : String,
    googleId : String,
    secret : String
})
const contactSchema =new mongoose.Schema({
    name : String,
    email : String,
    message : String
})

const checkoutSchema = new mongoose.Schema({
    fname : String,
    lname : String,
    email : String,
    address : String,
    country : String,
    state : String,
    zip : String
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)


const User = new mongoose.model('User',userSchema)
const Contact = new mongoose.model('Contact',contactSchema)
const Checkout = new mongoose.model('Checkout',checkoutSchema)


passport.use(User.createStrategy())

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
      ///http://localhost:3000/auth/google/secrets
    callbackURL: "https://frozen-river-04591.herokuapp.com/auth/google/secrets" 
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get('/',(req,res)=>{
    res.render('home')
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get('/login',(req,res)=>{
    res.render('login')
})

app.get('/register',(req,res)=>{
    res.render('register')
})

app.get('/secrets',(req,res)=>{
    if(req.isAuthenticated()){
        res.render('secrets')
    }else{
        res.redirect('/')
    }
    // User.find({"secret":{$ne : null}},(err,foundUser)=>{
    //     if(err)
    //     {
    //         console.log(err)
    //     }
    //     else {
    //         if(foundUser){
    //             res.render('secrets',{usersWithSecrets : foundUser})
    //         }
    //     }
    // })
})  
app.get('/checkout',(req,res)=>{
    if(req.isAuthenticated()){
        res.render('checkout')
    }else{
        res.redirect('/')
    }
})

app.post('/checkout',(req,res)=>{
    const newCheckout = new Checkout({
        fname : req.body.fname,
        lname : req.body.lname,
        email : req.body.email,
        address : req.body.address,
        country : req.body.country,
        state : req.body.state,
        zip : req.body.zip
    })
    newCheckout.save((err)=>{
        if(!err)
        {
            res.send('SuccessFully Submit!!!<hr><a href="/secrets">Click here to go Home</a>')
        }
        else{
            console.log(err)
        }
    })
})


app.get('/contact',(req,res)=>{
    res.render('contact')
})

app.post('/contact',(req,res)=>{
    const contact = new Contact({
        name : req.body.name,
        email : req.body.email,
        message : req.body.message
    })
    contact.save((err)=>{
        if(!err){
            // console.log("done")
            res.redirect('/')
        }else{
            console.log(err)
        }
    })
  
})


// app.get('/submit',(req,res)=>{
//     if(req.isAuthenticated()){
//         res.render('submit')
//     }else{
//         res.redirect('/login')
//     }
// })

// app.post('/submit',(req,res)=>{
//     const submitedSecrets = req.body.secret

//     console.log(req.user.id)

//     User.findById(req.user.id,(err,foundUser)=>{
//         if(err){
//             console.log(err)
//         } else {
//             if(foundUser){
//                 foundUser.secret = submitedSecrets
//                 foundUser.save(()=>[
//                     res.redirect('/secrets')
//                 ])
//             }
//         }
//     })
// })



app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  })

app.post('/register',(req,res)=>{
    User.register({username : req.body.username}, req.body.password, (err,user)=>{
        if(err){
            console.log(err)
            res.redirect('/register')
        }    
        else{
            passport.authenticate('local')(req,res,()=>{
                res.redirect('/secrets')
            })
        }
    })
    
})

app.post('/login',(req,res)=>{
    const user = new User({
        username : req.body.username,
        password : req.body.password
    })
     
    req.login(user, (err)=>{
        if(err){
            console.log(err)
        }else{
            passport.authenticate('local')(req,res,()=>{
                res.redirect('/secrets')
            })
        }
    })
})

app.listen(process.env.PORT || 3000,()=>{
    console.log('Server is running on port 3000.')
})