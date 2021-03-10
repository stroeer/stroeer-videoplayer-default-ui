import { version } from '../package.json'
import UIIcons from './svg/icons.svg'
import noop from './noop'
import SVGHelper from './SVGHelper'

interface IStroeerVideoplayer {
  getUIEl: Function
  getRootEl: Function
  getVideoEl: Function
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
  onVideoElTimeupdate: Function
  onVideoElVolumeChange: Function

  constructor () {
    this.version = version
    this.uiName = 'default'
    this.uiContainerClassName = 'default-ui'
    this.onDocumentFullscreenChange = noop
    this.onVideoElPlay = noop
    this.onVideoElPause = noop
    this.onVideoElTimeupdate = noop
    this.onVideoElVolumeChange = noop

    return this
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
    const controlbar = document.createElement('div')
    const timelineContainer = document.createElement('div')
    const timelineElapsed = document.createElement('div')
    const buttonsContainer = document.createElement('div')
    uiContainer.className = this.uiContainerClassName
    controlbar.className = 'controlbar'
    timelineContainer.className = 'timeline'
    timelineElapsed.className = 'elapsed'
    buttonsContainer.className = 'buttons'

    const replayButton = document.createElement('button')
    replayButton.classList.add('replay')
    replayButton.setAttribute('aria-label', 'Replay')
    hideElement(replayButton)
    replayButton.addEventListener('click', () => {
      videoEl.play()
    })
    replayButton.appendChild(SVGHelper('replay'))
    buttonsContainer.appendChild(replayButton)

    const playButton = document.createElement('button')
    playButton.classList.add('play')
    playButton.setAttribute('aria-label', 'Play')
    playButton.addEventListener('click', () => {
      videoEl.play()
    })
    playButton.appendChild(SVGHelper('play'))
    buttonsContainer.appendChild(playButton)

    const pauseButton = document.createElement('button')
    pauseButton.classList.add('pause')
    pauseButton.setAttribute('aria-label', 'Pause')
    // hide button if in paused state
    if (videoEl.paused === true) {
      hideElement(pauseButton)
    }
    pauseButton.addEventListener('click', () => {
      videoEl.pause()
    })
    pauseButton.appendChild(SVGHelper('pause'))
    buttonsContainer.appendChild(pauseButton)

    const muteButton = document.createElement('button')
    muteButton.classList.add('mute')
    muteButton.setAttribute('aria-label', 'Mute')
    // hide button if in muted state
    if (videoEl.muted === true) {
      hideElement(muteButton)
    }
    muteButton.addEventListener('click', () => {
      videoEl.muted = true
    })
    muteButton.appendChild(SVGHelper('volume'))
    buttonsContainer.appendChild(muteButton)

    const unmuteButton = document.createElement('button')
    unmuteButton.classList.add('unmute')
    unmuteButton.setAttribute('aria-label', 'Unmute')
    // if not muted, hide the button
    if (videoEl.muted === false) {
      hideElement(unmuteButton)
    }
    unmuteButton.addEventListener('click', () => {
      videoEl.muted = false
    })
    unmuteButton.appendChild(SVGHelper('muted'))
    buttonsContainer.appendChild(unmuteButton)

    const enterFullscreenButton = document.createElement('button')
    enterFullscreenButton.classList.add('enterFullscreen')
    enterFullscreenButton.setAttribute('aria-label', 'Enter Fullscreen')
    enterFullscreenButton.addEventListener('click', () => {
      rootEl.requestFullscreen()
    })
    enterFullscreenButton.appendChild(SVGHelper('enter-fullscreen'))
    buttonsContainer.appendChild(enterFullscreenButton)

    const exitFullscreenButton = document.createElement('button')
    exitFullscreenButton.classList.add('exitFullscreen')
    exitFullscreenButton.setAttribute('aria-label', 'Exit Fullscreen')
    hideElement(exitFullscreenButton)
    exitFullscreenButton.addEventListener('click', () => {
      document.exitFullscreen().then(noop).catch(noop)
    })
    exitFullscreenButton.appendChild(SVGHelper('exit-fullscreen'))
    buttonsContainer.appendChild(exitFullscreenButton)

    // Make timeline seekable
    timelineContainer.addEventListener('click', (evt) => {
      const clickX = evt.offsetX
      const percentClick = 100 / timelineContainer.offsetWidth * clickX
      const absoluteDuration = percentClick / 100 * videoEl.duration
      videoEl.currentTime = absoluteDuration
    })

    // Trigger play and pause on UI-Container click
    uiContainer.addEventListener('click', (evt) => {
      const target = evt.target as HTMLDivElement
      if (target.className !== this.uiContainerClassName) {
        return
      }

      if (videoEl.paused === true) {
        videoEl.play()
      } else {
        videoEl.pause()
      }
    })

    timelineContainer.appendChild(timelineElapsed)
    controlbar.appendChild(timelineContainer)
    controlbar.appendChild(buttonsContainer)
    uiContainer.appendChild(controlbar)
    uiEl.appendChild(uiContainer)

    this.onVideoElPlay = () => {
      console.log('play')
      hideElement(playButton)
      showElement(pauseButton)
    }
    videoEl.addEventListener('play', this.onVideoElPlay)

    this.onVideoElPause = () => {
      showElement(playButton)
      hideElement(pauseButton)
    }
    videoEl.addEventListener('pause', this.onVideoElPause)

    this.onVideoElTimeupdate = () => {
      const percentage = videoEl.currentTime / videoEl.duration * 100
      const percentageString = String(percentage)
      timelineElapsed.style.width = percentageString + '%'
    }
    videoEl.addEventListener('timeupdate', this.onVideoElTimeupdate)

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
