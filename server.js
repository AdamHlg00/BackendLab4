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

// Roles, used for easier authentication checks
let adminRole = ['admin']
let teacherRole = ['admin', 'teacher']

// Since newly registered users' passwords are encrypted, this array is used
// to keep track of those users whose passwords are stored in plaintext
let originalUsers = ['id1', 'id2', 'id3', 'admin']

// Default route
app.get('/', (req, res) => {
  res.redirect('/identify')
})

// Takes login information from the identify view
app.post('/identify', async (req, res) => {
  const userId = req.body.userId
  const password = req.body.password
  const token = jwt.sign(userId, process.env.ACCESS_TOKEN_SECRET)
  currentKey = token
  currentPassword = password

  try {
    let user = await db.getUser(userId)

    // Makes sure the user exists in the database
    if (!user) {
      console.log('User does not exist')
      res.redirect('/identify')
    }

    // Requires two different ways of checking passwords, 
    // one for non-encrypted and one for encrypted
    if (originalUsers.includes(userId)) {
      if (currentPassword === user.password) {
        currentUser = await user
        res.redirect(`/users/${currentUser.userId}`)
      } else {
        console.log('Incorrect password')
        res.redirect('/identify')
      }
    } else {
      // For encrypted passwords
      if (await bcrypt.compare(currentPassword, user.password)) {
        currentUser = await user
        res.redirect(`/users/${currentUser.userId}`)
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

// The identify route
app.get('/identify', (req, res) => {
  res.render('identify.ejs')
})

// Function used to make sure there is a valid token and the user is logged in
function authenticateToken(req, res, next) {
  if (currentKey == '') {
    res.redirect('/identify')
  } else if (jwt.verify(currentKey, process.env.ACCESS_TOKEN_SECRET)) {
    next()
  } else {
    res.redirect('/identify')
  }
}

// Granted route. Mostly unused when criteria for grade 5 is achieved
app.get('/granted', authenticateToken, (req, res) => {
  res.render('start.ejs')
})

// The admin route
app.get('/admin', authenticateToken, async (req, res) => {
  // Checks if the current user's role is part of the andmin role
  if (!adminRole.includes(currentUser.role)) {
    res.redirect('/identify')
  } else {
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
  }
})

// The student1 route
app.get('/student1', authenticateToken, (req, res) => {
  // Checks if the current user's role is part of the teacher role
  if (!teacherRole.includes(currentUser.role)) {
    // If not teacher, check if it's the correct student
    if (currentUser.name !== 'student1') {
      res.redirect('/identify')
    } else {
      res.render('student1.ejs')
    }
  } else {
    res.render('student1.ejs')
  }
})

// The student2 route
app.get('/student2', authenticateToken, (req, res) => {
  // Checks if the current user's role is part of the teacher role
  if (!teacherRole.includes(currentUser.role)) {
    // If not teacher, check if it's the correct student
    if (currentUser.name !== 'student2') {
      res.redirect('/identify')
    } else {
      res.render('student2.ejs', { user: currentUser })
    }
  } else {
    res.render('student2.ejs', { user: currentUser })
  }
})

// The teacher route
app.get('/teacher', authenticateToken, (req, res) => {
  // Checks if the current user's role is part of the teacher role
  if (!teacherRole.includes(currentUser.role)) {
    res.redirect('/identify')
  } else {
    res.render('teacher.ejs')
  }
})

// The register route
app.get('/register', (req, res) => {
  res.render('register.ejs')
})

// Takes account credentials as input from the register view
app.post('/register', async (req, res) => {
  let userId = req.body.userId
  let password = req.body.password
  let name = req.body.name
  let role = req.body.role
  let encPassword

  try {
    // Encrypts the password
    encPassword = await bcrypt.hash(password, 10)
  } catch (error) {
    console.log(error)
    return res.sendStatus(500)
  }

  let userExist = await db.getUser(userId)
  // Checks if the user ID is available
  if (userExist) {
    console.log('User ID unavailable')
    res.sendStatus(400)     // If user ID is unavailable, bad request. Could also render fail.ejs
    return
  }

  // Adds user to database
  db.addUser(userId, name, role, encPassword)

  // Used for debugging to make sure the new user was added
  console.log(await db.getAllUsers())
  res.redirect('/identify')
})

// The dynamic user route
app.get('/users/:userId', authenticateToken, (req, res) => {
  // Checks if the current user's user ID is the same as the route it's trying to access.
  if (currentUser.userId === req.params.userId) {
    res.render('dynamicView.ejs', { user: currentUser })
  } else {
    console.log('Incorrect user ID')
    res.redirect('/identify')
  }
})

app.listen(3000)