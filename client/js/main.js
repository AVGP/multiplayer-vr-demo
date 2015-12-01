var Screenfull = require('screenfull'),
    GameWorld = require('./game-world'),
    Network = require('./networking')

// 3D code
GameWorld.init()
.then(function() {
  return Network.setup(GameWorld)
})
.then(function() {
  GameWorld.setMotionListener(Network.sendLocalUpdate)

  // GO!
  var overlay = document.getElementById('startoverlay')
  overlay.textContent = 'Tap to start'
  overlay.addEventListener('touchstart', function() {
    if(Screenfull.enabled) Screenfull.request()
    this.parentNode.removeChild(this)
  })
})

// Event handling

function stopMoving(e) { GameWorld.stopMoving(); e.preventDefault(); e.stopPropagation(); return false }

var canvas = document.querySelector('canvas')
canvas.addEventListener('touchstart', function(e) { GameWorld.startMoving(); e.preventDefault() })
canvas.addEventListener('touchend', stopMoving)
canvas.addEventListener('touchcancel', stopMoving)
canvas.addEventListener('touchleave', stopMoving)
