var express = require('express');
var router = express.Router();
const check = require('../check/check');
const bcrypt = require('bcrypt');
const saltRounds = 10;

let checkOption = {
  Id: true,
  Name: true,
  Position: true,
  Email: true,
  Type: true,
  Role: true
}

module.exports = (db) => {

  // localhost:3000/users
  router.get('/', check.isLoggedIn, function (req, res, next) {

    //Get page users
    let link = 'users'
    let { checkId, id, checkName, name, checkEmail, email, checkPosition, position, checkType, type } = req.query

    //Start Filter Search
    let result = []
    let search = ""

    if (checkId && id) {
      result.push(`userid = ${parseInt(id)}`)
    }

    if (checkName && name) {
      result.push(`CONCAT(firstname,' ',lastname) ILIKE '%${name}%'`)
    }

    if (checkEmail && email) {
      result.push(`email= '${email}'`)
    }

    if (checkPosition && position) {
      result.push(`position= '${position}'`)
    }

    if (checkType && type) {
      result.push(`typeJob= '${type}'`)
    }

    if (result.length > 0) {
      search += ` WHERE ${result.join(' AND ')}`
    }
    //End Filter Search

    let sqlUser = `SELECT COUNT (userid) AS total from users ${search}`


    db.query(sqlUser, (err, totalUsers) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      let total = totalUsers.rows[0].total

      //Start Pagination 
      const url = req.url = '/' ? `/?page=1` : req.url
      const page = req.query.page || 1
      const limit = 5;
      const offset = (page - 1) * limit
      let pages = Math.ceil(total / limit)
      let sqlData = `SELECT userid, email, CONCAT(firstname,' ',lastname) AS fullname, position, typejob, role
      FROM users ${search} ORDER BY userid ASC LIMIT ${limit} OFFSET ${offset}`
      //End Pagination

      db.query(sqlData, (err, data) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        let users = data.rows
        res.render('users/list', {
          link,
          users,
          pages,
          page,
          url,
          option: checkOption,
          login: req.session.user
        })
      })
    })
  });

  // localhost:3000/ =>Option
  router.post('/', check.isLoggedIn, function (req, res) {
    checkOption.Id = req.body.cId
    checkOption.Name = req.body.cName
    checkOption.Position = req.body.cPosition
    checkOption.Email = req.body.cEmail
    checkOption.Type = req.body.cType
    checkOption.Role = req.body.cRole

    res.redirect('/users')
  })

  // localhost:3000/users/add
  router.get('/add', check.isLoggedIn, (req, res) => {

    const link = 'users';

    res.render('users/add', {
      link,
      login: req.session.user
    })
  })

  // localhost:3000/users/add method:post
  router.post('/add', check.isLoggedIn, function (req, res, next) {

    let { firstName, lastName, email, password, position, type, role } = req.body

    bcrypt.hash(password, saltRounds, function (err, hash) {
      // Store hash in your password Data Base Postgree
      if (err) return res.status(500).json({
        error: true,
        message: err
      })

      let sql = 'INSERT INTO users(firstname, lastname, email, password, position, typejob, role) VALUES ($1, $2, $3, $4, $5, $6, $7)'
      let values = [firstName, lastName, email, hash, position, type, role]

      db.query(sql, values, (err) => {
        console.log(values)
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        res.redirect('/users')
      })
    });
  });

  // localhost:3000/users/edit/projectid/1
  router.get('/edit/:id', check.isLoggedIn, (req, res) => {

    let link = 'users'
    let id = req.params.id

    let sql = `SELECT * FROM users WHERE userid = ${id}`

    db.query(sql, (err, data) => {
      if (err) return res.status(500).json({
        error: err,
        message: err
      })

      res.render('users/edit', {
        link,
        data: data.rows[0],
        login: req.session.user
      })
    })
  })

  // localhost:3000/users/edit/projectid/1 method:post
  router.post('/edit/:id', check.isLoggedIn, function (req, res) {

    let userid = req.params.id
    let { firstName, lastName, password, position, type, role } = req.body

    bcrypt.hash(password, saltRounds, function (err, hash) {
      // Store hash in your password Data Base Postgree
      if (err) return res.status(500).json({
        error: true,
        message: err
      })

      let sqlUpdate = `UPDATE users SET firstname=$1, lastname=$2, password=$3, position=$4, typejob=$5, role=$6 WHERE userid=$7`
      let value = [firstName, lastName, hash, position, type, role, userid]

      db.query(sqlUpdate, value, (err) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        res.redirect('/users')
      })
    });
  })

  // localhost:3000/users/delete/id
  router.get('/delete/:id', check.isLoggedIn, (req, res) => {

    let id = req.params.id
    let sql = `DELETE FROM users WHERE userid=$1`

    db.query(sql, [id], (err) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
          res.redirect('/users')
        })
      });

return router;
}
