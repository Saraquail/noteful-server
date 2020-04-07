const path = require('path')
const express = require('express')
const xss = require('xss')
const NotesService = require('./NotesService')

const notesRouter = express.Router()
const jsonParser = express.json()

const serializeNote = note => ({
  id: note.id,
  note_name: xss(note.note_name),
  date_modified: note.date_modified,
  folder_id: note.folder_id,
  content: xss(note.content)
})

notesRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')

    NotesService.getAllNotes(knexInstance)
      .then(notes => {
        res.json(notes.map(serializeNote))
      })
      .catch(next)
    })

    .post(jsonParser, (req, res, next) => {
      const { note_name, folder_id, content } = req.body

      const newNote = { note_name, content }

      for (const [key, value] of Object.entries(newNote))
        if(value == null)
          return res.status(400).json({ 
            error: { message: `Missing ${key} in request body` }
          })

      newNote.folder_id = folder_id

      NotesService.insertNote(
        req.app.get('db'),
        newNote
      )
        .then(note => {
          res
            .status(201)
            .location(path.posix.join(req.originalUrl, `/${note.id}`))
            .json(serializeNote(note))
        })
        .catch(next)
    })

notesRouter
  .route('/:note_id')
  .all((req, res, next) => {
    NotesService.getById(
      req.app.get('db'),
      req.params.note_id
    )
      .then(note => {
        if(!note) {
          return res.status(404).json({
            error: { message: 'Note does not exist' }
          })
        }
        res.note = note
        next()
      })
      .catch(next)
  })

  .get((req, res, next) => {
    res.json(serializeNote(res.note))
  })

  .delete((req, res, next) => {
    
    NotesService.deleteNote(
      req.app.get('db'),
      req.params.note_id
    )
      .then(rows => {
        res.status(204).end()
      })
      .catch(next)
  })

  .patch(jsonParser, (req, res, next) => {
    const { note_name, date_modified,  content } = req.body

    const noteToUpdate = { note_name, content } 

    //const numOfVals = Object.entries(noteToUpdate).filter(Boolean).length

    if(!note_name && !content) 
      return res.status(400).json({
        error: { message: 'Must contain either name or content'}
      })

      noteToUpdate.date_modified = date_modified
console.log(noteToUpdate)
      NotesService.updateNote(
        req.app.get('db'),
        req.params.note_id,
        noteToUpdate
      )
        .then(rows => {
          res.status(204).end()
        })
        .catch(next)
  })

  module.exports = notesRouter