var THREE = require('three'),
    World = require('three-world'),
    OBJLoader = require('./objloader'),
    OBJMTLLoader = require('./objmtlloader'),
    VRControls = require('./vr-controls'),
    VREffect = require('./vr-effect')

var PLAYER_ID = null, players = {}, reindeer = null

var packetBuf = new ArrayBuffer(25), packet = new DataView(packetBuf), socketReady = false

var oldPosHash = 0, oldRotHash = 0

function render() {

  controls.update()
  vrRenderer.render(scene, me)

  if(Math.abs((me.position.x + me.position.y + me.position.z).toFixed(2) - oldPosHash) > 0.2 ||
     Math.abs((me.rotation.x + me.rotation.y + me.rotation.z).toFixed(4) - oldRotHash) > 0.02) {

    packet.setFloat32( 1, me.position.x)
    packet.setFloat32( 5, me.position.y)
    packet.setFloat32( 9, me.position.z)
    packet.setFloat32(13, me.rotation.x)
    packet.setFloat32(17, me.rotation.y)
    packet.setFloat32(21, me.rotation.z)
    if(socketReady) socket.send(packet)

    // Poor man's hashing :D
    oldPosHash = (me.position.x + me.position.y + me.position.z).toFixed(2)
    oldRotHash = (me.rotation.x + me.rotation.y + me.rotation.z).toFixed(4)
  }

  return false
}

// Starting the world
World.init({camDistance: 0, farPlane: 3500, renderCallback: render})

var loader = new OBJMTLLoader()
loader.load('models/islands.obj', 'models/islands.mtl', function(mesh) {

  mesh.scale.set(0.2, 0.2, 0.2)
  var positions = [
    [-300, -50, -150],
    [   0, -50,  500],
    [ 300, -50, -450],
    [-800, -50,  650],
    [ 800, -50,    0],
  ]
  for(var i=0; i<5; i++) {
    var islandGroup = mesh.clone()
    islandGroup.position.set(positions[i][0],positions[i][1],positions[i][2])
    World.add(islandGroup)
  }
})

loader.load('models/boo2/boo.obj', 'models/boo2/boo.mtl', function(mesh) {
  reindeer = mesh
  window.mesh = mesh
  World.add(mesh)
//  reindeer.scale.set(0.05, 0.05, 0.05)
})

hrmpf = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial())
hrmpf.position.set(0, 50, 0)
World.add(hrmpf)

var ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000), new THREE.MeshBasicMaterial({color: 0x3e56d1}))
ground.rotation.x = -Math.PI/2
ground.position.set(0, -50, 0)
World.add(ground)

var skymaterials = [
  new THREE.MeshBasicMaterial({ map: THREE.ImageUtils.loadTexture('sky/plain_sky_left.jpg'), side: THREE.BackSide }),
  new THREE.MeshBasicMaterial({ map: THREE.ImageUtils.loadTexture('sky/plain_sky_right.jpg'), side: THREE.BackSide }),
  new THREE.MeshBasicMaterial({ map: THREE.ImageUtils.loadTexture('sky/plain_sky_top.jpg'), side: THREE.BackSide }),
  new THREE.MeshBasicMaterial({ color: 0x3e56d1, side: THREE.BackSide }),
  new THREE.MeshBasicMaterial({ map: THREE.ImageUtils.loadTexture('sky/plain_sky_back.jpg'), side: THREE.BackSide }),
  new THREE.MeshBasicMaterial({ map: THREE.ImageUtils.loadTexture('sky/plain_sky_front.jpg'), side: THREE.BackSide }),
];

var sky = new THREE.Mesh(new THREE.BoxGeometry(2000, 2000, 2000), new THREE.MeshFaceMaterial(skymaterials))
World.add(sky)

var me = World.getCamera(), scene = World.getScene()

// VR
var controls = new VRControls(me),
    vrRenderer = new VREffect(World.getRenderer())

World.add(new THREE.AmbientLight())
/*
window.addEventListener('keydown', function(e) {
  e.preventDefault()
  switch(e.keyCode) {
    case 37:
      me.rotation.y += Math.PI / 100
    break
    case 38:
      me.translateZ(-5)
    break
    case 39:
      me.rotation.y -= Math.PI / 100
    break
    case 40:
      me.translateZ(5)
    break
  }

  if(me.position.x < -900) me.position.x = -900
  else if(me.position.x > 900) me.position.x = 900

  if(me.position.y < -900) me.position.y = -900
  else if(me.position.y > 900) me.position.y = 900

  if(me.position.z < -900) me.position.z = -900
  else if(me.position.z > 900) me.position.z = 900
})
*/
World.start()
console.log("Ready")

// Get the web socket rollin'

var url = new URL(window.location.href)
var socket = new WebSocket("ws://" + url.host)
socket.binaryType = 'arraybuffer'
socket.onmessage = function(event) {
  var view = new DataView(event.data)
  var header = view.getUint8(0)
  if(header & 128) { // we've got a player announcement
    if(PLAYER_ID === null) { // aha, it's our ID :)
      PLAYER_ID = header - 128
      packet.setUint8(0, PLAYER_ID)
      console.log('WE ARE ' + PLAYER_ID)
      me.position.set(view.getFloat32(1), view.getFloat32(5), view.getFloat32(9))
      setTimeout(function() {
        var test = reindeer.clone()
        test.position.copy(me.position)
        test.translateZ(-10)
        World.add(test)
        window.wtf = test
      }, 5000)
      players[PLAYER_ID] = me
      socketReady = true
    } else {
      console.log('NEW PLAYER: ', header - 128)
      var newKid = reindeer.clone()
      newKid.position.set(view.getFloat32(1), view.getFloat32(5), view.getFloat32(9))

      players[header - 128] = newKid
      World.add(players[header - 128])
    }
  } else { // position/rotation update
    players[header].position.set(view.getFloat32(1), view.getFloat32(5), view.getFloat32(9))
    players[header].rotation.set(view.getFloat32(13), view.getFloat32(17), view.getFloat32(21))
  }
}
