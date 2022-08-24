const path = require('path');
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const port = process.env.PORT || 4000;

// App and server instances
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile('/index.html', {root: 'public'});
});

app.get('/hello', (req, res) => {
    res.send('<h1>Hello world</h1>');
});

let rooms = {};
let socketroom = {};
let socketname = {};
let micsocket = {};
let videosocket = {};
let boardsocket = {};

io.on('connect', socket => {
  socket.on('join room', (roomname, username) => {
    socket.join(roomname);
    socketroom[socket.id] = roomname;
    socketname[socket.id] = username;
    micsocket[socket.id] = 'on';
    videosocket[socket.id] = 'on';

    if (rooms[roomname] && rooms[roomname].length > 0) {
      rooms[roomname].push(socket.id);
      socket.to(roomname).emit('message', `${username} joined`);
      io.to(socket.id).emit('join room', rooms[roomname].filter(pid => pid != socket.id), socketname, micsocket, videosocket);
    } else {
      rooms[roomname] = [socket.id];
      io.to(socket.id).emit('join room', null, null, null, null);
    }
    io.to(roomname).emit('user count', rooms[roomname].length);
  });

  socket.on('action', message => {
    if (message == 'mute') {
      micsocket[socket.id] = 'off';
    } else if (message == 'unmute') {
      micsocket[socket.id] = 'on';
    } else if (message == 'videoon') {
      videosocket[socket.io] = 'on';
    } else if (message == 'videooff') {
      videosocket[socket.io] = 'off';
    }
    socket.to(socketroom[socket.id]).emit('action', message, socket.id);
  });

  socket.on('video-offer', (offer, sid) => {
    socket.to(sid).emit('video-offer', offer, socket.id, socketname[socket.id], micsocket[socket.id], videosocket[socket.id]);
  })

  socket.on('video-answer', (answer, sid) => {
    socket.to(sid).emit('video-answer', answer, socket.id);
  })

  socket.on('new icecandidate', (candidate, sid) => {
    socket.to(sid).emit('new-candidate', candidate, socket.id);
  })

  socket.on('message', (msg, username, roomname) => {
    io.to(roomname).emit('message', msg, username, roomname);
  })

  socket.on('disconnect', () => {
    if (!socketroom[socket.id]) return;
    socket.to(socketroom[socket.id]).emit('message', `${socketname[socket.id]} left`);
    socket.to(socketroom[socket.id]).emit('remove peer', socket.id);
  })
})

server.listen(port, () => {
  console.log(`listening on port: ${port}`);
});