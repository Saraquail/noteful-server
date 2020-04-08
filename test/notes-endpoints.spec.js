const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')

const { makeFoldersArray } = require('./folders.fixtures')
const { makeNotesArray } = require('./notes.fixtures')

describe('Notes Endpoints', () => {

  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () => db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE'))

  afterEach('cleanup', () => db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE'))

  describe('GET /api/notes', () => {

    context('If there are no notes', () => {
      it('responds with 200 and an empty array', () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, [])
      })
    })

    context('If there are notes', () => {
      const testFolders = makeFoldersArray()
      const testNotes = makeNotesArray()

      beforeEach('insert folders and notes', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes)
          })    
      })
    
      it('responds with 200 and all the notes', () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, testNotes)
      })
    })
  })

  describe('GET /api/notes/:note_id endpoint', () => {

    context('If there are no notes', () => {

      it('responds with 404', () => {
        const noteId = 25920
        
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(404, { error: { message: 'Note does not exist' } })
      })
    })

    context('If there are notes', () => {
      const testFolders = makeFoldersArray()
      const testNotes = makeNotesArray()

      beforeEach('insert folders and notes', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes)
          })    
      })

      it('responds with 200 and the specified note', () => {
        const noteId = 2
        const expectedNote = testNotes[noteId - 1]

        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(200, expectedNote)
      })
    })

    context('Given an XSS attack note', () => {
      const evilNote = {
        id: 666,
        note_name:'Evil evil very evil <script>alert("xss");</script>',
        folder_id: 2,
        content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
      }

      beforeEach('insert evil note', () => {
        const testFolders = makeFoldersArray()

        return db 
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(([evilNote]))
            })
          })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/notes/${evilNote.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.note_name).to.eql('Evil evil very evil &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
            expect(res.body.content).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
          })
      })
    })
  })

  describe('POST /api/notes endpoint', () => {
    
    it('creates a note, responds with 201 and the new note', function() {
      this.retries(3)

      const testFolders = makeFoldersArray()
      const newNote = {
        note_name: 'test note name',
        folder_id: 2,
        content: 'test content'
      }

      before('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
      })

      return supertest(app)
        .post('/api/notes')
        .send(newNote)
        .expect(201)
        .expect(res => {
          expect(res.body.note_name).to.eql(newNote.note_name)
          expect(res.body.content).to.eql(newNote.content)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`)

          const expectDate = new Date().toLocaleString()
          const actualDate = new Date(res.body.date_modified).toLocaleString()

          expect(actualDate).to.eql(expectDate)
        })
        .then(postRes => 
          supertest(app)
            .get(`/api/notes/${postRes.body.id}`)
            .expect(postRes.body)
        )
    })

    const requiredFields = ['note_name', 'content']

    testFolders = makeFoldersArray()


    beforeEach('insert folders', () => {
      return db
        .into('noteful_folders')
        .insert(testFolders)
    })

    requiredFields.forEach(field => {
      const newNote = {
        note_name: 'test note name',
        folder_id: 2,
        content: 'test content'
      }

      it(`responds with 400 and an error message when the ${field} is missing`, () => {
        delete newNote[field]

        return supertest(app)
          .post('/api/notes')
          .send(newNote)
          .expect(400, { error: { message: `Missing ${field} in request body` } })
      })
    })
  })

  describe('DELETE /api/notes/:note_id endpoint', () => {

    context('If there are no notes', () => {

      it('responds with 404', () => {
        const noteId = 93328

        return supertest(app)
          .delete(`/api/notes/${noteId}`)
          .expect(404, { error: { message: 'Note does not exist'} })
      })
    })

    context('If there are notes', () => {
      const testFolders = makeFoldersArray()
      const testNotes = makeNotesArray()


    beforeEach('insert folders', () => {
      return db
        .into('noteful_folders')
        .insert(testFolders)
        .then(() => {
          return db
            .into('noteful_notes')
            .insert(testNotes)
        })
    })

      it('responds with 204 and removes the note', () => {
        const idToRemove = 2
        const expectedNotes = testNotes.filter(note => note.id !== idToRemove)

        return supertest(app)
          .delete(`/api/notes/${idToRemove}`)
          .expect(204)
          .then(res => 
            supertest(app)
              .get('/api/notes')
              .expect(expectedNotes)
            )
      })
    })
  })

  describe('PATCH /api/notes/:note_id endpoint', () => {
    
    context('If there are no notes', () => {
      it('responds with 404', () => {
        const noteId = 99348

        return supertest(app)
          .patch(`/api/notes/${noteId}`)
          .expect(404, { error: { message: 'Note does not exist' } })
      })
    })

    context('If there are notes', () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray()
      
      beforeEach('insert notes', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes)
          })
      })

      it('responds with 400 when no required fields are supplied', () => {
        const idToUpdate = 2

        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: 'Must contain either name or content' }
          })
      })

      it('responds with 204 when updating only a subset of fields', () => {
        const idToUpdate = 2
        const updatedNote = {
          note_name: 'new note name'
        }

        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updatedNote
        }

        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({
            ...updatedNote,
            fieldToIgnore: 'should be ignored'
          })
          .expect(204)
          .then(res => 
              supertest(app)
                .get(`/api/notes/${idToUpdate}`)
                .expect(expectedNote)
            )
      })

      it('responds with 204 and updates the note', () => {
        const idToUpdate = 2
        const updateNote = {
          note_name: 'updated name',
          content: 'updated content'
        }

        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote
        }

        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send(updateNote)
          .expect(204)
          .then(res => 
              supertest(app)
                .get(`/api/notes/${idToUpdate}`)
                .expect(expectedNote)
          )
      })
    })
  })
})
