const express = require('express');
const router = express.Router();
const { createCampaign } = require('../controllers/campaignController');

router.post('/', createCampaign);

module.exports = router;
