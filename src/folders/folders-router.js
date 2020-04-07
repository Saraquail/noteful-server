const path = require('path')
const express = require('express')
const xss = require('xss')
const FoldersService = require('./FoldersService')

const foldersRouter = express.Router()
const jsonParser = express.json()

const serializeFolder = folder => ({
  id: folder.id,
  folder_name: xss(folder.folder_name)
})

foldersRouter
  .route('/')

  .get((req, res, next) => {    
    FoldersService.getAllFolders(
      req.app.get('db')
    )
      .then(folders => {
        res.json(folders)
      })
      .catch(next)
  })

  .post(jsonParser, (req, res, next) => {
    const { folder_name } = req.body
    const newFolder = { folder_name }

    if(!folder_name){
      return res.status(400).json({
        error: { message: 'Missing folder name'}
      })
    }

    FoldersService.insertFolder(
      req.app.get('db'),
      newFolder
    )
      .then(folder => {
        res 
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${folder.id}`))
          .json(serializeFolder(folder))
      })
      .catch(next)
  })

foldersRouter
  .route('/:folder_id')
  .all((req, res, next) => {
    FoldersService.getById(
      req.app.get('db'),
      req.params.folder_id
    )
      .then(folder => {
        if(!folder) {
          return res.status(404).json({
            error: { message: 'Folder does not exist' }
          })
        }
        res.folder = folder
        next()
      })
      .catch(next)
  })
  
  .get((req, res, next) => {
    res.json(serializeFolder(res.folder))
  })

  .delete((req, res, next) => {
    FoldersService.deleteFolder(
      req.app.get('db'),
      req.params.folder_id
    )
      .then(rows => {
        res.status(204).end()
      })
      .catch(next)
  })

  .patch(jsonParser, (req, res, next) => {
    const { folder_name } = req.body
    const folderToUpdate = { folder_name }

    if(!folder_name) {
      return res.status(400).json({
        error: { message: 'Missing folder name to update'}
      })
    }

    FoldersService.updateFolder(
      req.app.get('db'),
      req.params.folder_id,
      folderToUpdate
    )
      .then(rows => {
        res.status(204).end()
      })
      .catch(next)
  })




  module.exports = foldersRouter