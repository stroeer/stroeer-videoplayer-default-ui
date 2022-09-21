import { version } from '../package.json'
import UIIcons from './sprites/svg/sprite.symbol.svg'
import noop from './noop'
import SVGHelper from './SVGHelper'
import Logger from './Logger'

interface IStroeerVideoplayer {
  getUIEl: Function
  getRootEl: Function
  getVideoEl: Function
  getHls: any
  getHlsJs: any
  loading: Function
  showBigPlayButton: Function
  enterFullscreen: Function
  exitFullscreen: Function
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
  public static version: string = version
  public static uiName: string = 'default'
  uiContainerClassName: string
  onDocumentFullscreenChange: Function
  onVideoElPlay: Function
  onVideoElPause: Function
  onLoadedMetaData: Function
  onVideoElTimeupdate: Function
  onVideoElVolumeChange: Function
  onDragStart: EventListener
  onDrag: EventListener
  onDragEnd: EventListener
  toggleControlBarInterval: ReturnType<typeof setInterval>
  toggleVolumeBarInterval: ReturnType<typeof setInterval>
  isMouseDown: Boolean
  hls: any
  hlsErrorOccured: Boolean

  constructor () {
    this.uiContainerClassName = 'default'
    this.onDocumentFullscreenChange = noop
    this.onVideoElPlay = noop
    this.onVideoElPause = noop
    this.onVideoElTimeupdate = noop
    this.onVideoElVolumeChange = noop
    this.onLoadedMetaData = noop
    this.onDragStart = noop
    this.onDrag = noop
    this.onDragEnd = noop
    this.toggleControlBarInterval = setInterval(noop, 1000)
    this.toggleVolumeBarInterval = setInterval(noop, 1000)
    this.isMouseDown = false
    this.hls = null
    this.hlsErrorOccured = false

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
    if (totmino !== null) {
      let durationMinutesString = Math.floor(tot / 60).toString()
      const durationMinutes = Number(durationMinutesString)

      if (isNaN(durationMinutes)) durationMinutesString = '0'
      totmino.innerHTML = durationMinutesString
    }
    const totseco = timeDisp.querySelector('.total .sec')
    if (totseco !== null) {
      let durationSecondsString = ('00' + (Math.floor(tot) % 60).toString()).slice(-2)
      const durationSeconds = Number(durationSecondsString)
      if (isNaN(durationSeconds)) durationSecondsString = '00'
      totseco.innerHTML = durationSecondsString
    }
  }

  showErrorScreen = (StroeerVideoplayer: IStroeerVideoplayer, error: string): void => {
    const videoEl = StroeerVideoplayer.getVideoEl()
    videoEl.removeAttribute('controls')
    const uiEl = StroeerVideoplayer.getUIEl()
    if (uiEl.querySelector('.error') !== null) {
      return
    }
    const height = videoEl.clientHeight
    const width = videoEl.clientWidth
    this.deinit(StroeerVideoplayer)

    this.hlsErrorOccured = true
    if (this.hls !== null) {
      this.hls.destroy()
    }
    if (StroeerVideoplayer.getHls() !== null) {
      StroeerVideoplayer.getHls().destroy()
    }

    videoEl.parentNode.removeChild(videoEl)
    const text = document.createElement('div')
    text.innerHTML = error
    uiEl.innerHTML = '<div class="error"></div>'
    uiEl.firstChild.style.height = String(height) + 'px'
    uiEl.firstChild.style.width = String(width) + 'px'
    uiEl.firstChild.appendChild(SVGHelper('Icon-Error'))
    uiEl.firstChild.appendChild(text)
  }

  init = (StroeerVideoplayer: IStroeerVideoplayer): void => {
    Logger.log('version', version)
    const rootEl = StroeerVideoplayer.getRootEl()
    const videoEl = StroeerVideoplayer.getVideoEl()
    videoEl.removeAttribute('controls')
    const uiEl = StroeerVideoplayer.getUIEl()
    if (uiEl.querySelector('.' + this.uiContainerClassName) !== null) {
      return
    }

    if (document.getElementById('stroeer-videoplayer-default-ui-icons') === null) {
      const uiIconsContainer = document.createElement('div')
      uiIconsContainer.id = 'stroeer-videoplayer-default-ui-icons'
      uiIconsContainer.innerHTML = UIIcons
      document.body.appendChild(uiIconsContainer)
    }

    videoEl.addEventListener('hlsNetworkError', (evt: any) => {
      switch (evt.detail.response.code) {
        case 403:
          this.showErrorScreen(StroeerVideoplayer, 'Dieses Video ist in Ihrem Land nicht verfügbar.<br/>This content is not available in your country.')
          break
        case 0:
        case 404:
          this.showErrorScreen(StroeerVideoplayer, 'Dieses Video steht aktuell <strong>nicht zur Verfügung.</strong>')
          break
        default:
          console.log('Unhandled HLS Network Error:', evt.detail.response)
          break
      }
    })

    const uiContainer = document.createElement('div')
    const loadingSpinnerContainer = document.createElement('div')
    const loadingSpinnerAnimation = document.createElement('div')
    const seekPreviewContainer = document.createElement('div')
    const seekPreview = document.createElement('div')
    const seekPreviewVideo = document.createElement('video')
    const seekPreviewTime = document.createElement('div')
    const seekPreviewTimeMinutes = document.createElement('span')
    const seekPreviewTimeDivider = document.createElement('span')
    const seekPreviewTimeSeconds = document.createElement('span')
    const timelineContainer = document.createElement('div')
    const timelineElapsed = document.createElement('div')
    const timelineElapsedBubble = document.createElement('div')
    const volumeContainer = document.createElement('div')
    const volumeRange = document.createElement('div')
    const volumeLevel = document.createElement('div')
    const volumeLevelBubble = document.createElement('div')
    const controlBar = document.createElement('div')
    const buttonsContainer = document.createElement('div')
    const overlayContainer = document.createElement('div')
    seekPreviewVideo.setAttribute('preload', 'auto')
    seekPreviewContainer.classList.add('seek-preview-container')
    hideElement(seekPreviewContainer)
    seekPreview.classList.add('seek-preview')
    seekPreviewTime.classList.add('seek-preview-time')
    seekPreviewTimeMinutes.classList.add('seek-preview-time-minutes')
    seekPreviewTimeDivider.classList.add('seek-preview-time-divider')
    seekPreviewTimeDivider.innerHTML = ':'
    seekPreviewTimeSeconds.classList.add('seek-preview-time-seconds')
    seekPreviewTime.appendChild(seekPreviewTimeMinutes)
    seekPreviewTime.appendChild(seekPreviewTimeDivider)
    seekPreviewTime.appendChild(seekPreviewTimeSeconds)
    seekPreview.appendChild(seekPreviewVideo)
    seekPreview.appendChild(seekPreviewTime)
    seekPreviewContainer.appendChild(seekPreview)
    volumeContainer.className = 'volume-container'
    volumeContainer.style.opacity = '0'
    volumeRange.className = 'volume-range'
    volumeLevel.className = 'volume-level'
    volumeLevelBubble.className = 'volume-level-bubble'
    volumeRange.appendChild(volumeLevelBubble)
    volumeRange.appendChild(volumeLevel)
    volumeContainer.appendChild(volumeRange)
    overlayContainer.className = 'video-overlay startscreen'
    overlayContainer.appendChild(SVGHelper('Icon-Play'))
    uiContainer.className = this.uiContainerClassName
    loadingSpinnerContainer.className = 'loading-spinner'
    hideElement(loadingSpinnerContainer)
    loadingSpinnerAnimation.className = 'animation'
    loadingSpinnerContainer.appendChild(loadingSpinnerAnimation)
    controlBar.className = 'controlbar'
    timelineContainer.className = 'timeline'
    timelineElapsed.className = 'elapsed'
    timelineElapsedBubble.className = 'elapsed-bubble'
    buttonsContainer.className = 'buttons'
    controlBar.appendChild(volumeContainer)
    controlBar.appendChild(buttonsContainer)
    uiContainer.appendChild(controlBar)
    uiContainer.appendChild(overlayContainer)
    uiContainer.appendChild(loadingSpinnerContainer)
    uiEl.appendChild(uiContainer);

    (function () {
      for (let i = 0; i < 12; i++) {
        const d = document.createElement('div')
        loadingSpinnerAnimation.appendChild(d)
      }
    })()

    const dispatchEvent = (eventName: string, data?: any): void => {
      const event = new CustomEvent(eventName, { detail: data })
      videoEl.dispatchEvent(event)
    }

    const showLoading = (modus: boolean): void => {
      if (modus) {
        hideElement(overlayContainer)
        showElement(loadingSpinnerContainer)
      } else {
        hideElement(loadingSpinnerContainer)
      }
    }

    const showBigPlayButton = (modus: boolean): void => {
      if (modus) {
        hideElement(loadingSpinnerContainer)
        showElement(overlayContainer)
      } else {
        hideElement(overlayContainer)
      }
    }

    StroeerVideoplayer.loading = (modus: boolean): void => {
      showLoading(modus)
    }

    StroeerVideoplayer.showBigPlayButton = (modus: boolean): void => {
      showBigPlayButton(modus)
    }

    videoEl.addEventListener('waiting', () => {
      showLoading(true)
    })

    videoEl.addEventListener('canplay', () => {
      showLoading(false)
    })

    videoEl.addEventListener('playing', () => {
      showLoading(false)
    })

    // Create the Buttons
    const playButton = this.createButton(StroeerVideoplayer, 'button', 'play', 'Play', 'Icon-Play', false,
      [
        {
          name: 'click',
          callb: () => {
            dispatchEvent('UIPlay', videoEl.currentTime)
            dispatchEvent('UIDefaultPlay', videoEl.currentTime)
            if (videoEl.currentTime > 0) {
              dispatchEvent('UIResume', videoEl.currentTime)
              dispatchEvent('UIDefaultResume', videoEl.currentTime)
            }
            videoEl.play()
          }
        }
      ])

    if (videoEl.paused === false) {
      hideElement(playButton)
    }

    const replayButton = this.createButton(StroeerVideoplayer, 'button', 'replay', 'Replay', 'Icon-Replay', true,
      [
        {
          name: 'click',
          callb: () => {
            dispatchEvent('UIReplay', videoEl.duration)
            dispatchEvent('UIDefaultReplay', videoEl.duration)
            videoEl.play()
          }
        }
      ])

    const pauseButton = this.createButton(StroeerVideoplayer, 'button', 'pause', 'Pause', 'Icon-Pause', videoEl.paused,
      [
        {
          name: 'click',
          callb: () => {
            dispatchEvent('UIPause', videoEl.currentTime)
            dispatchEvent('UIDefaultPause', videoEl.currentTime)
            videoEl.pause()
          }
        }
      ])

    const muteButton = this.createButton(StroeerVideoplayer, 'button', 'mute', 'Mute', 'Icon-Volume', videoEl.muted,
      [
        {
          name: 'click',
          callb: () => {
            dispatchEvent('UIMute', videoEl.currentTime)
            dispatchEvent('UIDefaultMute', videoEl.currentTime)
            videoEl.muted = true
          }
        }
      ])

    const unmuteButton = this.createButton(StroeerVideoplayer, 'button', 'unmute', 'Unmute', 'Icon-Mute', videoEl.muted !== true,
      [
        {
          name: 'click',
          callb: () => {
            dispatchEvent('UIUnmute', videoEl.currentTime)
            dispatchEvent('UIDefaultUnmute', videoEl.currentTime)
            videoEl.muted = false
          }
        }
      ])

    // Time Display
    const timeDisp = document.createElement('div')
    timeDisp.classList.add('time')
    timeDisp.innerHTML = '<div class="elapsed"><span class="min">00</span>:<span class="sec">00</span> /</div><div class="total"><span class="min">00</span>:<span class="sec">00</span></div>'
    controlBar.appendChild(timeDisp)

    const isAlreadyInFullscreenMode = (): boolean => {
      return (document.fullscreenElement === rootEl || document.fullscreenElement === videoEl)
    }

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

    const enterFullscreenButtonIsHidden = isAlreadyInFullscreenMode()

    // Fullscreen Button
    const enterFullscreenButton = this.createButton(StroeerVideoplayer, 'button', 'enterFullscreen',
      'Enter Fullscreen', 'Icon-Fullscreen', enterFullscreenButtonIsHidden,
      [{
        name: 'click',
        callb: () => {
          dispatchEvent('UIEnterFullscreen', videoEl.currentTime)
          dispatchEvent('UIDefaultEnterFullscreen', videoEl.currentTime)
          StroeerVideoplayer.enterFullscreen()
        }
      }])

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

    const exitFullscreenButtonIsHidden = !isAlreadyInFullscreenMode()

    const exitFullscreenButton = this.createButton(StroeerVideoplayer, 'button', 'exitFullscreen', 'Exit Fullscreen', 'Icon-FullscreenOff', exitFullscreenButtonIsHidden,
      [{
        name: 'click',
        callb: () => {
          dispatchEvent('UIExitFullscreen', videoEl.currentTime)
          dispatchEvent('UIDefaultExitFullscreen', videoEl.currentTime)
          StroeerVideoplayer.exitFullscreen()
        }
      }])

    // Trigger play and pause on UI-Container click
    uiContainer.addEventListener('click', (evt) => {
      const target = evt.target as HTMLDivElement
      if (target.className !== this.uiContainerClassName) {
        return
      }

      if (videoEl.paused === true) {
        dispatchEvent('UIPlay', videoEl.currentTime)
        dispatchEvent('UIDefaultPlay', videoEl.currentTime)
        if (videoEl.currentTime > 0) {
          dispatchEvent('UIResume', videoEl.currentTime)
          dispatchEvent('UIDefaultResume', videoEl.currentTime)
        }
        dispatchEvent('UIUIContainerPlay', videoEl.currentTime)
        dispatchEvent('UIDefaultUIContainerPlay', videoEl.currentTime)
        videoEl.play()
      } else {
        if (isTouchDevice()) {
          return
        }
        dispatchEvent('UIPause', videoEl.currentTime)
        dispatchEvent('UIDefaultPause', videoEl.currentTime)
        dispatchEvent('UIUIContainerPause', videoEl.currentTime)
        dispatchEvent('UIDefaultUIContainerPause', videoEl.currentTime)
        videoEl.pause()
      }
    })

    if (videoEl.paused === false) {
      hideElement(overlayContainer)
    }

    overlayContainer.addEventListener('click', (evt) => {
      if (videoEl.paused === true) {
        dispatchEvent('UIPlay', videoEl.currentTime)
        dispatchEvent('UIDefaultPlay', videoEl.currentTime)
        if (videoEl.currentTime > 0) {
          dispatchEvent('UIResume', videoEl.currentTime)
          dispatchEvent('UIDefaultResume', videoEl.currentTime)
        }
        dispatchEvent('UIOverlayContainerPlay', videoEl.currentTime)
        dispatchEvent('UIDefaultOverlayContainerPlay', videoEl.currentTime)
        videoEl.play()
      } else {
        dispatchEvent('UIPause', videoEl.currentTime)
        dispatchEvent('UIDefaultPause', videoEl.currentTime)
        dispatchEvent('UIOverlayContainerPause', videoEl.currentTime)
        dispatchEvent('UIDefaultOverlayContainerPause', videoEl.currentTime)
        videoEl.pause()
      }
    })

    timelineContainer.addEventListener('mousemove', (evt) => {
      // only for desktop devices
      if (isTouchDevice()) {
        return
      }
      if (this.hlsErrorOccured === true) {
        return
      }
      // it makes no sense to show a preview of the current frames of the video playing,
      // so we bail out here..
      if (evt.target === timelineElapsedBubble) {
        hideElement(seekPreviewContainer)
        return
      }
      const videoSource = videoEl.querySelector('source')
      const HlsJs = StroeerVideoplayer.getHlsJs()
      const canPlayNativeHls = videoEl.canPlayType('application/vnd.apple.mpegurl') === 'probably' || videoEl.canPlayType('application/vnd.apple.mpegurl') === 'maybe'

      if (!canPlayNativeHls && HlsJs.isSupported() === true) {
        if (this.hls === null || (this.hls !== null && this.hls.url !== videoSource.src)) {
          if (this.hls !== null) {
            this.hls.destroy()
            this.hls = null
          }
          this.hls = new HlsJs()
          this.hls.loadSource(videoSource.src)
          this.hls.attachMedia(seekPreviewVideo)

          this.hls.on(HlsJs.Events.ERROR, (event: any, data: any) => {
            this.hlsErrorOccured = true
            this.hls.destroy()
            this.hls = null
          })
        }
      } else {
        if (seekPreviewVideo.src !== videoSource.src) {
          seekPreviewVideo.src = videoSource.src
        }
      }

      const caluclatedMaxRight = timelineContainer.offsetWidth - seekPreviewContainer.offsetWidth
      let caluclatedLeft = evt.offsetX - seekPreviewContainer.offsetWidth / 2
      if (caluclatedLeft < 0) {
        caluclatedLeft = 0
      }
      if (caluclatedLeft > caluclatedMaxRight) {
        caluclatedLeft = caluclatedMaxRight
      }
      seekPreviewContainer.style.left = String(caluclatedLeft) + 'px'
      const x = evt.offsetX
      const vd = videoEl.duration
      const elWidth = timelineContainer.offsetWidth
      const val = (100 / elWidth) * x
      const time = (vd / 100) * val

      seekPreviewTimeMinutes.innerHTML = Math.floor(time / 60).toString()
      seekPreviewTimeSeconds.innerHTML = ('00' + (Math.floor(time) % 60).toString()).slice(-2)
      seekPreviewVideo.currentTime = time
      showElement(seekPreviewContainer)
    })

    timelineContainer.addEventListener('mouseout', (evt) => {
      // only for desktop devices
      if (isTouchDevice()) {
        return
      }
      hideElement(seekPreviewContainer)
    })

    timelineContainer.appendChild(seekPreviewContainer)
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

    clearInterval(this.toggleControlBarInterval)
    this.toggleControlBarInterval = setInterval(toggleControlbarTicker, 1000)

    const toggleVolumeSliderInSeconds = 2
    let toggleVolumeSliderSecondsLeft = toggleVolumeSliderInSeconds
    const toggleVolumeSliderTicker = (): void => {
      if (toggleVolumeSliderSecondsLeft === 0) {
        volumeContainer.style.opacity = '0'
      } else {
        toggleVolumeSliderSecondsLeft = toggleVolumeSliderSecondsLeft - 1
      }
    }

    volumeContainer.addEventListener('mousemove', () => {
      toggleVolumeSliderSecondsLeft = toggleVolumeSliderInSeconds
    })

    clearInterval(this.toggleVolumeBarInterval)
    this.toggleVolumeBarInterval = setInterval(toggleVolumeSliderTicker, 1000)

    this.onVideoElPlay = () => {
      hideElement(playButton)
      hideElement(replayButton)
      showElement(pauseButton)
      hideElement(overlayContainer)
      overlayContainer.classList.remove('startscreen')
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

    this.onVideoElTimeupdate = () => {
      const percentage = videoEl.currentTime / videoEl.duration * 100
      const percentageString = String(percentage)
      this.setTimeDisp(timeDisp, videoEl.currentTime, videoEl.duration)

      timelineElapsed.style.width = percentageString + '%'
      timelineElapsedBubble.style.left = percentageString + '%'
    }
    videoEl.addEventListener('timeupdate', this.onVideoElTimeupdate)

    // set initial value of volume bar
    volumeLevel.style.height = String(videoEl.volume * 100) + '%'
    if (videoEl.volume <= 0.9) {
      volumeLevelBubble.style.bottom = String(videoEl.volume * 100) + '%'
    }

    const calulateVolumePercentageBasedOnYCoords = (y: number): number => {
      const percentage = (100 / volumeRange.offsetHeight) * y
      return percentage
    }

    const updateVolumeWhileDragging = (evt: any): void => {
      let clientY = evt.clientY
      if (clientY === undefined) {
        if ('touches' in evt && evt.touches.length > 0) {
          clientY = evt.touches[0].clientY
        } else {
          clientY = false
        }
      }
      if (clientY === false) return
      const volumeRangeBoundingClientRect: any = volumeRange.getBoundingClientRect()
      let volumeContainerOffsetY = 0
      if ('y' in volumeRangeBoundingClientRect) {
        volumeContainerOffsetY = volumeRangeBoundingClientRect.y
      } else {
        // @eslint-ignore-line
        volumeContainerOffsetY = volumeRangeBoundingClientRect.top
      }
      let y = clientY - volumeContainerOffsetY
      if (y < 0) y = 0
      if (y > volumeRangeBoundingClientRect.height) { y = volumeRangeBoundingClientRect.height }

      const percentageY = calulateVolumePercentageBasedOnYCoords(y)
      const percentageHeight = 100 - percentageY
      const percentageHeightString = String(percentageHeight)
      const percentageYString = String(percentageY)
      volumeLevel.style.height = percentageHeightString + '%'
      if (percentageY < 90) {
        volumeLevelBubble.style.top = percentageYString + '%'
      }
      const volume = percentageHeight / 100
      videoEl.volume = volume
    }
    const calulateDurationPercentageBasedOnXCoords = (x: number): number => {
      const percentage = (100 / timelineContainer.offsetWidth) * x
      return percentage
    }

    const updateTimelineWhileDragging = (evt: any): void => {
      let clientX = evt.clientX
      if (clientX === undefined) {
        if ('touches' in evt && evt.touches.length > 0) {
          clientX = evt.touches[0].clientX
        } else {
          clientX = false
        }
      }
      if (clientX === false) return
      const durationContainerBoundingClientRect: any = timelineContainer.getBoundingClientRect()
      let durationContainerOffsetX = 0
      if ('x' in durationContainerBoundingClientRect) {
        durationContainerOffsetX = durationContainerBoundingClientRect.x
      } else {
        durationContainerOffsetX = durationContainerBoundingClientRect.left
      }
      let x = clientX - durationContainerOffsetX
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

    this.onDragStart = (evt: any): void => {
      switch (evt.target) {
        case timelineContainer:
        case timelineElapsed:
        case timelineElapsedBubble:
          dispatchEvent('UISeekStart', videoEl.currentTime)
          dispatchEvent('UIDefaultSeekStart', videoEl.currentTime)
          videoEl.pause()
          draggingWhat = 'timeline'
          break
        case volumeRange:
        case volumeLevel:
        case volumeLevelBubble:
          dispatchEvent('UIVolumeChangeStart', {
            volume: videoEl.volume,
            currentTime: videoEl.currentTime
          })
          dispatchEvent('UIDefaultVolumeChangeStart', {
            volume: videoEl.volume,
            currentTime: videoEl.currentTime
          })
          draggingWhat = 'volume'
          break
        default:
          break
      }
    }

    this.onDragEnd = (evt: any): void => {
      if (draggingWhat === 'timeline') {
        draggingWhat = ''
        updateTimelineWhileDragging(evt)
        videoEl.currentTime = timelineElapsed.getAttribute('data-timeinseconds')
        dispatchEvent('UISeekEnd', videoEl.currentTime)
        dispatchEvent('UIDefaultSeekEnd', videoEl.currentTime)
        videoEl.play()
      }
      if (draggingWhat === 'volume') {
        draggingWhat = ''
        updateVolumeWhileDragging(evt)
        dispatchEvent('UIVolumeChangeEnd', {
          volume: videoEl.volume,
          currentTime: videoEl.currentTime
        })
        dispatchEvent('UIDefaultVolumeChangeEnd', {
          volume: videoEl.volume,
          currentTime: videoEl.currentTime
        })
      }
    }

    this.onDrag = (evt: any): void => {
      if (draggingWhat === 'timeline') {
        updateTimelineWhileDragging(evt)
      }
      if (draggingWhat === 'volume') {
        updateVolumeWhileDragging(evt)
      }
    }

    document.body.addEventListener('touchstart', this.onDragStart, {
      passive: true
    })
    document.body.addEventListener('touchend', this.onDragEnd, {
      passive: true
    })
    document.body.addEventListener('touchmove', this.onDrag, {
      passive: true
    })
    document.body.addEventListener('mousedown', this.onDragStart, {
      passive: true
    })
    document.body.addEventListener('mouseup', this.onDragEnd, {
      passive: true
    })
    document.body.addEventListener('mousemove', this.onDrag, {
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

    muteButton.addEventListener('mouseover', () => {
      if (isTouchDevice()) {
        return
      }
      volumeContainer.style.opacity = '1'
      toggleVolumeSliderSecondsLeft = toggleVolumeSliderInSeconds
    })

    unmuteButton.addEventListener('mouseover', () => {
      if (isTouchDevice()) {
        return
      }
      volumeContainer.style.opacity = '1'
      toggleVolumeSliderSecondsLeft = toggleVolumeSliderInSeconds
    })

    this.onDocumentFullscreenChange = () => {
      if (document.fullscreenElement === rootEl || document.fullscreenElement === videoEl) {
        videoEl.dispatchEvent(new Event('fullscreen'))
        hideElement(enterFullscreenButton)
        showElement(exitFullscreenButton)
      } else {
        videoEl.dispatchEvent(new Event('exitFullscreen'))
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
      document.body.removeEventListener('touchstart', this.onDragStart)
      document.body.removeEventListener('touchend', this.onDragEnd)
      document.body.removeEventListener('touchmove', this.onDrag)
      document.body.removeEventListener('mousedown', this.onDragStart)
      document.body.removeEventListener('mouseup', this.onDragEnd)
      document.body.removeEventListener('mousemove', this.onDrag)
      clearInterval(this.toggleControlBarInterval)
      clearInterval(this.toggleVolumeBarInterval)
      // @ts-expect-error
      document.removeEventListener('fullscreenchange', this.onDocumentFullscreenChange)
      if (this.hls !== null) {
        this.hls.destroy()
        this.hls = null
      }
      uiEl.removeChild(uiEl.firstChild)
    }
  }
}

export default UI
