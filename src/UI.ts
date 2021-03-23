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
  buttonsContainer: HTMLElement

  constructor () {
    this.version = version
    this.uiName = 'default'
    this.uiContainerClassName = 'default'
    this.onDocumentFullscreenChange = noop
    this.onVideoElPlay = noop
    this.onVideoElPause = noop
    this.onVideoElTimeupdate = noop
    this.onVideoElVolumeChange = noop
    this.buttonsContainer = document.createElement('div')

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

  createButton = (tag: string, cls: string, aria: string, svgid: string, ishidden: boolean, clickcb: Function): HTMLElement => {
    const el = document.createElement(tag)
    el.classList.add(cls)
    el.setAttribute('aria-label', aria)
    el.appendChild(SVGHelper(svgid))
    if (ishidden) hideElement(el)
    console.log('create Button', tag, cls, aria, svgid, ishidden, clickcb)
    if (clickcb !== null) {
      el.addEventListener('click', (evt) => {
        clickcb()
        console.log('click', evt)
      })
    }
    this.buttonsContainer.appendChild(el)
    return el
  }

  init = (StroeerVideoplayer: IStroeerVideoplayer): void => {
    console.log('Init')
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
    uiContainer.className = this.uiContainerClassName
    controlbar.className = 'controlbar'
    timelineContainer.className = 'timeline'
    timelineElapsed.className = 'elapsed'
    this.buttonsContainer.className = 'buttons'

    // Create the Buttons
    const playButton = this.createButton('button', 'play', 'Play', 'play', false, () => { videoEl.play() })

    const replayButton = this.createButton('button', 'replay', 'Replay', 'replay', true, () => { videoEl.play() })
    // this line is to cheat the TS Parser, cause this const replayButton is not in use
    // nonetheless the replayButton does exist and has a function, so it should be worth a const
    console.log(replayButton)

    const pauseButton = this.createButton('button', 'pause', 'Pause', 'pause', videoEl.paused, () => { videoEl.pause() })

    const muteButton = this.createButton('button', 'mute', 'Mute', 'volume', videoEl.muted, () => { videoEl.muted = true })

    const unmuteButton = this.createButton('button', 'unmute', 'Unmute', 'muted', true, () => { videoEl.muted = false })

    const enterFullscreenButton = this.createButton('button', 'enterFullscreen', 'Enter Fullscreen', 'enter-fullscreen', false, () => { rootEl.requestFullscreen() })

    const exitFullscreenButton = this.createButton('button', 'exitFullscreen', 'Exit Fullscreen', 'exit-fullscreen', true, () => { document.exitFullscreen().then(noop).catch(noop) })

    const settingsButton = this.createButton('button', 'settings', 'Settings', 'settings', false, () => { console.log('settings') })
    console.log(settingsButton)

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
    controlbar.appendChild(this.buttonsContainer)
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
