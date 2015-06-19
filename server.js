'use strict';

var WebSocketServer = require('ws').Server;  
var port = process.env.PORT || 7000;
var mongoose = require('mongoose');
var Message = require('./models/Message');
var MessageStore = require('./models/MessageStore');

mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost/overload_chat');

var wss = new WebSocketServer({port: port});
console.log('websocket server created, listening on port: ' + port);

// broadcasts messages to all connected users
wss.broadcast = function(data) {
  for (var i in this.clients)
    this.clients[i].send(data);
};

// client connect
wss.on("connection", function(ws) {
  console.log("websocket connection open");

  // looks for and displays cached messages in db 
  MessageStore.findOne({})
  .populate('messageStore')
  .exec(function(err, msgs) {
    if (err) throw err;
    if (!msgs) {
      return;
    } 
    for (var i = 0; i < msgs.messageStore.length; i++) {
      ws.send(msgs.messageStore[i].nickName + ": " + msgs.messageStore[i].msgBody); 
    }
  }); 
  
  // parses message sent by client 
  ws.on("message", function(message) {
    var client = {};
    var parsedMessage = JSON.parse(message);
    ws.nickName = parsedMessage.nickName;
    ws.msgBody = parsedMessage.msgBody;

    var newMessage = new Message();
    newMessage.nickName = ws.nickName;
    newMessage.msgBody = ws.msgBody;
    
    // broadcasts message, saves to db
    if (ws.msgBody) {
      wss.broadcast(ws.nickName + ": " + ws.msgBody);
      newMessage.save(function(err, message) {
        if (err) throw err;
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
            // only keeps 10 messages in cache
            if (foundMsgStore.messageStore.length > 10) foundMsgStore.messageStore.shift();
            foundMsgStore.messageStore.push(message._id);
            foundMsgStore.save(function(err, savedMessageStore) {
              if (err) throw err;
            });
          }
        }); 
      });
    }
  }); 
  
  // client disconnect
  ws.on("close", function() {
    console.log("websocket connection closed");
  });

});
