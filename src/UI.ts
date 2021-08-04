import { version } from '../package.json'
import UIIcons from './sprites/svg/sprite.symbol.svg'
import noop from './noop'
import SVGHelper from './SVGHelper'

interface IStroeerVideoplayer {
  getUIEl: Function
  getRootEl: Function
  getVideoEl: Function
}

declare global {
  interface Document {
    mozCancelFullScreen?: () => Promise<void>
    msExitFullscreen?: () => void
    webkitExitFullscreen?: () => void
    mozFullScreenElement?: Element
    msFullscreenElement?: Element
    webkitFullscreenElement?: Element
  }

  interface HTMLElement {
    msRequestFullscreen?: () => Promise<void>
    mozRequestFullscreen?: () => Promise<void>
    webkitRequestFullscreen?: () => Promise<void>
  }
}

const isTouchDevice = (): boolean => {
  return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0))
}

const hideElement = (element: HTMLElement): void => {
  element.classList.add('hidden')
  element.setAttribute('aria-hidden', 'true')
}

const showElement = (element: HTMLElement): void => {
  element.classList.remove('hidden')
  element.removeAttribute('aria-hidden')
}

class UI {
  version: string
  uiName: string
  uiContainerClassName: string
  onDocumentFullscreenChange: Function
  onVideoElPlay: Function
  onVideoElPause: Function
  onLoadedMetaData: Function
  onVideoElTimeupdate: Function
  onVideoElVolumeChange: Function
  isMouseDown: Boolean

  constructor () {
    this.version = version
    this.uiName = 'default'
    this.uiContainerClassName = 'default'
    this.onDocumentFullscreenChange = noop
    this.onVideoElPlay = noop
    this.onVideoElPause = noop
    this.onVideoElTimeupdate = noop
    this.onVideoElVolumeChange = noop
    this.onLoadedMetaData = noop
    this.isMouseDown = false

    return this
  }

  // createButton Function:
  // creates a HTMLElement with given options, adds it to the buttonsContainer and returns it
  //   tag - the html tag to choose, mostly 'button'
  //   cls - the css class the tag gets
  //   aria - the aria label
  //   svgid - the id of the icon in the icon-svg
  //   ishidden - true to render hidden initially
  //   clickcb - a callback function called on 'click'

  createButton = (StroeerVideoplayer: IStroeerVideoplayer, tag: string, cls: string, aria: string, svgid: string, ishidden: boolean,
    evts: Array<{ name: string, callb: Function }>): HTMLElement => {
    const buttonsContainer = StroeerVideoplayer.getUIEl().querySelector('.buttons')
    const el = document.createElement(tag)
    el.classList.add(cls)
    el.setAttribute('aria-label', aria)
    el.appendChild(SVGHelper(svgid))

    if (ishidden) hideElement(el)
    for (let i = 0; i < evts.length; i++) {
      el.addEventListener(evts[i].name, (ev) => {
        evts[i].callb(ev)
      })
    }
    buttonsContainer.appendChild(el)
    return el
  }

  setTimeDisp = (timeDisp: HTMLElement, el: number, tot: number): void => {
    const elmino = timeDisp.querySelector('.elapsed .min')
    if (elmino !== null) elmino.innerHTML = Math.floor(el / 60).toString()
    const elseco = timeDisp.querySelector('.elapsed .sec')
    if (elseco !== null) elseco.innerHTML = ('00' + (Math.floor(el) % 60).toString()).slice(-2)
    const totmino = timeDisp.querySelector('.total .min')
    if (totmino !== null) totmino.innerHTML = Math.floor(tot / 60).toString()
    const totseco = timeDisp.querySelector('.total .sec')
    if (totseco !== null) totseco.innerHTML = ('00' + (Math.floor(tot) % 60).toString()).slice(-2)
  }

  init = (StroeerVideoplayer: IStroeerVideoplayer): void => {
    const rootEl = StroeerVideoplayer.getRootEl()
    const videoEl = StroeerVideoplayer.getVideoEl()
    videoEl.removeAttribute('controls')
    const uiEl = StroeerVideoplayer.getUIEl()
    if (uiEl.children.length !== 0) {
      return
    }

    if (document.getElementById('stroeer-videoplayer-default-ui-icons') === null) {
      const uiIconsContainer = document.createElement('div')
      uiIconsContainer.id = 'stroeer-videoplayer-default-ui-icons'
      uiIconsContainer.innerHTML = UIIcons
      document.body.appendChild(uiIconsContainer)
    }

    const uiContainer = document.createElement('div')
    const timelineContainer = document.createElement('div')
    const timelineElapsed = document.createElement('div')
    const timelineElapsedBubble = document.createElement('div')
    const controlBar = document.createElement('div')
    const buttonsContainer = document.createElement('div')
    const overlayContainer = document.createElement('div')
    overlayContainer.className = 'video-overlay'
    overlayContainer.appendChild(SVGHelper('Icon-Play'))
    uiContainer.className = this.uiContainerClassName
    controlBar.className = 'controlbar'
    timelineContainer.className = 'timeline'
    timelineElapsed.className = 'elapsed'
    timelineElapsedBubble.className = 'elapsed-bubble'
    buttonsContainer.className = 'buttons'
    controlBar.appendChild(buttonsContainer)
    uiContainer.appendChild(controlBar)
    uiContainer.appendChild(overlayContainer)
    uiEl.appendChild(uiContainer)

    // Create the Buttons
    const playButton = this.createButton(StroeerVideoplayer, 'button', 'play', 'Play', 'Icon-Play', false,
      [{ name: 'click', callb: () => { videoEl.play() } }])

    const replayButton = this.createButton(StroeerVideoplayer, 'button', 'replay', 'Replay', 'Icon-Replay', true,
      [{ name: 'click', callb: () => { videoEl.play() } }])

    const pauseButton = this.createButton(StroeerVideoplayer, 'button', 'pause', 'Pause', 'Icon-Pause', videoEl.paused,
      [{ name: 'click', callb: () => { videoEl.pause() } }])

    const muteButton = this.createButton(StroeerVideoplayer, 'button', 'mute', 'Mute', 'Icon-Volume', videoEl.muted,
      [{ name: 'click', callb: () => { videoEl.muted = true } }])

    const unmuteButton = this.createButton(StroeerVideoplayer, 'button', 'unmute', 'Unmute', 'Icon-Mute', true,
      [{ name: 'click', callb: () => { videoEl.muted = false } }])

    // Time Display
    const timeDisp = document.createElement('div')
    timeDisp.classList.add('time')
    timeDisp.innerHTML = '<div class="elapsed"><span class="min">00</span>:<span class="sec">00</span> /</div><div class="total"><span class="min">00</span>:<span class="sec">00</span></div>'
    controlBar.appendChild(timeDisp)

    // @ts-expect-error
    StroeerVideoplayer.enterFullscreen = (): void => {
      if (typeof rootEl.requestFullscreen === 'function') {
        rootEl.requestFullscreen()
      } else if (typeof rootEl.webkitRequestFullscreen === 'function') {
        if (navigator.userAgent.includes('iPad')) {
          videoEl.webkitRequestFullscreen()
        } else {
          rootEl.webkitRequestFullscreen()
        }
      } else if (typeof rootEl.mozRequestFullScreen === 'function') {
        rootEl.mozRequestFullScreen()
      } else if (typeof rootEl.msRequestFullscreen === 'function') {
        rootEl.msRequestFullscreen()
      } else if (typeof rootEl.webkitEnterFullscreen === 'function') {
        rootEl.webkitEnterFullscreen()
      } else if (typeof videoEl.webkitEnterFullscreen === 'function') {
        videoEl.webkitEnterFullscreen()
      } else {
        console.log('Error trying to enter Fullscreen mode: No Request Fullscreen Function found')
      }
    }

    // Fullscreen Button
    const enterFullscreenButton = this.createButton(StroeerVideoplayer, 'button', 'enterFullscreen',
      'Enter Fullscreen', 'Icon-Fullscreen', false,
      [{
        name: 'click',
        callb: () => {
          // @ts-expect-error
          StroeerVideoplayer.enterFullscreen()
        }
      }])

    // @ts-expect-error
    StroeerVideoplayer.exitFullscreen = (): void => {
      if (typeof document.exitFullscreen === 'function') {
        document.exitFullscreen().then(noop).catch(noop)
      } else if (typeof document.webkitExitFullscreen === 'function') {
        document.webkitExitFullscreen()
      } else if (typeof document.mozCancelFullScreen === 'function') {
        document.mozCancelFullScreen().then(noop).catch(noop)
      } else if (typeof document.msExitFullscreen === 'function') {
        document.msExitFullscreen()
      } else if (typeof videoEl.webkitExitFullscreen === 'function') {
        videoEl.webkitExitFullscreen()
      } else {
        console.log('Error trying to enter Fullscreen mode: No Request Fullscreen Function found')
      }
    }

    const exitFullscreenButton = this.createButton(StroeerVideoplayer, 'button', 'exitFullscreen', 'Exit Fullscreen', 'Icon-FullscreenOff', true,
      [{
        name: 'click',
        callb: () => {
          // @ts-expect-error
          StroeerVideoplayer.exitFullscreen()
        }
      }])

    // Make timeline seekable
    // timelineContainer.addEventListener('click', (evt) => {
    //   const clickX = evt.offsetX
    //   const percentClick = 100 / timelineContainer.offsetWidth * clickX
    //   const absoluteDuration = percentClick / 100 * videoEl.duration
    //   videoEl.currentTime = absoluteDuration
    // })

    // Trigger play and pause on UI-Container click
    uiContainer.addEventListener('click', (evt) => {
      const target = evt.target as HTMLDivElement
      if (target.className !== this.uiContainerClassName) {
        return
      }

      if (videoEl.paused === true) {
        videoEl.play()
      } else {
        if (isTouchDevice()) {
          return
        }
        videoEl.pause()
      }
    })

    overlayContainer.addEventListener('click', (evt) => {
      if (videoEl.paused === true) {
        videoEl.play()
      } else {
        videoEl.pause()
      }
    })

    timelineContainer.appendChild(timelineElapsed)
    timelineContainer.appendChild(timelineElapsedBubble)
    controlBar.appendChild(timelineContainer)
    controlBar.appendChild(buttonsContainer)

    const controlBarContainer = document.createElement('div')
    controlBarContainer.classList.add('controlbar-container')

    controlBarContainer.appendChild(controlBar)
    uiContainer.appendChild(controlBarContainer)
    uiEl.appendChild(uiContainer)

    const toggleControlbarInSeconds = 5
    let toggleControlbarSecondsLeft = toggleControlbarInSeconds
    const toggleControlbarTicker = (): void => {
      if (videoEl.paused === true) {
        controlBarContainer.style.opacity = '1'
        toggleControlbarSecondsLeft = toggleControlbarInSeconds
        return
      }
      if (toggleControlbarSecondsLeft === 0) {
        controlBarContainer.style.opacity = '0'
      } else {
        toggleControlbarSecondsLeft = toggleControlbarSecondsLeft - 1
      }
    }

    rootEl.addEventListener('mousemove', () => {
      toggleControlbarSecondsLeft = toggleControlbarInSeconds
      controlBarContainer.style.opacity = '1'
    })

    setInterval(toggleControlbarTicker, 1000)

    this.onVideoElPlay = () => {
      hideElement(playButton)
      hideElement(replayButton)
      showElement(pauseButton)
      hideElement(overlayContainer)
    }
    videoEl.addEventListener('play', this.onVideoElPlay)

    this.onVideoElPause = () => {
      if (videoEl.duration === videoEl.currentTime) {
        showElement(replayButton)
      } else {
        showElement(playButton)
      }
      showElement(overlayContainer)
      hideElement(pauseButton)
    }
    videoEl.addEventListener('pause', this.onVideoElPause)

    videoEl.addEventListener('loadedmetadata', () => {
      this.setTimeDisp(timeDisp, videoEl.currentTime, videoEl.duration)
    })

    videoEl.load()

    this.onVideoElTimeupdate = () => {
      const percentage = videoEl.currentTime / videoEl.duration * 100
      const percentageString = String(percentage)
      this.setTimeDisp(timeDisp, videoEl.currentTime, videoEl.duration)

      timelineElapsed.style.width = percentageString + '%'
      timelineElapsedBubble.style.left = percentageString + '%'
    }
    videoEl.addEventListener('timeupdate', this.onVideoElTimeupdate)

    const calulateDurationPercentageBasedOnXCoords = (x: number): number => {
      const percentage = (100 / timelineContainer.offsetWidth) * x
      return percentage
    }

    const updateTimelineWhileDragging = (evt: any): void => {
      let pageX = evt.pageX
      if (pageX === undefined) {
        if ('touches' in evt && evt.touches.length > 0) {
          pageX = evt.touches[0].clientX
        } else {
          pageX = false
        }
      }
      if (pageX === false) return
      const durationContainerBoundingClientRect = timelineContainer.getBoundingClientRect()
      let durationContainerOffsetX = 0
      if ('x' in durationContainerBoundingClientRect) {
        durationContainerOffsetX = durationContainerBoundingClientRect.x
      } else {
        // @ts-expect-error
        durationContainerOffsetX = durationContainerBoundingClientRect.left
      }
      let x = pageX - durationContainerOffsetX
      if (x < 0) x = 0
      if (x > durationContainerBoundingClientRect.width) { x = durationContainerBoundingClientRect.width }

      const percentageX = calulateDurationPercentageBasedOnXCoords(x)
      const percentageXString = String(percentageX)
      timelineElapsedBubble.style.left = percentageXString + '%'
      timelineElapsed.style.width = percentageXString + '%'
      const ve = videoEl
      const vd = ve.duration
      const percentageTime = (vd / 100) * percentageX
      timelineElapsed.setAttribute('data-percentage', percentageXString)
      timelineElapsed.setAttribute('data-timeinseconds', String(percentageTime))
    }

    let draggingWhat = ''

    const dragStart = (evt: any): void => {
      switch (evt.target) {
        case timelineContainer:
        case timelineElapsed:
        case timelineElapsedBubble:
          videoEl.pause()
          draggingWhat = 'timeline'
          break
        default:
          break
      }
    }

    const dragEnd = (evt: any): void => {
      if (draggingWhat === 'timeline') {
        draggingWhat = ''
        updateTimelineWhileDragging(evt)
        videoEl.currentTime = timelineElapsed.getAttribute('data-timeinseconds')
        videoEl.play()
      }
    }

    const drag = (evt: any): void => {
      if (draggingWhat === 'timeline') {
        updateTimelineWhileDragging(evt)
      }
    }

    document.body.addEventListener('touchstart', dragStart, {
      passive: true
    })
    document.body.addEventListener('touchend', dragEnd, {
      passive: true
    })
    document.body.addEventListener('touchmove', drag, {
      passive: true
    })
    document.body.addEventListener('mousedown', dragStart, {
      passive: true
    })
    document.body.addEventListener('mouseup', dragEnd, {
      passive: true
    })
    document.body.addEventListener('mousemove', drag, {
      passive: true
    })

    this.onVideoElVolumeChange = () => {
      if (videoEl.muted === true) {
        hideElement(muteButton)
        showElement(unmuteButton)
      } else {
        showElement(muteButton)
        hideElement(unmuteButton)
      }
    }
    videoEl.addEventListener('volumechange', this.onVideoElVolumeChange)

    this.onDocumentFullscreenChange = () => {
      if (document.fullscreenElement === rootEl) {
        hideElement(enterFullscreenButton)
        showElement(exitFullscreenButton)
      } else {
        showElement(enterFullscreenButton)
        hideElement(exitFullscreenButton)
      }
    }

    // @ts-expect-error
    document.addEventListener('fullscreenchange', this.onDocumentFullscreenChange)

    // iOS Workarounds
    videoEl.addEventListener('webkitendfullscreen', function () {
    // @ts-expect-error
      document.fullscreenElement = null
      showElement(enterFullscreenButton)
      hideElement(exitFullscreenButton)
    })
    document.addEventListener('webkitfullscreenchange', function () {
      if (document.webkitFullscreenElement !== null) {
        showElement(exitFullscreenButton)
        hideElement(enterFullscreenButton)
      } else {
        showElement(enterFullscreenButton)
        hideElement(exitFullscreenButton)
      }
    })

    // IE11 workaround
    document.addEventListener('MSFullscreenChange', function () {
      if (document.msFullscreenElement !== null) {
        showElement(exitFullscreenButton)
        hideElement(enterFullscreenButton)
      } else {
        hideElement(exitFullscreenButton)
        showElement(enterFullscreenButton)
      }
    })
  }

  deinit = (StroeerVideoplayer: IStroeerVideoplayer): void => {
    const videoEl = StroeerVideoplayer.getVideoEl()
    videoEl.setAttribute('controls', '')
    const uiEl = StroeerVideoplayer.getUIEl()
    const uiContainer = uiEl.firstChild
    if (uiContainer !== undefined && uiContainer.className === this.uiContainerClassName) {
      videoEl.removeEventListener('play', this.onVideoElPlay)
      videoEl.removeEventListener('pause', this.onVideoElPause)
      videoEl.removeEventListener('timeupdate', this.onVideoElTimeupdate)
      videoEl.removeEventListener('volumechange', this.onVideoElVolumeChange)
      // @ts-expect-error
      document.removeEventListener('fullscreenchange', this.onDocumentFullscreenChange)
      uiEl.removeChild(uiEl.firstChild)
    }
  }
}

const StroeerVideoplayerDefaultUI = new UI()

export default StroeerVideoplayerDefaultUI
