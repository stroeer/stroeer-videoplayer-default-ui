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
  controlBar: HTMLElement
  settingsMenu: HTMLElement
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
    this.buttonsContainer = document.createElement('div')
    this.controlBar = document.createElement('div')
    this.settingsMenu = document.createElement('div')
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

  createButton = (tag: string, cls: string, aria: string, svgid: string, ishidden: boolean,
    evts: Array<{ name: string, callb: Function }>): HTMLElement => {
    const el = document.createElement(tag)
    el.classList.add(cls)
    el.setAttribute('aria-label', aria)
    el.appendChild(SVGHelper(svgid))
    if (ishidden) hideElement(el)
    console.log('create Button2', tag, cls, aria, svgid, ishidden, evts)
    evts.forEach((value, index) => {
      el.addEventListener(value.name, (ev) => { value.callb(ev) })
    })
    this.buttonsContainer.appendChild(el)
    return el
  }

  createSettingsMenu = (StroeerVideoplayer: IStroeerVideoplayer): HTMLElement => {
    const plr = StroeerVideoplayer.getVideoEl()

    // Playspeed Choser
    const speedLine = document.createElement('div')
    speedLine.classList.add('speedbox')
    const spdlneChoser = document.createElement('span')
    const speeds = [0.5, 1, 1.5, 2]
    speeds.forEach((o, i) => {
      const opt = document.createElement('i')
      if (plr.playbackRate === o) opt.classList.add('selected')
      opt.innerHTML = o.toString()
      opt.addEventListener('click', (ev) => {
        if (plr.playbackRate === o) return
        plr.playbackRate = o
        plr.defaultPlaybackRate = o
        const selects = spdlneChoser.querySelector('.selected')
        if (selects !== null) selects.classList.remove('selected')
        opt.classList.add('selected')
        hideElement(this.settingsMenu)
      })
      spdlneChoser.appendChild(opt)
    })
    speedLine.innerHTML = 'Speed '
    speedLine.appendChild(spdlneChoser)
    this.settingsMenu.appendChild(speedLine)

    // Quality Choser
    const qualCaption = document.createElement('h2')
    qualCaption.innerHTML = 'Quality'
    this.settingsMenu.appendChild(qualCaption)

    const sources: NodeListOf<HTMLSourceElement> = plr.querySelectorAll('source')
    sources.forEach((o, i) => {
      const btn = document.createElement('button')
      btn.innerHTML = o.dataset.label ?? ''
      if (plr.currentSrc === o.src) btn.classList.add('selected')
      btn.addEventListener('click', (ev) => {
        const selects = this.settingsMenu.querySelector('button.selected')
        if (selects !== null) selects.classList.remove('selected')
        btn.classList.add('selected')
        hideElement(this.settingsMenu)
        plr.src = o.src ?? ''
      })
      this.settingsMenu.appendChild(btn)
      console.log('setting menu', typeof o.dataset.label, o.src, btn)
    })
    this.settingsMenu.classList.add('settingsmenu')
    this.controlBar.appendChild(this.settingsMenu)
    return this.settingsMenu
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
    const timelineContainer = document.createElement('div')
    const timelineElapsed = document.createElement('div')
    uiContainer.className = this.uiContainerClassName
    this.controlBar.className = 'controlbar'
    timelineContainer.className = 'timeline'
    timelineElapsed.className = 'elapsed'
    this.buttonsContainer.className = 'buttons'

    // Create the Buttons
    const playButton = this.createButton('button', 'play', 'Play', 'play', false,
      [{ name: 'click', callb: () => { videoEl.play() } }])

    const replayButton = this.createButton('button', 'replay', 'Replay', 'replay', true,
      [{ name: 'click', callb: () => { videoEl.play() } }])

    // this line is to cheat the TS Parser, cause this const replayButton is not in use
    // nonetheless the replayButton does exist and has a function, so it should be worth a const
    console.log(replayButton)

    const pauseButton = this.createButton('button', 'pause', 'Pause', 'pause', videoEl.paused,
      [{ name: 'click', callb: () => { videoEl.pause() } }])

    const muteButton = this.createButton('button', 'mute', 'Mute', 'volume', videoEl.muted,
      [{ name: 'click', callb: () => { videoEl.muted = true } }])

    const unmuteButton = this.createButton('button', 'unmute', 'Unmute', 'muted', true,
      [{ name: 'click', callb: () => { videoEl.muted = false } }])

    // Volume slider
    const volSlider = document.createElement('div')
    volSlider.classList.add('volSliderBox')
    volSlider.innerHTML = '<i><s></s></i>'
    const aktVolPos = (aktx: number): void => {
      const clickX = aktx
      let percentClick = Math.floor(100 / volSlider.clientWidth * clickX)
      const inner = volSlider.querySelector('s')
      if (percentClick <= 0) {
        videoEl.muted = true
        percentClick = 0
      } else {
        videoEl.muted = false
        if (percentClick > 100) percentClick = 100
      }
      if (inner !== null) inner.style.width = percentClick.toString() + '%'
      videoEl.volume = percentClick / 100
    }
    volSlider.addEventListener('mousedown', (evt) => {
      aktVolPos(evt.offsetX)
      this.isMouseDown = true
    })
    volSlider.addEventListener('touchstart', (evt) => {
      aktVolPos(evt.targetTouches[0].pageX)
      this.isMouseDown = true
    })
    volSlider.addEventListener('mouseup', (evt) => {
      this.isMouseDown = false
    })
    volSlider.addEventListener('mouseleave', (evt) => {
      this.isMouseDown = false
    })
    volSlider.addEventListener('touchend', (evt) => {
      this.isMouseDown = false
    })
    volSlider.addEventListener('mousemove', (evt) => {
      if (this.isMouseDown === true) aktVolPos(evt.offsetX)
    })
    volSlider.addEventListener('touchmove', (evt) => {
      if (this.isMouseDown === true) aktVolPos(evt.targetTouches[0].pageX)
    })
    this.controlBar.appendChild(volSlider)

    const enterFullscreenButton = this.createButton('button', 'enterFullscreen',
      'Enter Fullscreen', 'enter-fullscreen', false,
      [{ name: 'click', callb: () => { rootEl.requestFullscreen() } }])

    const exitFullscreenButton = this.createButton('button', 'exitFullscreen',
      'Exit Fullscreen', 'exit-fullscreen', true,
      [{ name: 'click', callb: () => { document.exitFullscreen().then(noop).catch(noop) } }])

    const settingsButton = this.createButton('button', 'settings', 'Settings', 'settings', false,
      [{
        name: 'click',
        callb: () => {
          if (this.settingsMenu.classList.contains('hidden')) showElement(this.settingsMenu)
          else hideElement(this.settingsMenu)
        }
      }])
    console.log(settingsButton)

    const settingsMenu = this.createSettingsMenu(StroeerVideoplayer)
    hideElement(settingsMenu)
    this.controlBar.addEventListener('mouseleave', (evt) => {
      //    console.log(this.controlBar,evt);
      hideElement(this.settingsMenu)
    })
    console.log(settingsMenu)

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
    this.controlBar.appendChild(timelineContainer)
    this.controlBar.appendChild(this.buttonsContainer)
    uiContainer.appendChild(this.controlBar)
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
