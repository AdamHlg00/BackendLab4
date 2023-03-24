const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
require('dotenv').config()

app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

const db = require('./database')

var currentKey = ''
var currentPassword = ''
let currentUser

let adminRole = ['admin']
let teacherRole = ['admin', 'teacher']

app.get('/', (req, res) => {
  res.redirect('/identify')
})

app.post('/identify', async (req, res) => {
  const userId = req.body.userId
  const password = req.body.password
  const token = jwt.sign(userId, process.env.ACCESS_TOKEN_SECRET)
  currentKey = token
  currentPassword = password

  try {
    let user = await db.getUser(userId)

    if (!user) {
      console.log('User does not exist')
      res.redirect('/identify')
    } else {
      if (currentPassword === user.password) {
        currentUser = user
        res.redirect('/granted')
      } else {
        console.log('Incorrect password')
        res.redirect('/identify')
      }
    }
  } catch (error) {
    console.log(error)
    res.sendStatus(500)
  }
})

app.get('/identify', (req, res) => {
  res.render('identify.ejs')
})

function authenticateToken(req, res, next) {
  if (currentKey == '') {
    res.redirect('/identify')
  } else if (jwt.verify(currentKey, process.env.ACCESS_TOKEN_SECRET)) {
    next()
  } else {
    res.redirect('/identify')
  }
}

app.get('/granted', authenticateToken, (req, res) => {
  res.render('start.ejs')
})

app.get('/admin', authenticateToken, async (req, res) => {
  if (!adminRole.includes(currentUser.role)) {
    res.redirect('/identify')
  }

  try {
    let allUsers = await db.getAllUsers()

    if (!allUsers) {
      res.sendStatus(500)     // If users were not collected properly, internal server error
    }

    res.render('admin.ejs', { users: allUsers })
  } catch (error) {
    console.log(error)
    res.sendStatus(500)
  }
})

app.get('/student1', authenticateToken, (req, res) => {
  if (!teacherRole.includes(currentUser.role)) {
    if (currentUser.name !== 'student1') {
      res.redirect('/identify')
    }
    res.render('student1.ejs')
  }
  res.render('student1.ejs')
})

app.get('/student2', authenticateToken, (req, res) => {
  if (!teacherRole.includes(currentUser.role)) {
    if (currentUser.name !== 'student2') {
      res.redirect('/identify')
    }
    res.render('student2.ejs', { user: currentUser })
  }
  res.render('student2.ejs', { user: currentUser })
})

app.get('/teacher', authenticateToken, (req, res) => {
  if (!teacherRole.includes(currentUser.role)) {
    res.redirect('/identify')
  }
  res.render('teacher.ejs')
})

app.listen(3000)