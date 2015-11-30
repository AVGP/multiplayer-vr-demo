var THREE = require('three'),
    World = require('three-world'),
    OBJLoader = require('./objloader'),
    OBJMTLLoader = require('./objmtlloader'),
    VRControls = require('./vr-controls'),
    VREffect = require('./vr-effect'),
    Screenfull = require('screenfull')

// Game state

var PLAYER_ID = null, players = {}, going = false, powerup, playerModel

var packetBuf = new ArrayBuffer(25), packet = new DataView(packetBuf), socketReady = false
var oldPosHash = 0, oldRotHash = 0

// 3D code

function render() {

  if(going) {
    me.translateZ(-0.5)

    if(me.position.x < -900) me.position.x = -900
    else if(me.position.x > 900) me.position.x = 900

    if(me.position.y < -50) me.position.y = -50
    else if(me.position.y > 900) me.position.y = 900

    if(me.position.z < -900) me.position.z = -900
    else if(me.position.z > 900) me.position.z = 900
  }

  controls.update()
  powerup.rotation.y += Math.PI / 200
  vrRenderer.render(scene, me)

  if(Math.abs((me.position.x + me.position.y + me.position.z).toFixed(2) - oldPosHash) > 0.2 ||
     Math.abs((me.rotation.x + me.rotation.y + me.rotation.z).toFixed(4) - oldRotHash) > 0.002) {

    // the original model needs to be turned by 90°, depending on the sensor data clockwise or counter-clockwise
    var correctedRotY = me.rotation.y
    if(me.rotation.y >= 0) correctedRotY -= Math.PI / 2
    else correctedRotY += Math.PI / 2

    packet.setFloat32( 1, me.position.x)
    packet.setFloat32( 5, me.position.y)
    packet.setFloat32( 9, me.position.z)
    packet.setFloat32(13, me.rotation.x)
    packet.setFloat32(17, correctedRotY)
    packet.setFloat32(21, me.rotation.z)

    if(socketReady) socket.send(packet)

    // Poor man's hashing :D
    oldPosHash = (me.position.x + me.position.y + me.position.z).toFixed(2)
    oldRotHash = (me.rotation.x + me.rotation.y + me.rotation.z).toFixed(4)
  }

  return false // don't render with the regular renderer
}

// Starting the world
World.init({camDistance: 0, farPlane: 3500, renderCallback: render})

var box = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshPhongMaterial({
  map: THREE.ImageUtils.loadTexture('js.png')
}))
var powerup = new THREE.Mesh(new THREE.SphereGeometry(4.5, 16, 16), new THREE.MeshBasicMaterial({transparent: true, opacity: 0.25, color: 0xff00ff}))
powerup.add(box)
World.add(powerup)

var loader = new OBJMTLLoader()

var ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000), new THREE.MeshBasicMaterial({color: 0x3ed156}))
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

loader.load('models/horse/horsebrownhair.obj', 'models/horse/horsebrownhair.mtl', function(mesh) {
  playerModel = mesh
  var overlay = document.getElementById('startoverlay')
  overlay.textContent = 'Tap to start'
  overlay.addEventListener('touchstart', function() {
    if(Screenfull.enabled) Screenfull.request()
    this.parentNode.removeChild(this)
  })
})

// VR
var controls = new VRControls(me),
    vrRenderer = new VREffect(World.getRenderer())

World.add(new THREE.AmbientLight())

World.start()
console.log("Ready")

// Event handling

function stopMoving(e) { going = false; e.preventDefault(); e.stopPropagation(); going = false; return false }

var canvas = document.querySelector('canvas')
canvas.addEventListener('touchstart', function(e) { going = true; e.preventDefault() })
canvas.addEventListener('touchend', stopMoving)
canvas.addEventListener('touchcancel', stopMoving)
canvas.addEventListener('touchleave', stopMoving)

// NETWORKING

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
      //console.log('WE ARE ' + PLAYER_ID)
      me.position.set(view.getFloat32(1), view.getFloat32(5), view.getFloat32(9))
      players[PLAYER_ID] = me
      socketReady = true
    } else {
      //console.log('NEW PLAYER: ', header - 128)
      var newKid = playerModel.clone()
      newKid.position.set(view.getFloat32(1), view.getFloat32(5), view.getFloat32(9))

      players[header - 128] = newKid
      World.add(players[header - 128])
    }
  } else { // position/rotation update
    players[header].position.set(view.getFloat32(1), view.getFloat32(5), view.getFloat32(9))
    players[header].rotation.set(view.getFloat32(13), view.getFloat32(17), view.getFloat32(21))
  }
}
