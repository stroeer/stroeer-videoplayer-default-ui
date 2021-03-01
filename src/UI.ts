import { version } from '../package.json'
import UIIcons from './svg/icons.svg'
import noop from './noop'
import SVGHelper from './SVGHelper'

interface IStroeerVideoplayer {
  getUIEl: Function
  getRootEl: Function
  getVideoEl: Function
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
    replayButton.classList.add('hidden')
    replayButton.addEventListener('click', () => {
      videoEl.play()
    })
    replayButton.appendChild(SVGHelper('replay'))
    buttonsContainer.appendChild(replayButton)

    const playButton = document.createElement('button')
    playButton.classList.add('play')
    playButton.addEventListener('click', () => {
      videoEl.play()
    })
    playButton.appendChild(SVGHelper('play'))
    buttonsContainer.appendChild(playButton)

    const pauseButton = document.createElement('button')
    pauseButton.classList.add('pause')
    // hide button if in paused state
    if (videoEl.paused === true) {
      pauseButton.classList.add('hidden')
    }
    pauseButton.addEventListener('click', () => {
      videoEl.pause()
    })
    pauseButton.appendChild(SVGHelper('pause'))
    buttonsContainer.appendChild(pauseButton)

    const muteButton = document.createElement('button')
    muteButton.classList.add('mute')
    // hide button if in muted state
    if (videoEl.muted === true) {
      muteButton.classList.add('hidden')
    }
    muteButton.addEventListener('click', () => {
      videoEl.muted = true
    })
    muteButton.appendChild(SVGHelper('volume'))
    buttonsContainer.appendChild(muteButton)

    const unmuteButton = document.createElement('button')
    unmuteButton.classList.add('unmute')
    // if not muted, hide the button
    if (videoEl.muted === false) {
      unmuteButton.classList.add('hidden')
    }
    unmuteButton.addEventListener('click', () => {
      videoEl.muted = false
    })
    unmuteButton.appendChild(SVGHelper('muted'))
    buttonsContainer.appendChild(unmuteButton)

    const enterFullscreenButton = document.createElement('button')
    enterFullscreenButton.classList.add('enterFullscreen')
    enterFullscreenButton.addEventListener('click', () => {
      rootEl.requestFullscreen()
    })
    enterFullscreenButton.appendChild(SVGHelper('enter-fullscreen'))
    buttonsContainer.appendChild(enterFullscreenButton)

    const exitFullscreenButton = document.createElement('button')
    exitFullscreenButton.classList.add('exitFullscreen')
    exitFullscreenButton.classList.add('hidden')
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
      playButton.classList.add('hidden')
      pauseButton.classList.remove('hidden')
    }
    videoEl.addEventListener('play', this.onVideoElPlay)

    this.onVideoElPause = () => {
      playButton.classList.remove('hidden')
      pauseButton.classList.add('hidden')
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
        muteButton.classList.add('hidden')
        unmuteButton.classList.remove('hidden')
      } else {
        muteButton.classList.remove('hidden')
        unmuteButton.classList.add('hidden')
      }
    }
    videoEl.addEventListener('volumechange', this.onVideoElVolumeChange)

    this.onDocumentFullscreenChange = () => {
      if (document.fullscreenElement === rootEl) {
        enterFullscreenButton.classList.add('hidden')
        exitFullscreenButton.classList.remove('hidden')
      } else {
        enterFullscreenButton.classList.remove('hidden')
        exitFullscreenButton.classList.add('hidden')
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

declare var StroeerVideoplayer: any;
if (typeof StroeerVideoplayer !== 'undefined') {
  StroeerVideoplayer.registerUI(StroeerVideoplayerDefaultUI)
}

export default StroeerVideoplayerDefaultUI
