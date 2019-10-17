const http = require("http");
const WebSocketServer = require('ws').Server;
const express = require('express');

const app = express();
const webPort = process.env.PORT;
app.use(express.static('public'));


var webServer = http.createServer(app);
webServer.listen(webPort, function () {
  console.log('HTTP Express server is up!');
});

const wsServer = new WebSocketServer({ server: webServer });
console.log('websocket server start. port=' + webServer.address().port );
let clientIndex = 0;
function getId(ws) {
  if (ws.additionalId) {
    return ws.additionalId;
  }
  else {
    clientIndex++;
    ws.additionalId = 'member_' + clientIndex;
    return ws.additionalId;
  }
}
wsServer.on('connection', function connection(ws) {
  console.log('client connected. id=' + getId(ws) + '  , total clients=' + getClientCount());
  broadcast( { type: 'notify', text: 'new client connected. count=' + getClientCount()});

  ws.on('close', function () {
    const fromId = getId(ws);

    console.log('client closed. id=' + fromId + '  , total clients=' + getClientCount());
    broadcast( { type: 'client_disconnect', from: fromId});
    broadcast( { type: 'notify', text: 'client closed. count=' + getClientCount() } );
  });
  ws.on('error', function(err) {
    console.error('ERROR:', err);
  });
  ws.on('message', function incoming(data) {
    const inMessage = JSON.parse(data);
    const fromId = getId(ws);
    if (! inMessage) {
      console.error('GOT INVALID data from:' + fromId);
      return;      
    }

    console.log('received id=%s type=%s',  fromId, inMessage.type);
    inMessage.from = fromId;
    const toId = inMessage.to;

    if (toId) {
      sendTo(toId, inMessage);
    }
    else {
      sendOthers(fromId, inMessage)
    }
  });

  sendback(ws, { type: 'welcome' });
});

function sendback(ws, message) {
  const str = JSON.stringify(message);
  ws.send(str);
}

function broadcast(message) {
  const str = JSON.stringify(message);
  wsServer.clients.forEach(function (ws) {
    ws.send(str);
  });
};

function sendOthers(fromId, message) {
  const str = JSON.stringify(message);
  wsServer.clients.forEach(function (ws) {
    if (getId(ws) === fromId) {
      // skip
      console.log('skip same id=' + fromId);
    }
    else {
      ws.send(str);
    }
  });
}

function sendTo(toId, message) {
  const str = JSON.stringify(message);
  wsServer.clients.forEach(function (ws) {
    if (getId(ws) === toId) {
      // send message
      console.log('send message to id=' + toId);
      ws.send(str);
      return;
    }
  });
}

function getClientCount() {
  return wsServer.clients.size;
}