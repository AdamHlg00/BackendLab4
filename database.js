const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database(':memory:')

const userList = [
  ['id1', 'user1', 'student', 'password'],
  ['id2', 'user2', 'student', 'password2'],
  ['id3', 'user3', 'teacher', 'password3'],
  ['admin', 'admin', 'admin', 'admin']
]

db.serialize(() => {
  db.run('CREATE TABLE Users (userID VARCHAR(255), name VARCHAR(255), role VARCHAR(255), password VARCHAR(255))')

  userList.forEach((user) => {
    let stmt = db.prepare('INSERT INTO Users (userID, name, role, password) VALUES (?, ?, ?, ?)')
    stmt.run(user, (err) => {
      if (err) {
        throw err
      }
    })
    stmt.finalize()
  })
})

function getUser(userID) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM Users WHERE userID = ?', [userID], (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

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

module.exports = { db, getUser, getAllUsers }
