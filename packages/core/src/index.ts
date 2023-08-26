/**
 * @name GenshinKit
 * @desc An API wrapper for fetching player data of Genshin Impact
 *
 * @author 机智的小鱼君 <dragon-fish@qq.com>
 * @license Apache-2.0
 */

// Name
export const name = 'genshin-kit'

// Modules
import { _getApiEndpoint } from './module/_getApiEndpoint'
import { _getDS } from './module/_getDS'
import { _getHttpHeaders } from './module/_getHttpHeaders'
import { _getServer } from './module/_getServer'
import { _hoyolabVersion } from './module/_hoyolabVersion'
import { request } from './module/request'
export * as util from './util'
import { URLSearchParams } from 'url'
import { deprecate } from 'util'

// Types
import {
  Abyss,
  Activities,
  AppCache,
  Character,
  AppServerLocale,
  AppServerType,
  UserInfo,
  DailyNote,
} from './types'

export class GenshinKit {
  _cache!: AppCache
  cookie!: string
  serverType!: AppServerType
  serverLocale!: AppServerLocale
  _getApiEndpoint: typeof _getApiEndpoint
  _hoyolabVersion!: typeof _hoyolabVersion
  _getHttpHeaders!: typeof _getHttpHeaders
  _getDS!: typeof _getDS
  _getServer!: typeof _getServer
  request!: typeof request
  getCharacters: (uid: number, noCache?: boolean) => Promise<Character[]>
  getUserRoles: (uid: number, noCache?: boolean) => Promise<Character[]>
  getAbyss: (uid: number, type?: 1 | 2, noCache?: boolean) => Promise<Abyss>
  getCurAbyss: (uid: number, noCache?: boolean) => Promise<Abyss>
  getPrevAbyss: (uid: number, noCache?: boolean) => Promise<Abyss>
  setCookie: (cookie: string) => this

  constructor() {
    // Cache
    this._cache = {}

    // Variables
    this.cookie = ''
    this._getApiEndpoint = _getApiEndpoint
    this._getDS = _getDS
    this._getHttpHeaders = _getHttpHeaders
    this._getServer = _getServer
    this._hoyolabVersion = _hoyolabVersion
    this.request = request
    this.serverType = 'cn'
    this.serverLocale = 'zh-cn'

    // Alias
    this.getCharacters = this.getAllCharacters
    this.getUserRoles = this.getAllCharacters
    this.getAbyss = this.getSpiralAbyss
    this.getCurAbyss = this.getCurrentAbyss
    this.getPrevAbyss = this.getPreviousAbyss
    this.setCookie = this.loginWithCookie
  }

  /**
   * @method loginWithCookie
   * @param {String} cookie
   */
  loginWithCookie(cookie: string): this {
    this.clearCache()
    this.cookie = cookie
    return this
  }

  /**
   * @method clearCache
   */
  clearCache(): this {
    this._cache = {}
    return this
  }

  /**
   * @method setServerType
   * @param type Server type: cn => China server, os => Oversea server
   */
  setServerType(type: AppServerType): this {
    this.serverType = type
    return this
  }

  /**
   * @method setServerLanguage
   * @param locale Server locale: Language in which character names, weapons, etc. will be displayed.
   */
  setServerLocale(locale: AppServerLocale): this {
    this.serverLocale = locale
    return this
  }

  /**
   * @function getUserInfo
   * @param {Number} uid
   * @returns {Promise<UserInfo>}
   */
  async getUserInfo(uid: number, noCache = false): Promise<UserInfo> {
    const temp = this._cache?.[uid]?.info
    if (temp && !noCache) {
      return temp
    }

    const server = this._getServer(uid)

    const data = await this.request('get', 'index', {
      role_id: uid,
      server,
    })
    if (data.retcode !== 0 || !data.data) {
      throw {
        code: data.retcode,
        message: data.message,
      }
    }
    this._cache[uid] = {
      ...this._cache[uid],
      info: data.data,
    }
    return data.data
  }

  /**
   * @function getAllCharacters
   * @param {Number} uid
   * @returns {Promise<Character[]>}
   */
  async getAllCharacters(uid: number, noCache = false): Promise<Character[]> {
    const temp = this._cache?.[uid]?.roles
    if (temp && !noCache) {
      return temp
    }

    const server = this._getServer(uid)
    const userInfo = await this.getUserInfo(uid)
    const character_ids = userInfo.avatars.map((item) => {
      return item.id
    })

    const data = await this.request('post', 'character', {
      character_ids,
      role_id: uid,
      server,
    })
    if (data.retcode !== 0 || !data.data) {
      throw {
        code: data.retcode,
        message: data.message,
      }
    } else {
      this._cache[uid] = {
        ...this._cache[uid],
        roles: data?.data?.avatars,
      }
      return data?.data?.avatars || []
    }
  }

  getCharacterDetailsUrl(uid: number, id: number): string {
    return deprecate(() => {
      const server = this._getServer(uid)
      return `https://webstatic.mihoyo.com/app/community-game-records/index.html?${new URLSearchParams(
        { bbs_presentation_style: 'fullscreen' }
      )}#/ys/role?${new URLSearchParams({
        role_id: uid.toString(),
        server: server,
        id: id.toString(),
      })}`
    }, '`getCharacterDetailsUrl()` has been deprecated.')()
  }

  /**
   * @function getSpiralAbyss
   * @param {Number} uid
   * @param {1|2} type 1 cur, 2 prev
   * @returns {Promise<Abyss>}
   */
  async getSpiralAbyss(
    uid: number,
    type: 1 | 2 = 1,
    noCache = false
  ): Promise<Abyss> {
    if (type !== 1 && type !== 2) {
      throw { code: -1, message: 'Invalid abyss type' }
    }

    const temp = this._cache?.[uid]?.abyss?.[type]
    if (temp && !noCache) {
      return temp
    }

    const server = this._getServer(uid)

    const data = await this.request('get', 'spiralAbyss', {
      role_id: uid,
      schedule_type: type,
      server,
    })
    if (data.retcode !== 0 || !data.data) {
      throw { code: data.retcode, message: data.message }
    } else {
      this._cache[uid] = this._cache[uid] || {}
      this._cache[uid].abyss = {
        ...this._cache[uid].abyss,
        [type]: data.data,
      }
      return data.data
    }
  }

  /**
   * @method getActivities 获取限时活动信息
   */
  async getActivities(uid: number): Promise<Activities> {
    const server = this._getServer(uid)
    const data = await this.request('get', 'activities', {
      role_id: uid,
      server,
    })
    if (data.retcode !== 0 || !data.data) {
      throw { code: data.retcode, message: data.message }
    } else {
      return data.data
    }
  }

  /**
   * @function getCurrentAbyss
   */
  async getCurrentAbyss(uid: number, noCache?: boolean): Promise<Abyss> {
    return this.getSpiralAbyss(uid, 1, noCache)
  }

  /**
   * @function getPreviousAbyss
   */
  async getPreviousAbyss(uid: number, noCache?: boolean): Promise<Abyss> {
    return this.getSpiralAbyss(uid, 2, noCache)
  }

  /**
   * @function getDailyNote
   * @param {Number} uid
   * @returns {Promise<DailyNote>}
   */
  async getDailyNote(uid: number, noCache = false): Promise<DailyNote> {
    const temp = this._cache?.[uid]?.dailyNote
    if (temp && !noCache) {
      return temp
    }

    const server = this._getServer(uid)

    const data = await this.request('get', 'dailyNote', {
      role_id: uid,
      server,
    })
    if (data.retcode !== 0 || !data.data) {
      throw {
        code: data.retcode,
        message: data.message,
      }
    }
    this._cache[uid] = {
      ...this._cache[uid],
      dailyNote: data.data,
    }
    return data.data
  }
}
