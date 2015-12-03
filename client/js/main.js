var Screenfull = require('screenfull'),
    GameWorld = require('./game-world'),
    Network = require('./networking')

var queryString = window.location.search.substr(1), params = parseQueryParams(queryString)

GameWorld.init(params)
.then(function() {
  return Network.init(GameWorld)
})
.then(function() {
  GameWorld.setMotionListener(Network.sendLocalUpdate)

  // GO!
  var overlay = document.getElementById('startoverlay')
  overlay.textContent = 'Tap to start'
  overlay.addEventListener('touchstart', function() {
    if(Screenfull.enabled) Screenfull.request()

    screen.lockOrientationUniversal = screen.lockOrientation || screen.mozLockOrientation || screen.msLockOrientation

    if (screen.lockOrientationUniversal) {
      screen.lockOrientationUniversal('landscape')
    } else if(screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').then(function() {
      }, function() { console.log('no lock') })
    }

    this.parentNode.removeChild(this)
    if(params.automove === 'true') GameWorld.startMoving()
  })
})

// Event handling

function stopMoving(e) { GameWorld.stopMoving(); e.preventDefault(); e.stopPropagation(); return false }

if(!params.automove || params.automove !== 'true') {
  var canvas = document.querySelector('canvas')
  canvas.addEventListener('touchstart', function(e) { GameWorld.startMoving(); e.preventDefault() })
  canvas.addEventListener('touchend', stopMoving)
  canvas.addEventListener('touchcancel', stopMoving)
  canvas.addEventListener('touchleave', stopMoving)
}

// Utility

function parseQueryParams(queryString) {
  var parts = queryString.split('&'), params = {}
  for(var i=0; i<parts.length; i++) {
    var kvPair = parts[i].split('=')
    params[kvPair[0]] = decodeURIComponent(kvPair[1])
  }
  return params
}
