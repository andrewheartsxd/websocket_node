'use strict';

var mongoose = require('mongoose');

var messageSchema = mongoose.Schema({
      nickName: String,
      msgBody: String,
      date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
