const express = require('express');
const router = express.Router();
const {
  upload,
  uploadContacts,
  listContacts
} = require('../controllers/contactsController');

router.post('/upload', upload.single('file'), uploadContacts);
router.get('/', listContacts);

module.exports = router;
