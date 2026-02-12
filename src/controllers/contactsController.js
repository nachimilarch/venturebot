const multer = require('multer');
const Contact = require('../models/Contact');
const { parseCsvBuffer } = require('../services/csvService');

const upload = multer({ storage: multer.memoryStorage() });

async function uploadContacts(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('CSV file is required');
      err.status = 400;
      throw err;
    }

    const contacts = await parseCsvBuffer(req.file.buffer);

    if (!contacts.length) {
      const err = new Error('No contacts found in CSV');
      err.status = 400;
      throw err;
    }

    await Contact.bulkInsert(contacts);

    res.json({
      success: true,
      count: contacts.length,
      message: 'Contacts uploaded successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function listContacts(req, res, next) {
  try {
    const rows = await Contact.getAll();
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  upload,
  uploadContacts,
  listContacts
};
