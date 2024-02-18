var express = require('express');
var router = express.Router();
var passport = require('passport')
var userModel = require('./users')

const upload = require("./multer")

var ImageKit = require("imagekit");

const fs = require("fs");
const { log } = require('console');
var imagekit = new ImageKit({
  publicKey: "publ21mpeGsUXktNLeztVPMSMy7w1w=ic_v",
  privateKey: "private_chfo2+sM1rnwp3sjVefYNrj7ccY=",
  urlEndpoint: "https://ik.imagekit.io/gunj6f9gb"
});

const localStratagy = require('passport-local');
const users = require('./users');
passport.use(new localStratagy(userModel.authenticate()));

/* GET home page. */
router.get('/', isLoggedIn ,function (req, res, next) {
  
  res.render('index', {logedUser:req.user});
});

router.get('/register', function (req, res, next) {
  res.render('register');
});

router.get('/login', function (req, res, next) {
  res.render('login');
});


router.post('/register', function (req, res, next) {
  var newUser = new userModel({

    username : req.body.username,
    contact: req.body.number
  })
  userModel.register(newUser, req.body.password)
    .then(function (u) {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/')
      })
    })
    .catch(function (e) {
      res.send(e);
    })
})


router.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}), function (req, res, next) { })


router.get('/logout', (req, res, next) => {
  if (req.isAuthenticated())
    req.logout((err) => {
      if (err) res.send(err);
      else res.redirect('/login');
    });
  else {
    res.redirect('/login');
  }
});


router.post('/profile', upload.single('avatar'), function (req, res, next) {
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any

  fs.readFile(req.file.path, function (err, data) {
    // console.log(data);
    if (err) throw err; // Fail if the file can't be read.
    imagekit.upload({
      file: data, //required
      fileName: req.file.filename, //required
      tags: ["tag1", "tag2"]
    },async function (error, result) {
      if (error) console.log(error);
      else {
        console.log(result);
        var users = await userModel.findOneAndUpdate({username:req.session.passport.user},{img:result.url})
        // console.log(users);
        await users.save()
        console.log(users);
      };
    });

   
  });
  
  res.redirect("/")
})

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  else {
    res.redirect('/login')
  }
}
module.exports = router;
