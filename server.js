var express = require('express'),
    server = require('http').createServer(),
    WebSocketServer = require('ws').Server

var app = express(), wss = new WebSocketServer({ server: server })

app.use(express.static(__dirname + '/client'))

var players = []

// The protocol we will use
// Uint8       header   - 1 bit, 7 bit player number
// Float32[3]  position - X, Y, Z
// Float32[3]  rotation - rotation around X,Y,Z axis
// 25 byte per packet
wss.on('connection', function connection(ws) {
  var player = {
    socket: ws,
    x: -200 + Math.random() * 400,
    y: 0,
    z: -200 + Math.random() * 400
  }, playerIndex = players.length
  players.push(player)

  var packetBuf = new ArrayBuffer(25), packet = new DataView(packetBuf)
  packet.setUint8(0, (players.length - 1) + 128); // the most significant bit makes this a player announcement
  packet.setFloat32(1, player.x)
  packet.setFloat32(5, player.y)
  packet.setFloat32(9, player.z)

  ws.on('message', function incoming(message) {
    for(var i=0; i<players.length; i++) {
      if(players[i].socket === ws) continue

      players[i].socket.send(message, {binary: true})
    }
  });

  ws.on('close', function() {
    players.splice(playerIndex, 1)
  })

  ws.send(packetBuf, {binary: true, mask: false});
  for(var i=0; i<players.length - 1; i++) {
    players[i].socket.send(packetBuf, {binary: true})
    packet.setUint8(0, i + 128)
    packet.setFloat32(1, players[i].x)
    packet.setFloat32(5, players[i].y)
    packet.setFloat32(9, players[i].z)
    ws.send(packetBuf, {binary: true})
  }
});

server.on('request', app)
server.listen(process.env.PORT || 3000, function () { console.log('Listening on ' + server.address().port) })
