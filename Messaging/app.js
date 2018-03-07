const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var async = require('async');
const commandsModule = require('./modules/commandsModule');
var request = require('request');
var apiUrl = "http://localhost/websocket_apis";
var channelList = {
   received: "received", // for general purpose and registered before user is not logged
   receivedForLoggedIn: "receivedForLoggedIn" // Registered when user is logged-in
}

app.use(function (req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
   next();
});

app.get('/', (req, res) => {
   res.send('Messaging listening on port 3000');
});

io.on('connection', function (socket) {
   console.log(socket.id + '-User connected');
   socket.on('disconnect', function () {
      logout(socket.id, request);
      data = {
         "socket_id": socket.id,
         "command": commandsModule().GET_USERS_PANEL,
         "commandType": commandsModule().BROADCAST_TO_ALL
      };
      async.parallel({ get_users_panel: getUsersPanel.bind(null, data) }, function (err, result) {
         if (result.get_users_panel) {
            sendToClient(socket, channelList.receivedForLoggedIn, bindCommands(data, result.get_users_panel));
         }
      });
   });
   socket.on(commandsModule().CREATE_USER, (data) => {
      if (data.command == commandsModule().CREATE_USER) {
         request.post(
            {
               url: apiUrl + '/signup.php',
               form: data
            }, function (requestErr, requestRes, requestBody) {
               sendToClient(socket, channelList.received, bindCommands(data, requestBody));
            }
         );
      }
   });
   socket.on(commandsModule().LOGIN_USER, (data) => {
      if (data.command == commandsModule().LOGIN_USER) {
         request.post(
            {
               url: apiUrl + '/signin.php',
               form: data
            }, function (requestErr, requestRes, requestBody) {
               sendToClient(socket, channelList.received, bindCommands(data, requestBody));
            }
         );
      }
   });
   socket.on(commandsModule().AUTO_SIGNING, (data) => {
      if (data.command == commandsModule().AUTO_SIGNING) {
         request.post(
            {
               url: apiUrl + '/auto_signing.php',
               form: data
            }, function (requestErr, requestRes, requestBody) {
               sendToClient(socket, channelList.received, bindCommands(data, requestBody));
            }
         );
      }
   });
   socket.on(commandsModule().GET_USERS_PANEL, (data) => {
      if (data.command == commandsModule().GET_USERS_PANEL) {
         async.parallel({ get_users_panel: getUsersPanel.bind(null, data) }, function (err, result) {
            if (result.get_users_panel) {
               // console.log(bindCommands(data, result.get_users_panel));
               sendToClient(socket, channelList.receivedForLoggedIn, bindCommands(data, result.get_users_panel));
            }
         });
      }
   });
});

function bindCommands(data, requestBody) {
   var newRequestBody = {};
   try {
      if (Array.isArray(JSON.parse(requestBody)) && typeof (JSON.parse(requestBody)) == "object") {
         newRequestBody = { data: JSON.parse(requestBody) };
      } else if (typeof (newRequestBody) == "object") {
         newRequestBody = JSON.parse(requestBody);
      }
      if (data.command) {
         Object.assign(newRequestBody, { command: data.command });
      }
      if (data.commandType) {
         Object.assign(newRequestBody, { commandType: data.commandType });
      }
   } catch (E) {
      console.log(E);
   }
   return newRequestBody;
}

function sendToClient(socket, channel, data) {
   if (data.command) {
      if (data.commandType == commandsModule().BROADCAST_TO_ALL) {
         io.emit(channel, data);
      } else if (data.commandType == commandsModule().BROADCAST_TO_ALL_EXCEPT_SENDER) {
         socket.broadcast.emit(channel, data);
      } else {
         socket.emit(channel, data);
      }
   } else {
      console.log('While sending to client, command not found.');
      io.emit(channel, 'While sending to client, command not found.');
   }
}

function logout(socketId, request) {
   request.post(
      {
         url: apiUrl + '/logout.php',
         form: { socket_id: socketId }
      }, function (requestErr, requestRes, requestBody) {
         console.log(requestBody);
      }
   );
   console.log(socketId + ' user disconnected');
}

var getUsersPanel = function (data, callback) {
   request.post(
      {
         url: apiUrl + '/get_users_panel.php',
         form: data
      }, function (requestErr, requestRes, requestBody) {
         callback(null, requestBody);
      }
   );
};

http.listen(3000, function () {
   console.log('listening on *:3000');
});
