'use strict';
// server.js
var WebSocketServer = require('ws').Server;  
var port = process.env.PORT || 7000;
var mongoose = require('mongoose');
var Message = require('./models/Message');
var MessageStore = require('./models/MessageStore');

mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost/overload_chat');

var wss = new WebSocketServer({port: port});
console.log('websocket server created, listening on port: ' + port);

wss.broadcast = function(data) {
  for (var i in this.clients)
    this.clients[i].send(data);
};

wss.on("connection", function(ws) {
  console.log("websocket connection open");

  MessageStore.findOne({})
  .populate('messageStore')
  .exec(function(err, msgs) {
    if (err) throw err;
    console.log("msgs: ");
    console.log(msgs);
    if (!msgs) {
      console.log("no messages in messageStore");
      return;
    } 
    for (var i = 0; i < msgs.messageStore.length; i++) {
      ws.send(msgs.messageStore[i].nickName + ": " + msgs.messageStore[i].msgBody); 
    }
  }); 
  
  ws.on("message", function(message) {
    var client = {};
    var parsedMessage = JSON.parse(message);
    console.log("parsedMessage: ");
    console.dir(parsedMessage);
    ws.nickName = parsedMessage.nickName;
    ws.msgBody = parsedMessage.msgBody;

    var newMessage = new Message();
    newMessage.nickName = ws.nickName;
    newMessage.msgBody = ws.msgBody;

    console.log("nickName: " + ws.nickName);
    console.log("messageBody: " + ws.msgBody);
    
    if (ws.msgBody) {
      wss.broadcast(ws.nickName + ": " + ws.msgBody);
      newMessage.save(function(err, message) {
        if (err) throw err;
        //console.log(message.nickName);
        //console.log(message.msgBody);
        MessageStore.findOne({}, function(err, foundMsgStore) {
          if (err) throw err;

          if (!foundMsgStore) {
            var newMessageStore = new MessageStore();
            newMessageStore.messageStore.push(message._id);
            newMessageStore.save(function(err, result) {
              if (err) throw err;
              console.log("result: ", result);
            });
          } else {
            console.log("foundMsgStore " + foundMsgStore);
            if (foundMsgStore.messageStore.length > 10) foundMsgStore.messageStore.shift();
            foundMsgStore.messageStore.push(message._id);
            foundMsgStore.save(function(err, savedMessageStore) {
              if (err) throw err;
              console.log("savedMessageStore: " + savedMessageStore);
            });
          }
        }); 
      });
    }
    //else {
    //  // New user -> Show all past messages
    //  MessageStore.findOne({})
    //  .populate('messageStore')
    //  .exec(function(err, msgs) {
    //    if (err) throw err;
    //    console.log("msgs: ");
    //    console.log(msgs);
    //    if (!msgs) {
    //      console.log("no messages in messageStore");
    //      return;
    //    } 
    //    for (var i = 0; i < msgs.messageStore.length; i++) {
    //      ws.send(msgs.messageStore[i].nickName + ": " + msgs.messageStore[i].msgBody); 
    //    }
    //  }); 
    //}
  }); 

  ws.on("close", function() {
    console.log("websocket connection closed");
  });
});
