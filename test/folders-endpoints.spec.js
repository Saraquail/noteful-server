const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')

const { makeFoldersArray } = require('./folders.fixtures')

describe.skip('Folders Endpoints', () => {

  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () => db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE'))

  afterEach('cleanup', () => db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE'))

  describe('GET /api/folders', () => {

    context('If there are no folders', () => {
      it('responds with 200 and an empty array', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, [])
      })
    })

    context('If there are folders', () => {
      const testFolders = makeFoldersArray();

      beforeEach('insert articles', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
        })

      it('responds with 200 and all of the folders', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, testFolders)
      })
    })
  })

  describe('POST /api/folders', () => {
    it('creates a folder, responds with 201 and the new folder', () => {

      const newFolder = {
        folder_name: 'Test new folder'
      }

      return supertest(app)
        .post('/api/folders')
        .send(newFolder)
        .expect(201)
        .expect(res => {
          expect(res.body.folder_name).to.eql(newFolder.folder_name)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
        })
        .then(postRes => 
          supertest(app)
            .get(`/api/folders/${postRes.body.id}`)
            .expect(postRes.body)
          )
    })

    it('responds with 400 and error message when no data is sent', () => {
      const newFolder = {
        folder_name: null
      }

      return supertest(app)
        .post('/api/folders')
        .send(newFolder)
        .expect(400, {
          error: { message: 'Missing folder name' }
        })
    })
  })

  describe('GET /api/folders/:folder_id', () => {
    
    context('If there are no folders', () => {

      it('responds with 404', () => {
        const folderId = 32456

        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(404, {
            error: { message: 'Folder does not exist' }
          })
      })
    })

    context('If there are folders', () => {
      const testFolders = makeFoldersArray()

      beforeEach('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
      })
    
      it('responds with 200 and the specified folder', () => {
        const folderId = 2
        const expectedFolder = testFolders[folderId - 1]

        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(200, expectedFolder)
      })
    })

    context('Given an XSS attack', () => {
      const evilFolder = {
        id: 911,
        folder_name: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
      }

      beforeEach('insert evil folders', () => {
        return db
          .into('noteful_folders')
          .insert(([evilFolder]))
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/folders/${evilFolder.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.folder_name).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
          })
      })
    })
  })

  describe('DELETE /api/folders/:folder_id',() => {

    context('If there are no folders', () => {
      
      it('responds with 404', () => {
      const folderId = 93847
      
        return supertest(app)
          .delete(`/api/folders/${folderId}`)
          .expect(404, { error: { message: 'Folder does not exist' } })
      })
    })

    context('If there are folders', () => {
      const testFolders = makeFoldersArray()

      beforeEach('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
      })

      it('responds with 204 and removes the folder', () => {
        const idToRemove = 2
        const expectedFolders = testFolders.filter(folder => folder.id !== idToRemove)

        return supertest(app)
          .delete(`/api/folders/${idToRemove}`)
          .expect(204)
          .then(res => 
            supertest(app)
              .get('/api/folders')
              .expect(expectedFolders)
            )
      })
    })
  })

  describe('PATCH /api/folders/:folder_id endpoint', () => {

    context('If there are no folders', () => {
      it('responds with 404', () => {
        const folderId = 954376

        return supertest(app)
          .patch(`/api/folders/${folderId}`)
          .expect(404, { error: { message: 'Folder does not exist'} })
      })
    })

    context('If there are folders', () => {
      const testFolders = makeFoldersArray()
      
      beforeEach('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
      })
    

      it('responds with 400 when required field is missing', () => {
        const idToUpdate = 2

        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send({ irrelevantField: 'poo' })
          .expect(400, { error: { message: 'Missing folder name to update' } })
      })

      it('responds with 204 and updates the folder', () => {
        const idToUpdate = 2
        const updateFolder = {
          folder_name: 'updated folder'
        }

        const expectedFolder = {
          ...testFolders[idToUpdate - 1],
          ...updateFolder
        }

        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send(updateFolder)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/folders/${idToUpdate}`)
              .expect(expectedFolder)  
            )
      })
    })
  })
})