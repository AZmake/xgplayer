/**
 * @author fuyuhao
 */
import Player from '../player'
import bezier from '../utils/bezier'

/**
 * touchEnd animation
 */
const endEasing = bezier(0.72, 0.03, 0.94, 0.02)
const ev = {
  start: ['touchstart', 'mousedown'],
  move: ['touchmove', 'mousemove'],
  end: ['touchend', 'mouseup']
}
const temp = {
  isActive: false,
  startTime: 0,
  startPosX: 0,
  startPosY: 0,
  startVerAngle: 0,
  startHorAngle: 0,
  lastPosX: 0,
  lastMoveTime: 0,
  lastPosY: 0,
  lastVerAngle: 0,
  lastHorAngle: 0,
  speedVer: 0,
  speedHor: 0
}

const plugin = function () {
  const player = this
  const { panoramic, config } = player

  let sensitivity = config.sensitivity || 1
  const getDeltaDeg = (percent) => {
    return percent * sensitivity * 1.5 * 90
  }

  const handleMouseMove = (e) => {
    const domRect = panoramic.dom.getBoundingClientRect()
    let currentX
    let currentY

    if (e.target === panoramic.dom) {
      currentX = e.offsetX
      currentY = e.offsetY
    } else {
      currentX = e.clientX - domRect.left
      currentY = e.clientY - domRect.top
    }
    return {
      x: currentX,
      y: currentY
    }
  }
  const handleSingleTouchMove = (e) => {
    const domRect = panoramic.dom.getBoundingClientRect()
    const { clientX, clientY } = e.touches[0]
    return {
      x: clientX - domRect.left,
      y: clientY - domRect.top
    }
  }
  const handleMove = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (!temp.isActive) return
    const domRect = panoramic.dom.getBoundingClientRect()
    let currentPos = {
      x: null,
      y: null
    }
    if (e instanceof window.TouchEvent && e.touches) {
      if (e.touches.length === 1) {
        currentPos = handleSingleTouchMove(e)
      }
    } else {
      currentPos = handleMouseMove(e)
    }

    const deltaX = currentPos.x - temp.lastPosX
    const deltaY = currentPos.y - temp.lastPosY
    const deltaDegX = getDeltaDeg(deltaX / domRect.width)
    const deltaDegY = getDeltaDeg(deltaY / domRect.height)
    panoramic.cameraMove({
      verAngle: deltaDegY,
      horAngle: -1 * deltaDegX
    })
    temp.speedHor = (panoramic.angle.hor - temp.lastHorAngle) / (Date.now() - temp.lastMoveTime)
    temp.speedVer = (panoramic.angle.ver - temp.lastVerAngle) / (Date.now() - temp.lastMoveTime)
    temp.lastPosX = currentPos.x
    temp.lastPosY = currentPos.y
    temp.lastHorAngle = panoramic.angle.hor
    temp.lastVerAngle = panoramic.angle.ver
    temp.lastMoveTime = Date.now()
  }

  const mouseStart = (e) => {
    if (e.target === panoramic.dom) {
      temp.lastPosX = temp.startPosX = e.offsetX
      temp.lastPosY = temp.startPosY = e.offsetY
    } else {
      const domRect = panoramic.dom.getBoundingClientRect()
      temp.lastPosX = temp.startPosX = e.clientX - domRect.left
      temp.lastPosY = temp.startPosY = e.clientY - domRect.top
    }
  }

  const singleTouchStart = (e) => {
    const domRect = panoramic.dom.getBoundingClientRect()
    const { clientX, clientY } = e.touches[0]
    temp.lastPosX = temp.startPosX = clientX - domRect.left
    temp.lastPosY = temp.startPosY = clientY - domRect.top
  }

  const handleStart = (e) => {
    e.stopPropagation()
    // e.preventDefault()
    panoramic.dom.classList.add('grabbing')
    temp.isActive = true
    temp.startTime = Date.now()
    temp.startVerAngle = panoramic.angle.ver
    temp.startHorAngle = panoramic.angle.hor
    if (e instanceof window.TouchEvent && e.touches) {
      if (e.touches.length === 1) {
        singleTouchStart(e)
      }
    } else {
      mouseStart(e)
    }

    ev.end.forEach(item => {
      document.addEventListener(item, handleEnd)
    })
  }

  const doEndAnimate = () => {
    const sver = temp.speedVer
    const shor = temp.speedHor
    const duration = Math.max(Math.max(Math.abs(sver), Math.abs(shor)) * 1000, 2000)

    const start = Date.now()
    let last = Date.now()
    let raf = null
    const animate = () => {
      const t = Date.now()
      const dt = t - start
      const speedPercent = endEasing(1 - (dt / duration)) * 0.8
      const moveVer = (t - last) * speedPercent * sver
      const moveHor = (t - last) * speedPercent * shor
      panoramic.cameraMove({
        verAngle: moveVer,
        horAngle: moveHor
      })
      last = t
      if (dt < duration || speedPercent > 0) {
        raf = window.requestAnimationFrame(animate)
      } else {
        window.cancelAnimationFrame(raf)
      }
    }
    animate()
  }
  const handleEnd = (e) => {
    e.stopPropagation()
    e.preventDefault()
    temp.isActive = false
    panoramic.dom.classList.remove('grabbing')
    doEndAnimate()
    ev.end.forEach(item => {
      document.removeEventListener(item, handleEnd)
    })
  }

  ev.start.forEach(item => {
    panoramic.addEventListener(item, handleStart)
  })
  ev.move.forEach(item => {
    panoramic.addEventListener(item, handleMove)
  })
  ev.end.forEach(item => {
    panoramic.addEventListener(item, handleEnd)
  })
}
Player.install('panoramic_drag', plugin)
