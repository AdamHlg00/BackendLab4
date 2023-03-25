const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database(':memory:')

// List used to seed database
const userList = [
  ['id1', 'student1', 'student', 'password'],
  ['id2', 'student2', 'student', 'password2'],
  ['id3', 'teacher', 'teacher', 'password3'],
  ['admin', 'admin', 'admin', 'admin']
]

// Creates the Users table and seeds it
db.serialize(() => {
  db.run('CREATE TABLE Users (userId VARCHAR(255), name VARCHAR(255), role VARCHAR(255), password VARCHAR(255))')

  userList.forEach((user) => {
    let stmt = db.prepare('INSERT INTO Users (userId, name, role, password) VALUES (?, ?, ?, ?)')
    stmt.run(user, (err) => {
      if (err) {
        throw err
      }
    })
    stmt.finalize()
  })
})

// Gets a user based on userID
function getUser(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM Users WHERE userId = ?', [userId], (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

// Gets all users from the database
function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM Users', [], (err, rows) => {
      if (err) {
        reject(err)
      }

      resolve(rows)
    })
  })
}

// Adds a user to the database
function addUser(userID, name, role, password) {
  let stmt = db.prepare('INSERT INTO Users (userId, name, role, password) VALUES (?, ?, ?, ?)')
  stmt.run(userID, name, role, password, (err) => {
    if (err) {
      throw err
    }
  })
  stmt.finalize()
}

module.exports = { db, getUser, getAllUsers, addUser }
