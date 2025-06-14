const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
var cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const flash = require("connect-flash");
const localStrategy = require("passport-local");

const bcrypt = require('bcrypt');
const saltRounds = 10;


const{User} = require('./models');
app.set("view engine","ejs");

app.use(cookieParser('shh! some secret thing'))

app.use(session({
  secret:"my-super-secret-key-21728176152478952",
  cookie:{
    maxAge:24*60*60*1000
  }
}))

app.use(bodyParser.urlencoded({ extended: false }));

app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));


app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function(request, response, next) {
    response.locals.messages = request.flash();
    next();
});


//loaclStratergy

passport.use('local', new localStrategy(
  { usernameField: 'email' },
  function(email, password, done) {
    User.findOne({where:{ email: email }}).then(async(user)=>{
      if (!user) {
        return done(null, false, { message: 'Incorrect email.' });
      }
      // if(!user.validPassword(password)){
      //   return done(null, false, { message: 'Incorrect  password.' });
      // }
      if(user.role==='educator'){
        return done(null,user,{role:"educator"});
      }
      if(user.role==='student'){
        return done(null,user,{role:"student"});
      }
      else{
        return done(null, user,{message: 'User role not recognized.'});
      }
    }).catch((err)=>{
        return done(err);
      });
    },
  ),
);




//passport serializing and deserializing

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      if (user) {
        done(null, user);
      } else {
        done(new Error("User not found"), null);
      }
    })
    .catch((error) => {
      done(error, null);
    });
});


app.get("/", (request, response) => {
    if(request.isAuthenticated()){
      if(request.user.role==='educator'){
        return response.redirect("/educator_dashboard");
      }
      if(request.user.role==='student'){
       return response.redirect("/student_dashboard");
      }
    }

    return response.render("index", 
        { title: "Home Page" ,
        csrfToken:request.csrfToken()
        });
})

app.get("/login",(request,response)=>{
  response.render("login",{title:"Login",csrfToken:request.csrfToken()});
});

app.get("/signup",(request,response)=>{
  response.render("signup",{title:"Sign Up",csrfToken:request.csrfToken()})
});

app.post("/users",async(request,response)=>{
  try{
    const user = await User.create({
      role:request.body.role,
      firstName:request.body.firstName,
      lastName:request.body.lastName,
      email:request.body.email,
      password:request.body.password
    });
    request.login(user,(err)=>{
      if(err){
        console.log(error);
      }
      if(user.role === 'educator'){
        response.redirect('/educator_dashboard');
      }
      if(user.role === 'student'){
        response.redirect('/student_dashboard');
      }
      else{
      response.redirect('/signup');
      }
    })
  }catch(err){
    console.log(err);
  }
})


app.post("/session",
  passport.authenticate("local",{
    failureRedirect:"/login",
    failureFlash:true
  }),(req,res)=>{
    if(req.user.role==='educator'){
      return res.redirect("/educator_dashboard");
    }
    if(req.user.role==='student'){
      return res.redirect('/student_dashboard');
    }
    else{
      return res.redirect('/login');
    }
});
app.get("/educator_dashboard",(req,res)=>{
  try{
    res.render('educator_dashboard',{
      csrfToken:req.csrfToken(),
      title:'educator'
    });
  }catch(err){
    console.log(err);
  }
});
app.get("/student_dashboard",(req,res)=>{
  try{
    res.render('student_dashboard',{
      csrfToken:req.csrfToken(),
      title:'student'
    });
  }catch(err){
    console.log(err);
  }
})

module.exports = app;
