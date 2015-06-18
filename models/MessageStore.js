'use strict';

var mongoose = require('mongoose');

var messageStoreSchema = new mongoose.Schema({
  messageStore: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    }],
  }
});

module.exports = mongoose.model('MessageStore', messageStoreSchema);




