var THREE = require('three'),
    World = require('three-world'),
    OBJLoader = require('./objloader'),
    OBJMTLLoader = require('./objmtlloader'),
    VRControls = require('./vr-controls'),
    VREffect = require('./vr-effect'),
    Promise = require('bluebird')

// internals

var MOVE_SPEED = -0.5

var onMotion = null // handler for updates on local player motion
var players = {}, localId = 0, going = false, oldPosHash = 0, oldRotHash = 0
// game objects
var controls, vrRenderer, powerup, me, scene, playerModel

function render() {

  if(going) {
    me.translateZ(MOVE_SPEED)

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
     Math.abs((me.rotation.x + me.rotation.y + me.rotation.z).toFixed(4) - oldRotHash) > 0.02) {

    // the original model needs to be turned by 90°, depending on the sensor data clockwise or counter-clockwise
    // TODO: Compass correction isn't correct yet
    var correctedRotY = me.rotation.y
    if(me.rotation.y >= 0) correctedRotY -= Math.PI / 2
    else correctedRotY += Math.PI / 2

    if(onMotion) onMotion(me.position.x, me.position.y, me.position.z, me.rotation.x, correctedRotY, me.rotation.z)

    // Poor man's hashing :D
    oldPosHash = (me.position.x + me.position.y + me.position.z).toFixed(2)
    oldRotHash = (me.rotation.x + me.rotation.y + me.rotation.z).toFixed(4)
  }

  return false // don't render with the regular renderer
}

// exposed API

module.exports.reset = function() {
  var keys = Object.keys(players)
  for(var i=0; i<keys.length; i++) {
    World.remove(players[keys[i]])
  }
  players = {}
}

module.exports.setLocalId = function(id) { localId = id }
module.exports.setMotionListener = function(handler) { onMotion = handler }

module.exports.addPlayer = function(id, x, y, z) {
  players[id] = playerModel.clone()
  players[id].position.set(x, y, z)
  World.add(players[id])
}

module.exports.removePlayer = function(id) {
  World.remove(players[id])
  delete players[id]
}

module.exports.updatePlayer = function(id, px, py, pz, rx, ry, rz) {
  if(localId === id) {
    me.position.set(px, py, pz)
    me.rotation.set(rx, ry, rz)
    return
  }

  console.log('updating ', id)
  if(!players[id]) {
    console.error('Player does not exist!')
    console.log(players)
  }

  players[id].position.set(px, py, pz)
  players[id].rotation.set(rx, ry, rz)
}

module.exports.startMoving = function() { going = true }
module.exports.stopMoving = function() { going = false }

module.exports.init = function(params) {
  if(params.automove === 'true') {
    MOVE_SPEED = -0.2 // slow 'em down
  }

  return new Promise(function(resolve, reject) {

    World.init({camDistance: 0, farPlane: 3500, renderCallback: render})
    World.add(new THREE.AmbientLight())

    // Powerup
    var box = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshPhongMaterial({
      map: THREE.ImageUtils.loadTexture('js.png')
    }))

    powerup = new THREE.Mesh(new THREE.SphereGeometry(4.5, 16, 16), new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.25,
      color: 0xff00ff
    }))
    powerup.add(box)
    World.add(powerup)

    // Ground plane
    var ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(2000, 2000), new THREE.MeshBasicMaterial({color: 0x3ed156}))
    ground.rotation.x = -Math.PI/2
    ground.position.set(0, -50, 0)
    World.add(ground)

    // Skybox
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

    // Reference to camera (player) & scene
    me = World.getCamera()
    scene = World.getScene()

    // Horse for players
    var loader = new OBJMTLLoader()
    loader.load('models/horse/horsebrownhair.obj', 'models/horse/horsebrownhair.mtl', function(mesh) {
      playerModel = mesh
      resolve()
    })

    // VR
    controls = new VRControls(me)
    vrRenderer = new VREffect(World.getRenderer())

    World.start()
  })
}
