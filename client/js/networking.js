var WebSocket = require('ws'),
    Promise = require('bluebird')

// internals
var localPlayerId = null, socket = null,
    packetBuf = new ArrayBuffer(25), packet = new DataView(packetBuf)

function handleControlMessage(msgInfo, view, gameWorld) {
  if(localPlayerId === null) { // aha, it's our ID :)
    localPlayerId = msgInfo - 128
    console.log('WE ARE ' + localPlayerId)
    gameWorld.setLocalId(localPlayerId)
    gameWorld.updatePlayer(localPlayerId, view.getFloat32(1), view.getFloat32(5), view.getFloat32(9), 0, 0, 0)
  } else {
    console.log('NEW PLAYER: ', msgInfo - 128)
    gameWorld.addPlayer(msgInfo - 128, view.getFloat32(1), view.getFloat32(5), view.getFloat32(9), 0, 0, 0)
  }

}

function handlePlayerUpdate(playerId, view, gameWorld) {
  gameWorld.updatePlayer(playerId,
    view.getFloat32(1), view.getFloat32(5), view.getFloat32(9),
    view.getFloat32(13), view.getFloat32(17), view.getFloat32(21)
  )
}

// API
module.exports.init = function(gameWorld) {
  return new Promise(function(resolve, reject) {
    var url = new URL(window.location.href)

    socket = new WebSocket("ws://" + url.host)
    socket.binaryType = 'arraybuffer'
    socket.onmessage = function(event) {
      var view = new DataView(event.data)
      var header = view.getUint8(0)

      if(header & 128) {
        handleControlMessage(header, view, gameWorld) // control msg: Announce connect / disconnect
        return
      }

      // Player updates
      handlePlayerUpdate(header, view, gameWorld)
    }

    socket.onopen = resolve
  })
}

module.exports.sendLocalUpdate = function(px, py, pz, rx, ry, rz) {
  packet.setUint8(0, localPlayerId)
  packet.setFloat32( 1, px)
  packet.setFloat32( 5, py)
  packet.setFloat32( 9, pz)
  packet.setFloat32(13, rx)
  packet.setFloat32(17, ry)
  packet.setFloat32(21, rz)
  socket.send(packet)
}
