var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');


/* GET home page. */
module.exports = (db) => {
  // localhost:3000/login
  router.get('/', function (req, res, next) {
    res.render('login', { pesanKesalahan: req.flash(`pesanKesalahan`) });
  });

  // localhost:3000/login method:post
  router.post('/Login', function (req, res, next) {
    db.query('SELECT * FROM users WHERE email = $1', [req.body.email], (err, data) => { //Query Banding : $ berfungsi untuk menghindari sql injection 
      if (err) {
        req.flash('pesanKesalahan', 'JIka Terjadi Error, maka hubungilah Administrator')
        return res.redirect('/');
      }
      if (data.rows.length == 0) {
        req.flash('pesanKesalahan', 'email atau password salah')
        return res.redirect('/');
      }
      bcrypt.compare(req.body.password, data.rows[0].password, function (err, result) {
        if (err) {
          req.flash('pesanKesalahan', 'JIka Terjadi Error, maka hubungilah Administrator')
          return res.redirect('/');
        }
        if (!result) {
          req.flash('pesanKesalahan', 'email atau password salah')
          return res.redirect('/');
        }
        //Next
        let user = data.rows[0]
        delete user['password']
        console.log(user);
        req.session.user = user;
        res.redirect('/projects')
      });
    })
  });

  // localhost:3000/logout
  router.get('/Logout', function (req, res, next) {
    req.session.destroy(function (err) {
      res.redirect('/')
    })
  });

  return router;
}