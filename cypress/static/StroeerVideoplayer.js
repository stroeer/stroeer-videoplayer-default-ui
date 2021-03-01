(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.StroeerVideoplayer = factory());
}(this, (function () { 'use strict';

    var convertLocalStorageIntegerToBoolean = function (key) {
        var localStorageItem = window.localStorage.getItem(key);
        if (localStorageItem !== null) {
            var probablyInteger = parseInt(localStorageItem, 10);
            if (isNaN(probablyInteger)) {
                return false;
            }
            else {
                return Boolean(probablyInteger);
            }
        }
        return false;
    };

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    /** @deprecated */
    function __spreadArrays() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }

    var log = function (t) {
        t = t !== null && t !== void 0 ? t : 'info';
        var colors = {
            info: {
                bg: '#19cf85',
                fg: '#272b30'
            },
            warn: {
                bg: '#ffd866',
                fg: '#272b30'
            },
            debug: {
                bg: '#3c92d1',
                fg: '#272b30'
            },
            error: {
                bg: '#ff6188',
                fg: '#272b30'
            }
        };
        var c = colors[t];
        return function (desc) {
            var _a;
            var logs = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                logs[_i - 1] = arguments[_i];
            }
            (_a = window.console).log.apply(_a, __spreadArrays(['%c' + desc,
                'color:' + c.fg + ';background:' + c.bg + ';'], logs));
            return true;
        };
    };

    var noop = function () {
        return false;
    };

    var version = "0.0.2";

    var _dataStore = {
        defaultUIName: 'default',
        loggingEnabled: convertLocalStorageIntegerToBoolean('StroeerVideoplayerLoggingEnabled'),
        version: version
    };
    var _registeredUIs = new Map();
    var _registeredPlugins = new Map();
    var StrooerVideoplayer = /** @class */ (function () {
        function StrooerVideoplayer(videoEl) {
            var _this = this;
            this.getUIName = function () {
                return _this._dataStore.uiName;
            };
            this.getUIEl = function () {
                return _this._dataStore.uiEl;
            };
            this.getRootEl = function () {
                return _this._dataStore.rootEl;
            };
            this.getVideoEl = function () {
                return _this._dataStore.videoEl;
            };
            this.setNoContentVideo = function () {
                _this._dataStore.isContentVideo = false;
            };
            this.setContentVideo = function () {
                _this._dataStore.isContentVideo = true;
            };
            this.initUI = function (uiName) {
                if (_registeredUIs.has(uiName)) {
                    var ui = _registeredUIs.get(uiName);
                    _this._dataStore.uiName = uiName;
                    ui.init(_this);
                    return true;
                }
                else {
                    return false;
                }
            };
            this.deinitUI = function (uiName) {
                if (_registeredUIs.has(uiName)) {
                    var ui = _registeredUIs.get(uiName);
                    _this._dataStore.uiName = undefined;
                    ui.deinit(_this);
                    return true;
                }
                else {
                    return false;
                }
            };
            this.initPlugin = function (pluginName, opts) {
                if (_registeredPlugins.has(pluginName)) {
                    var plugin = _registeredPlugins.get(pluginName);
                    plugin.init(_this, opts);
                    return true;
                }
                else {
                    return false;
                }
            };
            this.deinitPlugin = function (pluginName) {
                if (_registeredPlugins.has(pluginName)) {
                    var plugin = _registeredPlugins.get(pluginName);
                    plugin.deinit(_this);
                    return true;
                }
                else {
                    return false;
                }
            };
            this.getDataStore = function () {
                return _this._dataStore;
            };
            this._dataStore = {
                isInitialized: false,
                isPaused: false,
                videoEl: videoEl,
                rootEl: document.createElement('div'),
                uiEl: document.createElement('div'),
                videoFirstPlay: true,
                contentVideoStarted: false,
                contentVideoEnded: false,
                contentVideoFirstQuartile: false,
                contentVideoMidpoint: false,
                contentVideoThirdQuartile: false,
                isContentVideo: true,
                uiName: _dataStore.defaultUIName
            };
            this.version = version;
            var ds = this._dataStore;
            if (ds.videoEl.parentNode !== null) {
                ds.videoEl.parentNode.insertBefore(ds.rootEl, ds.videoEl);
                ds.rootEl.appendChild(ds.uiEl);
                ds.rootEl.appendChild(ds.videoEl);
                ds.rootEl.className = 'stroeer-videoplayer';
                ds.uiEl.className = 'stroeer-videoplayer-ui';
            }
            if (videoEl.getAttribute('data-stroeervp-initialized') === null) {
                videoEl.setAttribute('data-stroeervp-initialized', '1');
                videoEl.addEventListener('play', function () {
                    if (ds.videoFirstPlay) {
                        ds.videoFirstPlay = false;
                        this.dispatchEvent(new Event('firstPlay'));
                    }
                    if (ds.isContentVideo) {
                        if (ds.isPaused) {
                            ds.isPaused = false;
                            this.dispatchEvent(new Event('contentVideoResume'));
                        }
                        if (ds.contentVideoEnded) {
                            ds.contentVideoEnded = false;
                            this.dispatchEvent(new Event('contentVideoReplay'));
                        }
                    }
                });
                videoEl.addEventListener('pause', function () {
                    ds.isPaused = true;
                    if (ds.isContentVideo) {
                        this.dispatchEvent(new Event('contentVideoPause'));
                    }
                });
                videoEl.addEventListener('seeked', function () {
                    if (ds.isContentVideo) {
                        this.dispatchEvent(new Event('contentVideoSeeked'));
                    }
                });
                videoEl.addEventListener('ended', function () {
                    if (ds.isContentVideo) {
                        ds.contentVideoStarted = false;
                        ds.contentVideoEnded = true;
                        ds.contentVideoFirstQuartile = false;
                        ds.contentVideoMidpoint = false;
                        ds.contentVideoThirdQuartile = false;
                        this.dispatchEvent(new Event('contentVideoEnded'));
                    }
                });
                videoEl.addEventListener('timeupdate', function () {
                    if (ds.isContentVideo) {
                        if (!ds.contentVideoStarted && this.currentTime >= 1) {
                            ds.contentVideoStarted = true;
                            this.dispatchEvent(new Event('contentVideoStart'));
                        }
                        if (!ds.contentVideoFirstQuartile && this.currentTime >= this.duration / 4) {
                            ds.contentVideoFirstQuartile = true;
                            this.dispatchEvent(new Event('contentVideoFirstQuartile'));
                        }
                        if (!ds.contentVideoMidpoint && this.currentTime >= this.duration / 2) {
                            ds.contentVideoMidpoint = true;
                            this.dispatchEvent(new Event('contentVideoMidpoint'));
                        }
                        if (!ds.contentVideoThirdQuartile && this.currentTime >= this.duration / 4 * 3) {
                            ds.contentVideoThirdQuartile = true;
                            this.dispatchEvent(new Event('contentVideoThirdQuartile'));
                        }
                    }
                });
            }
            this.initUI(_dataStore.defaultUIName);
            return this;
        }
        StrooerVideoplayer.setDefaultUIName = function (uiName) {
            _dataStore.defaultUIName = uiName;
            return true;
        };
        StrooerVideoplayer.getDefaultUIName = function () {
            return _dataStore.defaultUIName;
        };
        StrooerVideoplayer.isLoggingEnabled = function () {
            return _dataStore.loggingEnabled;
        };
        StrooerVideoplayer.log = function (type) {
            if (StrooerVideoplayer.isLoggingEnabled()) {
                return log(type);
            }
            else {
                return noop;
            }
        };
        StrooerVideoplayer.disableLogging = function () {
            _dataStore.loggingEnabled = false;
            window.localStorage.setItem('StroeerVideoplayerLoggingEnabled', '0');
        };
        StrooerVideoplayer.enableLogging = function () {
            _dataStore.loggingEnabled = true;
            window.localStorage.setItem('StroeerVideoplayerLoggingEnabled', '1');
        };
        StrooerVideoplayer.registerUI = function (ui) {
            if (_registeredUIs.has(ui.uiName)) {
                return false;
            }
            else {
                _registeredUIs.set(ui.uiName, ui);
                return true;
            }
        };
        StrooerVideoplayer.registerPlugin = function (plugin) {
            if (_registeredPlugins.has(plugin.pluginName)) {
                return false;
            }
            else {
                _registeredPlugins.set(plugin.pluginName, plugin);
                return true;
            }
        };
        return StrooerVideoplayer;
    }());

    return StrooerVideoplayer;

})));
//# sourceMappingURL=StroeerVideoplayer.js.map
