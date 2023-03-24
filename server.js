const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
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

// Since newly registered users' passwords are encrypted, this array is used
// to keep track of those users whose passwords are stored in plaintext
let originalUsers = ['id1', 'id2', 'id3', 'admin']

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
    }

    // Requires two different ways of checking passwords, 
    // one for non-encrypted and one for encrypted
    if (originalUsers.includes(userId)) {
      if (currentPassword === user.password) {
        currentUser = user
        res.redirect('/granted')
      } else {
        console.log('Incorrect password')
        res.redirect('/identify')
      }
    } else {
      if (await bcrypt.compare(currentPassword, user.password)) {
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

app.get('/register', (req, res) => {
  res.render('register.ejs')
})

app.post('/register', async (req, res) => {
  let userId = req.body.userId
  let password = req.body.password
  let name = req.body.name
  let role = req.body.role
  let encPassword

  try {
    encPassword = await bcrypt.hash(password, 10)
  } catch (error) {
    console.log(error)
    return res.sendStatus(500)
  }

  let userExist = await db.getUser(userId)
  if (userExist) {
    console.log('User ID unavailable')
    res.sendStatus(400)     // If user ID is unavailable, bad request. Could also render fail.ejs
    return
  }

  db.addUser(userId, name, role, encPassword)

  // Used for debugging to make sure the new user was added
  console.log(await db.getAllUsers())
  res.redirect('/identify')
})

app.listen(3000)