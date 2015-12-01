var express = require('express'),
    server = require('http').createServer(),
    WebSocketServer = require('ws').Server

var app = express(), wss = new WebSocketServer({ server: server })

app.use(express.static(__dirname + '/client'))

var players = {}, nextId = 1

app.get('/reset', function(req, res) {
  console.log('Resetting state')
  nextId = 1
  var keys = Object.keys(players)
  for(var i=0; i<keys.length;i++) players[keys[i]].socket.close()
  players = {}
  res.send('OK')
})

// Helper functions

function getRandomPosition() {
  return {
    x: -200 + Math.random() * 400,
    y: Math.random() * 500,
    z: -200 + Math.random() * 400
  }
}

function makePacket(header, position, rotation) {
  if(!position) position = {x: 0, y: 0, z: 0}
  if(!rotation) rotation = {x: 0, y: 0, z: 0}

  var packetBuf = new ArrayBuffer(25), packet = new DataView(packetBuf)

  packet.setUint8(0, header); // the most significant bit makes this a player announcement
  packet.setFloat32(1, position.x)
  packet.setFloat32(5, position.y)
  packet.setFloat32(9, position.z)
  packet.setFloat32(13, rotation.x)
  packet.setFloat32(17, rotation.y)
  packet.setFloat32(21, rotation.z)

  return packetBuf
}

function getBroadcastHandler(socket, player) {
  return function(message) {
    console.log('msg exchange')
    // TODO: Server should keep track of user positions, so later joiners get the correct information
    var keys = Object.keys(players)
    for(var i=0; i<keys.length; i++) {
      if(players[keys[i]].socket === socket) continue // don't loop the message back to sender
      players[keys[i]].socket.send(message, {binary: true})
    }
  }
}

function makeInitialAnnouncement(currentPlayerId, players) {
  var keys = Object.keys(players)
  for(var i=0; i<keys.length; i++) {
    if(parseInt(keys[i], 10) === currentPlayerId) continue // don't announce to the fresh player again
    console.log('announcing player ' + currentPlayerId + ' to ' + keys[i] + ' and vice-versa')
    players[keys[i]].socket.send(makePacket(currentPlayerId + 128, players[currentPlayerId].position), {binary: true})
    players[currentPlayerId].socket.send(makePacket(parseInt(keys[i], 10) + 128, players[keys[i]].position), {binary: true})
  }
}

// The protocol we will use
// Uint8       header   - 2 bit, 6 bit player number
// Float32[3]  position - X, Y, Z
// Float32[3]  rotation - rotation around X,Y,Z axis
// 25 byte per packet

wss.on('connection', function connection(clientSock) {
  var thisId = nextId;
  nextId++;

  console.log('Player joined: ' + thisId)

  players[thisId] = { socket: clientSock, position: getRandomPosition() }
  clientSock.send(makePacket(thisId + 128, players[thisId].position), {binary: true, mask: false}); // announcing player ID to the fresh player

  clientSock.on('message', getBroadcastHandler(clientSock, players));

  clientSock.on('close', function() {
    delete players[thisId]
    //TODO: announce disconnect to the others!
  })

  makeInitialAnnouncement(thisId, players)
});

server.on('request', app)
server.listen(process.env.PORT || 3000, function () { console.log('Listening on ' + server.address().port) })
