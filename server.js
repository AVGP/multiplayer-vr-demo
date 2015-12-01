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

// The protocol we will use
// Uint8       header   - 1 bit, 7 bit player number
// Float32[3]  position - X, Y, Z
// Float32[3]  rotation - rotation around X,Y,Z axis
// 25 byte per packet
wss.on('connection', function connection(ws) {
  var thisId = nextId;
  nextId++;

  console.log('Player joined: ' + thisId)

  var player = {
    socket: ws,
    x: -200 + Math.random() * 400,
    y: 0,
    z: -200 + Math.random() * 400
  }
  players[thisId] = player

  var packetBuf = new ArrayBuffer(25), packet = new DataView(packetBuf)
  packet.setUint8(0, thisId + 128); // the most significant bit makes this a player announcement
  packet.setFloat32(1, player.x)
  packet.setFloat32(5, player.y)
  packet.setFloat32(9, player.z)
  ws.send(packetBuf, {binary: true, mask: false}); // announcing player ID to the fresh player

  ws.on('message', function incoming(message) {
    console.log('msg exchange')
    // TODO: Server should keep track of user positions, so later joiners get the correct information
    var keys = Object.keys(players)
    for(var i=0; i<keys.length; i++) {
      if(players[keys[i]].socket === ws) continue

      players[keys[i]].socket.send(message, {binary: true})
    }
  });

  ws.on('close', function() {
    players[thisId] = undefined
    //TODO: announce disconnect to the others!
  })


  var keys = Object.keys(players)
  for(var i=0; i<keys.length; i++) {
    if(parseInt(keys[i], 10) === thisId) continue
    console.log('announcing player ' + thisId + ' to ' + keys[i])
    players[keys[i]].socket.send(packetBuf, {binary: true})
    packet.setUint8(0, parseInt(keys[i], 10) + 128)
    packet.setFloat32(1, players[keys[i]].x)
    packet.setFloat32(5, players[keys[i]].y)
    packet.setFloat32(9, players[keys[i]].z)
    ws.send(packetBuf, {binary: true})
  }
});

server.on('request', app)
server.listen(process.env.PORT || 3000, function () { console.log('Listening on ' + server.address().port) })
