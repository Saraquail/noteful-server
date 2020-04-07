require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const app = express()

const foldersRouter = require('./folders/folders-router')
const notesRouter = require('./notes/notes-router')

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganOption))
app.use(helmet())
app.use(cors())
app.use('/api/folders', foldersRouter)
app.use('/api/notes', notesRouter)


app.use((error, req, res, next) => {
  let message
  if (NODE_ENV === 'production') {
    message = 'Server error'
  }
  else {
    console.error(error)
    message = error.message
  }
  res.status(500).json(message)
})

app.get('/', (req, res) => {
  res.send('Hello, boilerplate!')
})

module.exports = app