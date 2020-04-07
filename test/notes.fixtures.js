function makeNotesArray() {
  return [
    {
      id: 1,
      note_name: 'First test note',
      date_modified: '0029-01-22T16:28:32.615Z',
      folder_id: 1,
      content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Adipisci, pariatur.Molestiae, libero esse hic adipisci autem neque ?'
    },
    {
      id: 2,
      note_name: 'Second test note',
      date_modified: '2100-05-22T16:28:32.615Z',
      folder_id: 2,
      content: 'Natus consequuntur deserunt commodi, nobis qui inventore corrupti iusto aliquid debitis unde non.'
    },
    {
      id: 3,
      note_name: 'Third test note',
      date_modified: '1919-12-22T16:28:32.615Z',
      folder_id: 3,
      content: 'Cupiditate totam laborum esse animi ratione ipsa dignissimos laboriosam eos similique cumque. Est nostrum esse porro id quaerat.'
    }
  ]
}

module.exports = {
  makeNotesArray
}