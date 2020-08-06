var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan'); 
const fileUpload = require('express-fileupload');

// require password
// var bcrypt = require('bcrypt');

//library Express Session
var session = require('express-session')

//Kongfidurasi Connect-Flash
var flash = require('connect-flash');

//Integration Postgree Data Base
const { Pool } = require('pg')

// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'pmsdb',
//   password: 'tribay99',
//   port: 5432,
// })

const pool = new Pool({
  user: 'eveoyrsijneqvk',
  host: 'ec2-35-175-155-248.compute-1.amazonaws.com',
  database: 'dch8pio4snocvq',
  password: 'e20479f99ae97f64ff70f4a02b17c3e32e210dbfad5ddde4fc3c22e6133ed57c',
  port: 5432,
})

var indexRouter = require('./routes/index') (pool);
var usersRouter = require('./routes/users') (pool);
var projectRouter = require('./routes/projects') (pool);
var profileRouter = require('./routes/profile') (pool);


var app = express();



/*
Membuat Crypt Password
bcrypt.hash('5678', 10, function(err, hash) {
  console.log(hash);
});
*/

/* 
admin pms
email : adminpms@trimail.com
password : $2b$10$/TjdNKWiUuQaIvtMAeN6Rey89qtf8Y3x1IJvdfNRp4BlsjD9kT39a (1234)
firstname : admin
lastname : pms

admin pms
email : tri_165@trimail.com
password : $2b$10$gBAnipvxRBwI14d0bequCOSSqCVg.gTNkESGMRm7n0YZg3D1.07u. (5432)
firstname : Tri
lastname : Sutrisna

user pms
email : userpms@trimail.com
password : $2b$10$d6K3Bdiu20unZ1lIVvjvGOYvv.jE95Z5ACqntG8Oa2jeE6wwkAeCq (5678)
firstname : user
lastname : pmsu

user pms
email : mevi_meila@trimail.com
password : $2b$10$7i1vlq4Fp1OQ4TG0tzgNjOzxYB8cSgIfyPRi6EGq6fvMMuWdRTfY2 (9876)
firstname : Mevi
lastname : Meila


*/

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'tim21',
}))
app.use(flash());
app.use(fileUpload());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/projects', projectRouter);
app.use('/profile', profileRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
