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

app.get("/", (request, response) => {
    response.render("index", 
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

app.post("/session", (req, res) => {
  console.log("CSRF passed. Body:", req.body);
  res.send("CSRF OK");
});


module.exports = app;
