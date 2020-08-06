var express = require('express');
var router = express.Router();
var path = require('path');
const check = require('../check/check');
var moment = require('moment');
const { link } = require('fs');
const { url } = require('inspector');

let checkOption = {
  id: true,
  name: true,
  member: true
}

let optionMember = {
  id: true,
  name: true,
  position: true
}

let optionIssues = {
  checkid: true,
  checktracker: true,
  checksubject: true,
  checkdesc: true,
  checkstatus: true,
  checkpriority: true,
  checkassignee: true,
  checkstartdate: true,
  checkduedate: true,
  checkestimated: true,
  checkdone: true,
  checkauthor: true,
  checkspentime: true,
  checkfile: true,
  checktarget: true,
  checkcreated: true,
  checkupdate: true,
  checkclosed: true,
  checkparentask: true
}

/* GET home page. */
module.exports = (db) => {

  // localhost:3000/projects
  router.get('/', check.isLoggedIn, function (req, res, next) {

    //Get page project
    let link = 'projects'
    let user = req.session.user
    let getData = `SELECT count(id) AS total from (SELECT DISTINCT projects.projectid as id FROM projects 
      LEFT JOIN members ON members.projectid = projects.projectid LEFT JOIN users ON users.userid = members.userid `

    //Start Filter Search
    let result = []

    if (req.query.checkId && req.query.projectId) {
      result.push(`projects.projectid=${req.query.projectId}`)
    }

    if (req.query.checkName && req.query.projectName) {
      result.push(`projects.name ILIKE '%${req.query.projectName}%'`)
    }

    if (req.query.checkMember && req.query.member) {
      result.push(`members.userid=${req.query.member}`)
    }

    if (result.length > 0) {
      getData += ` WHERE ${result.join(" AND ")}`
    }

    getData += `) AS projectname`;
    //End Filter Search

    db.query(getData, (err, totalData) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      //Start Pagination 
      const url = req.url == '/' ? '/?page=1' : req.url
      const page = req.query.page || 1
      const limit = 5
      const offset = (page - 1) * limit
      const total = totalData.rows[0].total
      const pages = Math.ceil(total / limit);

      let getData = `SELECT DISTINCT projects.projectid, projects.name, string_agg(users.firstname || ' ' || users.lastname, ', ') as member FROM projects 
      LEFT JOIN members ON members.projectid = projects.projectid LEFT JOIN users ON users.userid = members.userid `

      if (result.length > 0) {
        getData += ` WHERE ${result.join(" AND ")}`
      }
      getData += ` GROUP BY projects.projectid ORDER BY projectid ASC LIMIT ${limit} OFFSET ${offset}`;
      //End Pagination

      db.query(getData, (err, dataProject) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        let getUser = `SELECT userid, concat(firstname,' ',lastname) as fullname FROM users;`

        db.query(getUser, (err, dataUsers) => {
          if (err) return res.status(500).json({
            error: true,
            message: err
          })
          res.render('projects/index', {
            url,
            user,
            link,
            page,
            pages,
            result: dataProject.rows,
            users: dataUsers.rows,
            option: checkOption,
            login: user
          });
        })
      })
    })
  });

  // localhost:3000/ =>Option
  router.post('/option', check.isLoggedIn, (req, res) => {
    checkOption.id = req.body.checkid;
    checkOption.name = req.body.checkname;
    checkOption.member = req.body.checkmember;
    res.redirect('/projects')
  })

  // localhost:3000/projects/add
  router.get('/add', check.isLoggedIn, (req, res) => {

    let link = 'projects'
    let sql = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname FROM users ORDER BY fullname`

    db.query(sql, (err, data) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })

      res.render('projects/add', {
        link,
        data: data.rows,
        login: req.session.user
      })
    })
  })

  // localhost:3000/projects/add method:post
  router.post('/add', check.isLoggedIn, (req, res) => {

    const { projectname, members } = req.body

    if (projectname && members) {

      const insertProject = `INSERT INTO projects (name) VALUES ('${projectname}')`

      db.query(insertProject, (err) => {
        if (err) return res.status(500).json(err)
        let selectMaxId = `SELECT MAX (projectid) FROM projects`

        db.query(selectMaxId, (err, data) => {
          if (err) return res.status(500).json(err)

          let idMax = data.rows[0].max;
          let insertMambers = `INSERT INTO members (userid, projectid) VALUES`

          if (typeof members == 'string') {
            insertMambers += `(${members}, ${idMax})`
          } else {

            let member = members.map(item => {
              return `(${item}, ${idMax})`
            }).join()
            insertMambers += `${member}`
          }

          db.query(insertMambers, (err) => {
            if (err) return res.status(500).json({
              error: true,
              message: err
            })

            res.redirect('/projects')
          })
        })
      })

    } else {
      return res.redirect('/projects/add')
    }
  })

  // localhost:3000/projects/edit/projectid/1
  router.get('/edit/:projectid', check.isLoggedIn, (req, res) => {

    let projectid = req.params.projectid
    let link = 'projects'
    let sql = `SELECT projects.name FROM projects WHERE projects.projectid = ${projectid}`
    let sqlMember = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname 
    FROM users ORDER BY fullname`
    let sqlMembers = `SELECT members.userid, projects.name, projects.projectid FROM members 
    LEFT JOIN projects ON members.projectid = projects.projectid  WHERE projects.projectid = ${projectid};`

    db.query(sql, (err, data) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })

      let nameProject = data.rows[0]

      db.query(sqlMember, (err, member) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })

        let members = member.rows;

        db.query(sqlMembers, (err, dataMembers) => {
          if (err) return res.status(500).json({
            error: true,
            message: err
          })

          let dataMember = dataMembers.rows.map(item => item.userid)

          res.render('projects/edit', {
            dataMember,
            nameProject,
            members,
            link,
            login: req.session.user
          })
        })

      })
    })
  })

  // localhost:3000/projects/edit/projectid/1 method:post
  router.post('/edit/:projectid', check.isLoggedIn, (req, res) => {

    let projectid = req.params.projectid
    const { editProjectname, editMembers } = req.body
    let sqlProjectname = `UPDATE projects SET name = '${editProjectname}' WHERE projectid = ${projectid}`

    if (projectid && editProjectname && editMembers) {
      db.query(sqlProjectname, (err) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })

        let sqlDeletemember = `DELETE FROM members WHERE projectid = ${projectid}`

        db.query(sqlDeletemember, (err) => {
          if (err) return res.status(500).json({
            error: true,
            message: err
          })

          let result = [];

          if (typeof editMembers == 'string') {
            result.push(`(${editMembers},${projectid})`);
          } else {
            for (let i = 0; i < editMembers.length; i++) {
              result.push(`(${editMembers[i]},${projectid})`)
            }
          }

          let sqlUpdate = `INSERT INTO members (userid, projectid) VALUES ${result.join(",")}`

          db.query(sqlUpdate, (err) => {
            if (err) return res.status(500).json({
              error: true,
              message: err
            })

            res.redirect('/projects')
          })
        })
      })
    } else {
      res.redirect(`/projects/edit/${projectid}`)
    }
  })

  // localhost:3000/projects/delete/projectid1 method:get
  router.get('/delete/:projectid', check.isLoggedIn, (req, res) => {

    const projectid = parseInt(req.params.projectid)
    let sqlMember = `DELETE FROM members WHERE projectid= ${projectid};`

    db.query(sqlMember, (err) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })

      let sqlIssues = `DELETE FROM issues WHERE projectid= ${projectid};`

      db.query(sqlIssues, (err) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })

        let sqlProject = `DELETE FROM projects WHERE projectid= ${projectid};`

        db.query(sqlProject, (err) => {
          if (err) return res.status(500).json({
            error: true,
            message: err
          })

          res.redirect('/projects')
        });
      });
    });
  });


  //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< =OVERVIEW= >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

  // localhost:3000/projectid/overview/1
  router.get('/:projectid/overview', check.isLoggedIn, function (req, res, next) {

    let link = 'projects'
    let url = 'overview'
    let projectid = req.params.projectid
    let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`

    db.query(sqlProject, (err, dataProject) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })

      let sqlMember = `SELECT users.firstname, users.lastname, members.role FROM members
      LEFT JOIN users ON members.userid = users.userid WHERE members.projectid = ${projectid}`

      db.query(sqlMember, (err, dataMamber) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })

        let sqlIssues = `SELECT tracker, status FROM issues WHERE projectid = ${projectid}`

        db.query(sqlIssues, (err, dataIssues) => {
          if (err) return res.status(500).json({
            error: true,
            message: err
          })

          let bugOpen = 0;
          let bugTotal = 0;
          let featureOpen = 0;
          let featureTotal = 0;
          let supportOpen = 0;
          let supportTotal = 0;

          dataIssues.rows.forEach(item => {
            if (item.tracker == 'Bug' && item.status !== "closed") {
              bugOpen += 1
            }
            if (item.tracker == 'Bug') {
              bugTotal += 1
            }
          })

          dataIssues.rows.forEach(item => {
            if (item.tracker == 'Feature' && item.status !== "closed") {
              featureOpen += 1
            }
            if (item.tracker == 'Feature') {
              featureTotal += 1
            }
          })

          dataIssues.rows.forEach(item => {
            if (item.tracker == 'Support' && item.status !== "closed") {
              supportOpen += 1
            }
            if (item.tracker == 'Support') {
              supportTotal += 1
            }
          })

          res.render('projects/overview/view', {
            projectid,
            link,
            url,
            data: dataProject.rows[0],
            mambers: dataMamber.rows,
            bugOpen,
            bugTotal,
            featureOpen,
            featureTotal,
            supportOpen,
            supportTotal,
            login: req.session.user
          })
        })
      })
    })
  });

  //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< =MEMBER= >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

  // localhost:3000/projectid/members/1
  router.get('/:projectid/members', check.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    let link = 'projects'
    let url = 'members'
    let sqlFilter = `SELECT COUNT(member) AS total FROM(SELECT members.userid FROM members JOIN users 
      ON members.userid = users.userid WHERE members.projectid = ${projectid}`;

    //Start Filter Search
    let result = []

    if (req.query.checkId && req.query.memberId) {
      result.push(`members.id=${req.query.memberId}`)
    }

    if (req.query.checkName && req.query.memberName) {
      result.push(`CONCAT(users.firstname,' ',users.lastname) LIKE '%${req.query.memberName}%'`)
    }

    if (req.query.checkPosition && req.query.position) {
      result.push(`members.role = '${req.query.position}'`)
    }

    if (result.length > 0) {
      sqlFilter += ` AND ${result.join(' AND ')}`
    }
    sqlFilter += `) AS member`
    //End Search Member

    db.query(sqlFilter, (err, totalData) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })

      //Start Pagination Member
      const urlpage = (req.url == `/${projectid}/members`) ? `/${projectid}/members/?page=1` : req.url;
      const page = req.query.page || 1;
      const limit = 5;
      const offset = (page - 1) * limit;
      const total = totalData.rows[0].total;
      const pages = Math.ceil(total / limit);

      let sqlMember = `SELECT users.userid, projects.name, projects.projectid, members.id, members.role, 
      CONCAT(users.firstname,' ',users.lastname) AS fullname FROM members
      LEFT JOIN projects ON projects.projectid = members.projectid
      LEFT JOIN users ON users.userid = members.userid WHERE members.projectid = ${projectid}`

      if (result.length > 0) {
        sqlMember += ` AND ${result.join(' AND ')}`
      }
      sqlMember += ` ORDER BY members.id ASC`
      sqlMember += ` LIMIT ${limit} OFFSET ${offset}`
      //End Pagination Member

      db.query(sqlMember, (err, dataMamber) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })

        let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`

        db.query(sqlProject, (err, dataProject) => {
          if (err) return res.status(500).json({
            error: true,
            message: err
          })

          res.render('projects/members/listMember', {
            projectid,
            link,
            url,
            pages,
            page,
            urlpage,
            project: dataProject.rows[0],
            members: dataMamber.rows,
            option: optionMember,
            login: req.session.user
          })
        })
      })
    })
  });

  // localhost:3000/projectid/members/option
  router.post('/:projectid/members/option', check.isLoggedIn, (req, res) => {

    const projectid = req.params.projectid

    optionMember.id = req.body.checkid;
    optionMember.name = req.body.checkname;
    optionMember.position = req.body.checkposition;
    res.redirect(`/projects/${projectid}/members`)
  })

  // localhost:3000/projectid/members/add 
  router.get('/:projectid/members/add', check.isLoggedIn, function (req, res, next) {
    const projectid = req.params.projectid
    const link = 'projects'
    const url = 'members'
    let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid}`
    db.query(sqlProject, (err, dataProject) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      let sqlMember = `SELECT userid, CONCAT(firstname,' ',lastname) AS fullname FROM users
      WHERE userid NOT IN (SELECT userid FROM members WHERE projectid = ${projectid})`

      db.query(sqlMember, (err, dataMember) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        res.render('projects/members/add', {
          members: dataMember.rows,
          project: dataProject.rows[0],
          projectid,
          link,
          url,
          login: req.session.user
        })
      })
    })
  });

  // localhost:3000/projectid/members/add method:post
  router.post('/:projectid/members/add', check.isLoggedIn, function (req, res, next) {
    const projectid = req.params.projectid
    const { inputmember, inputposition } = req.body
    let sqlAdd = `INSERT INTO members(userid, role, projectid) VALUES ($1,$2,$3)`
    let values = [inputmember, inputposition, projectid]

    db.query(sqlAdd, values, (err) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      res.redirect(`/projects/${projectid}/members`)
    })
  });

  // localhost:3000/projects/members/:id/edit/2
  router.get('/:projectid/members/:id', check.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid;
    let id = req.params.id

    let sqlMember = `SELECT members.id, CONCAT(users.firstname,' ',users.lastname) AS fullname, members.role FROM members
    LEFT JOIN users ON members.userid = users.userid WHERE projectid=${projectid} AND id=${id}`

    db.query(sqlMember, (err, dataMember) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })

      let member = dataMember.rows[0]

      let sqlProject = `SELECT * FROM projects WHERE projectid= ${projectid}`

      db.query(sqlProject, (err, dataProject) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })

        let project = dataProject.rows[0]

        res.render('projects/members/edit', {
          projectid,
          link: 'projects',
          url: 'members',
          member,
          project,
          login: req.session.user
        })
      })
    })
  });

  // localhost:3000/projects/members/:id/edit/2 method:post
  router.post('/:projectid/members/:id', check.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    let id = req.params.id;
    let position = req.body.inputposition;

    let sql = `UPDATE members SET role='${position}' WHERE id=${id}`

    db.query(sql, (err) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      res.redirect(`/projects/${projectid}/members`)
    })
  });

  // localhost:3000/projects/delete/projectid1 method:get
  router.get('/:projectid/members/:id/delete', check.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    let id = req.params.id;
    let sql = `DELETE FROM members WHERE projectid=${projectid} AND id=${id}`

    db.query(sql, (err) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      res.redirect(`/projects/${projectid}/members`)
    })
  })

  //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< =ISSUES= >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

  // localhost:3000/projects/issues
  router.get('/:projectid/issues', check.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    const link = 'projects'
    const url = 'issues'
    let sqlProject = `SELECT * FROM projects WHERE projectid=${projectid}`

    let { checkId, issuesId, checkSubject, issuesSubject, checkTracker, issuesTracker } = req.query;
    let query = [];
    let search = ""

    if (checkId && issuesId) {
      query.push(`issues.issueid=${issuesId}`)
    }
    if (checkSubject && issuesSubject) {
      query.push(`issues.subject ILIKE '%${issuesSubject}%'`)
    }
    if (checkTracker && issuesTracker) {
      query.push(`issues.tracker='${issuesTracker}'`)
    }
    if (query.length > 0) {
      search += ` AND ${query.join(' AND ')}`
    }

    let sqlTotal = `SELECT COUNT(issueid) AS total FROM issues WHERE projectid = ${projectid} ${search}`

    db.query(sqlProject, (err, dataProject) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      let project = dataProject.rows[0]

      db.query(sqlTotal, (err, totalData) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        let total = totalData.rows[0].total

        const urlPage = req.url == `/${projectid}/issues` ? `/${projectid}/issues/?page=1` : req.url;

        const page = req.query.page || 1
        const limit = 3;
        const offset = (page - 1) * limit;
        const pages = Math.ceil(total / limit)

        let sqlIssues = `SELECT issues.*, CONCAT(users.firstname,' ',users.lastname) AS authorname FROM issues
        LEFT JOIN users ON issues.author = users.userid WHERE issues.projectid=${projectid} ${search} 
        ORDER BY issues.issueid ASC LIMIT ${limit} OFFSET ${offset}`

        db.query(sqlIssues, (err, dataIssues) => {
          if (err) return res.status(500).json({
            error: true,
            message: err
          })
          let issues = dataIssues.rows

          let sqlAssignee = `SELECT users.userid, CONCAT(firstname,' ',lastname) AS fullname FROM members
          LEFT JOIN users ON members.userid=users.userid WHERE projectid=${projectid}`

          db.query(sqlAssignee, (err, dataAssignee) => {
            if (err) return res.status(500).json({
              error: true,
              message: err
            })
            let assignee = dataAssignee.rows

            res.render('projects/issues/list', {
              project,
              issues,
              assignee,
              projectid,
              link,
              url,
              moment,
              option: optionIssues,
              page,
              pages,
              urlPage,
              login: req.session.user
            })
          })
        })
      })
    })
  })

  // localhost:3000/:projectid/issues method:POST
  router.post('/:projectid/issues', check.isLoggedIn, (req, res) => {
    const projectid = req.params.projectid
    const {
      checkid,
      checktracker,
      checksubject,
      checkdesc,
      checkstatus,
      checkpriority,
      checkassignee,
      checkstartdate,
      checkduedate,
      checkestimated,
      checkdone,
      checkauthor,
      checkspentime,
      checkfile,
      checktarget,
      checkcreated,
      checkupdate,
      checkclosed,
      checkparentask
    } = req.body

    optionIssues.checkid = checkid
    optionIssues.checktracker = checktracker
    optionIssues.checksubject = checksubject
    optionIssues.checkdesc = checkdesc
    optionIssues.checkstatus = checkstatus
    optionIssues.checkpriority = checkpriority
    optionIssues.checkassignee = checkassignee
    optionIssues.checkstartdate = checkstartdate
    optionIssues.checkduedate = checkduedate
    optionIssues.checkestimated = checkestimated
    optionIssues.checkdone = checkdone
    optionIssues.checkauthor = checkauthor
    optionIssues.checkspentime = checkspentime
    optionIssues.checkfile = checkfile
    optionIssues.checktarget = checktarget
    optionIssues.checkcreated = checkcreated
    optionIssues.checkupdate = checkupdate
    optionIssues.checkclosed = checkclosed
    optionIssues.checkparentask = checkparentask

    res.redirect(`/projects/${projectid}/issues`)
  })

  // localhost:3000/:projectid/issues/add method:GET
  router.get('/:projectid/issues/add', check.isLoggedIn, function (req, res, next) {
    const projectid = req.params.projectid

    const link = 'projects'
    const url = 'issues'

    let sqlProject = `SELECT * FROM projects WHERE projectid=${projectid}`

    db.query(sqlProject, (err, dataProject) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      let project = dataProject.rows[0]

      let sqlMembers = `SELECT users.userid, CONCAT(users.firstname,' ',users.lastname) AS fullname FROM members
      LEFT JOIN users ON members.userid = users.userid WHERE projectid=${projectid}`

      db.query(sqlMembers, (err, dataMembers) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        let members = dataMembers.rows

        res.render('projects/issues/add', {
          projectid,
          link,
          url,
          project,
          members,
          login: req.session.user
        })
      })
    })
  });

  // localhost:3000/:projectid/issues/add method:POST
  router.post('/:projectid/issues/add', check.isLoggedIn, function (req, res, next) {
    let projectid = parseInt(req.params.projectid)

    let formAdd = req.body
    let user = req.session.user

    //Issues by files
    if (req.files) {
      let file = req.files.file

      let fileName = file.name.toLowerCase().replace("", Date.now()).split(" ").join("-")

      let sqlIssue = `INSERT INTO issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, files, author, createddate)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`

      let values = [projectid, formAdd.tracker, formAdd.subject, formAdd.description, formAdd.status, formAdd.priority, parseInt(formAdd.assignee), formAdd.startDate, formAdd.dueDate, parseInt(formAdd.estimatedTime), parseInt(formAdd.done), fileName, user.userid]

      db.query(sqlIssue, values, (err) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        file.mv(path.join(__dirname, "..", "public", "upload", fileName), function (err) {
          if (err) return res.status(500).send(err)
          res.redirect(`/projects/${projectid}/issues`)
        })
      })

      // Issues without file
    } else {
      let sqlIssue = `INSERT INTO issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, author, createddate)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`

      let values = [projectid, formAdd.tracker, formAdd.subject, formAdd.description, formAdd.status, formAdd.priority, parseInt(formAdd.assignee), formAdd.startDate, formAdd.dueDate, parseInt(formAdd.estimatedTime), parseInt(formAdd.done), user.userid]

      db.query(sqlIssue, values, (err) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        res.redirect(`/projects/${projectid}/issues`)
      })
    }
  });

  // localhost:3000/projects/issues/1/edit/:id
  router.get(`/:projectid/issues/edit/:id`, check.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    let issueId = req.params.id

    const link = 'projects'
    const url = 'issues'

    let sqlProject = `SELECT * FROM projects WHERE projectid=${projectid}`

    db.query(sqlProject, (err, dataProject) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      let project = dataProject.rows[0]

      let sqlIssue = `SELECT issues.*, CONCAT(users.firstname,' ',users.lastname) AS authorname FROM issues
      LEFT JOIN users ON issues.author=users.userid WHERE projectid=${projectid} AND issueid=${issueId}`

      db.query(sqlIssue, (err, issueData) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        let issue = issueData.rows[0]

        let sqlMembers = `SELECT users.userid, CONCAT(users.firstname,' ',users.lastname) AS fullname FROM members
        LEFT JOIN users ON members.userid = users.userid WHERE projectid=${projectid}`

        db.query(sqlMembers, (err, dataMember) => {
          if (err) return res.status(500).json({
            error: true,
            message: err
          })
          let members = dataMember.rows

          let sqlPerent = `SELECT issueid, subject, tracker FROM issues WHERE projectid=${projectid}`

          db.query(sqlPerent, (err, dataPerent) => {
            if (err) return res.status(500).json({
              error: true,
              message: err
            })
            let perents = dataPerent.rows

            res.render('projects/issues/edit', {
              perents,
              moment,
              members,
              issue,
              project,
              projectid,
              link,
              url,
              login: req.session.user
            })
          })
        })
      })
    })
  })

  // localhost:3000/:projectid/issues/edit/:id method:POST
  router.post('/:projectid/issues/edit/:id', check.isLoggedIn, function (req, res, next) {

    let projectid = parseInt(req.params.projectid)
    let issueid = parseInt(req.params.id)

    let formEdit = req.body
    let user = req.session.user

    let title = `${formEdit.subject} #${issueid} (${formEdit.tracker}) - [${formEdit.status}]`
    let desc = `Spent Time by Hours : from ${formEdit.oldspent} updated to ${formEdit.spenttime}`

    let sqlActivity = `INSERT INTO activity (time, title, description, author, projectid, olddone, nowdone) 
    VALUES(NOW(), $1, $2, $3, $4, $5, $6)`

    let value = [title, desc, user.userid, projectid, formEdit.olddone, formEdit.done]

    //Issues by files
    if (req.files) {
      let file = req.files.file

      let fileName = file.name.toLowerCase().replace("", Date.now()).split(" ").join("-")

      let sqlupdate = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, assignee = $5, duedate = $6, done = $7, 
      parenttask = $8, spenttime = $9, targetversion = $10, updateddate = NOW() ${formEdit.status == 'closed' ? `, closeddate = NOW() ` : " "}WHERE issueid = $11`
      console.log(sqlupdate);

      let values = [formEdit.subject, formEdit.description, formEdit.status, formEdit.priority, parseInt(formEdit.assignee), formEdit.dueDate, parseInt(formEdit.done),
        parseInt(formEdit.perenttask), parseInt(formEdit.spenttime), formEdit.target, issueid]

      db.query(sqlupdate, values, (err) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        file.mv(path.join(__dirname, "..", "public", "upload", fileName), function (err) {
          if (err) return res.status(500).send(err)

          db.query(sqlActivity, value, (err) => {
            if (err) return res.status(500).json({
              error: true,
              message: err
            })

            res.redirect(`/projects/${projectid}/issues`)
          })
        })
      })

      //Issues without file
    } else {
      let sqlupdate = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, assignee = $5, duedate = $6, done = $7, 
      parenttask = $8, spenttime = $9, targetversion = $10, updateddate = NOW() ${formEdit.status == 'closed' ? `, closeddate = NOW() ` : " "}WHERE issueid = $11`

      let values = [formEdit.subject, formEdit.description, formEdit.status, formEdit.priority, parseInt(formEdit.assignee), formEdit.dueDate, parseInt(formEdit.done),
      parseInt(formEdit.perenttask), parseInt(formEdit.spenttime), formEdit.target, issueid]

      db.query(sqlupdate, values, (err) => {
        if (err) return res.status(500).json({
          error: "true",
          message: err
        })
        db.query(sqlActivity, value, (err) => {
          if (err) return res.status(500).json({
            error: true,
            message: err
          })

          res.redirect(`/projects/${projectid}/issues`)
        })
      })
    }
  });

  // localhost:3000/:projectid/issues/delete/:id
  router.get(`/:projectid/issues/delete/:id`, check.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    let issueid = req.params.id

    let sqldelete = `DELETE FROM issues WHERE projectid = $1 AND issueid = $2`
    db.query(sqldelete, [projectid, issueid], (err) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      res.redirect(`/projects/${projectid}/issues`)
    })
  })

  // localhost:3000/:projectid/activity/1
  router.get('/:projectid/activity', check.isLoggedIn, function (req, res, next) {
    let projectid = req.params.projectid
    const link = 'projects'
    const url = 'activity'

    let sqlProject = `SELECT * FROM projects WHERE projectid= ${projectid}`
    db.query(sqlProject, (err, dataProject) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      let project = dataProject.rows[0]
      let sqlActivity = `SELECT activity.*, CONCAT(users.firstname,' ',users.lastname) AS authorname,
      (time AT TIME ZONE 'Asia/Jakarta'):: time AS timeactivity, 
      (time AT TIME ZONE 'Asia/Jakarta'):: date AS dateactivity
      FROM activity
      LEFT JOIN users ON activity.author = users.userid WHERE projectid= ${projectid} 
      ORDER BY dateactivity DESC, timeactivity DESC`

      db.query(sqlActivity, (err, dataActivity) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        let activity = dataActivity.rows

        activity.forEach(item => {
          item.dateactivity = moment(item.dateactivity).format('YYYY-MM-DD')
          item.timeactivity = moment(item.timeactivity, 'HH:mm:ss.SSS').format('HH:mm:ss');

          if (item.dateactivity == moment().format('YYYY-MM-DD')) {
            item.dateactivity = 'Today'
          } else if (item.dateactivity == moment().subtract(1, 'days').format('YYYY-MM-DD')) {
            item.dateactivity = 'Yesterday'
          } else {
            item.dateactivity = moment(item.dateactivity).format("MMMM Do, YYYY")
          }
        })
        res.render(`projects/activity/view`, {
          // res.json({
          moment,
          activity,
          project,
          projectid,
          link,
          url,
          login: req.session.user
        })
      })
    })
  });

  return router;
}
