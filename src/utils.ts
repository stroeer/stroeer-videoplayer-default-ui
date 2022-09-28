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

const convertLocalStorageStringToNumber = (key: string): number => {
  if (typeof window !== 'undefined') {
    const localStorageItem = window.localStorage.getItem(key)
    if (localStorageItem !== null) {
      const number = parseFloat(localStorageItem)
      if (number >= 0 && number <= 1) {
        return number
      } else {
        return 0.5
      }
    } else {
      return 0.5
    }
  }
  return 0.5
}

const convertLocalStorageIntegerToBoolean = (key: string): boolean => {
  if (typeof window !== 'undefined') {
    const localStorageItem = window.localStorage.getItem(key)
    if (localStorageItem !== null) {
      const probablyInteger = parseInt(localStorageItem, 10)
      if (isNaN(probablyInteger)) {
        return false
      } else {
        return Boolean(probablyInteger)
      }
    }
  }
  return false
}

export {
  isTouchDevice,
  hideElement,
  showElement,
  convertLocalStorageStringToNumber,
  convertLocalStorageIntegerToBoolean
}
