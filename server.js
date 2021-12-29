'use strict';

const express = require('express');
const session = require('express-session');
const http = require('http');
const uuid = require('uuid');
const { WebSocketServer } = require('ws');
const User = require('./user');
const Message = require('./message');

/**
 * Aktif kullanıcılar
 * @type {Map<string, User>}
 */
const users = new Map();

/**
 * Mesaj geçmişi
 * @type {Message[]}
 */
const messages = [];

const app = express();
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true
  })
);

// Web client'lar için session parser
const sessionParser = session({
  saveUninitialized: false,
  secret: '$eCuRiTy',
  resave: false
});
app.use(sessionParser);

// 'public' klasörünü sunucuya ekle
app.use(express.static('public'));

// Login / Register için api
app.post('/login', function (req, res) {
  // Client için id oluştur ve session'a kaydet
  let id = req.body?.username;
  if (!id || users.has(id)) {
    id += `-${uuid.v4()}`;
  }

  console.log(`Creating / Updating session for user ${id}`);
  req.session.userId = id;
  res.send({ result: 'OK', userId: id });
});

// Logout için api
app.delete('/logout', function (req, res) {
  const user = users.get(req.session.userId);

  console.log('Destroying session');
  req.session.destroy(function () {
    if (user) {
      user.connection.close();
    }

    res.send({ result: 'OK', message: 'Session destroyed' });
  });
});

// HTTP server
const httpServer = http.createServer(app);

// WebSocket server
const wsServer = new WebSocketServer({ clientTracking: false, noServer: true });

// HTTP bağlantı websokete geçirildiğinde
httpServer.on('upgrade', function (req, socket, head) {
  console.log('Parsing session from request...');

  sessionParser(req, {}, function() {
    // Login olmamışsa hata dön
    if (!req.session.userId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      console.log('User id not found!');
      return;
    }

    console.log('Session is parsed!');

    // Websoket bağlantısına geçir
    wsServer.handleUpgrade(req, socket, head, function (wsClient) {
      wsServer.emit('connection', wsClient, req);
    });
  });
});

// Websoket bağlantısı açıldığında
wsServer.on('connection', function (wsClient, request) {
  // Session'dan gelen user id ile kullanıcıyı oluştur
  const user = new User(request.session.userId, wsClient);

  // Kullanıcıyı kaydet
  users.set(user.id, user);

  // Mesaj geçmişini kullanıcıya gönder
  messages.forEach((message) => wsClient.send(message.toWsMessage()));

  // Event mesajı ekle
  addNewMessage(new Message(`${user.id} joined`, undefined, new Date(), true));

  // Kullanıcıdan mesaj geldiğinde
  wsClient.on('message', function (raw) {
    console.log(`Received message from user ${user.id}`);
    const message = JSON.parse(raw.toString());
    addNewMessage(new Message(message.content, user, new Date(), undefined, message.isFile));
  });

  // Bağlantı kapatıldığında
  wsClient.on('close', function () {
    addNewMessage(new Message(`${user.id} leaved`, undefined, new Date(), true));
    // Kullanıcıyı sil
    users.delete(user.id);
  });
});

function addNewMessage(message) {
  messages.push(message);
  users.forEach((user) => {
    user.connection.send(message.toWsMessage());
  })
}

// HTTP server'ı başlat
const port = process.env.PORT || 3000;
httpServer.listen(port, function () {
  console.log('Listening on http://localhost:'+port);
});
