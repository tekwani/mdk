'use strict'

/**
 * Comments live on the persisted device record (`comments` array). The
 * storage collaborators are injected — wire them to a
 * DeviceProvisioningService (loadThing/saveThing/checkThingExists/generateId).
 *
 * Author identity: each method takes `(req, ctx)`. `ctx.user` is the
 * authenticated identity supplied by the transport (gateway session /
 * envelope requester) and always wins; a `req.user` that disagrees with it is
 * rejected. Without `ctx.user` the service falls back to `req.user` — unless
 * `requireAuthenticatedUser: true`, in which case the call is refused. Either
 * way a user is mandatory, and only the comment's author may edit or delete
 * it (comments stored without an author are not editable by anyone).
 */
class CommentsService {
  constructor ({ loadThing, saveThing, checkThingExists, generateId, requireAuthenticatedUser = false }) {
    this.loadThing = loadThing
    this.saveThing = saveThing
    this.checkThingExists = checkThingExists
    this.generateId = generateId
    this.requireAuthenticatedUser = requireAuthenticatedUser
  }

  _resolveUser (req, ctx = {}) {
    const authUser = ctx && ctx.user
    if (authUser !== undefined && authUser !== null) {
      if (typeof authUser !== 'string' || !authUser) throw new Error('ERR_COMMENT_USER_INVALID')
      if (req.user !== undefined && req.user !== null && req.user !== authUser) {
        throw new Error('ERR_COMMENT_USER_MISMATCH')
      }
      return authUser
    }
    if (this.requireAuthenticatedUser) throw new Error('ERR_COMMENT_USER_UNAUTHENTICATED')
    if (typeof req.user !== 'string' || !req.user) throw new Error('ERR_COMMENT_USER_REQUIRED')
    return req.user
  }

  _findCommentIndex (thg, req) {
    if (req.id) {
      return thg.comments.findIndex(c => c.id === req.id)
    }
    if (req.ts) {
      return thg.comments.findIndex(c => c.ts === req.ts)
    }
    return -1
  }

  _checkCommentPermission (thg, commentIndex, user) {
    const owner = thg.comments[commentIndex].user
    if (typeof owner !== 'string' || !owner || owner !== user) {
      throw new Error('ERR_COMMENT_ACCESS_DENIED')
    }
  }

  async saveThingComment (req, ctx) {
    const user = this._resolveUser(req, ctx)
    this.checkThingExists(req)

    const thg = await this.loadThing(req)

    if (!Array.isArray(thg.comments)) thg.comments = []

    thg.comments.push({
      id: this.generateId(),
      ts: Date.now(),
      comment: req.comment,
      user,
      ...(req.pos ? { pos: req.pos } : {})
    })

    await this.saveThing(thg)

    return 1
  }

  async editThingComment (req, ctx) {
    const user = this._resolveUser(req, ctx)
    this.checkThingExists(req)

    const thg = await this.loadThing(req)

    if (!Array.isArray(thg.comments)) throw new Error('ERR_THING_COMMENTS_NOTFOUND')

    const commentIndex = this._findCommentIndex(thg, req)
    if (commentIndex === -1) throw new Error('ERR_THING_COMMENT_NOTFOUND')

    this._checkCommentPermission(thg, commentIndex, user)

    thg.comments[commentIndex].comment = req.comment

    await this.saveThing(thg)

    return 1
  }

  async deleteThingComment (req, ctx) {
    const user = this._resolveUser(req, ctx)
    this.checkThingExists(req)

    const thg = await this.loadThing(req)

    if (!Array.isArray(thg.comments)) throw new Error('ERR_THING_COMMENTS_NOTFOUND')

    const commentIndex = this._findCommentIndex(thg, req)
    if (commentIndex === -1) throw new Error('ERR_THING_COMMENT_NOTFOUND')

    this._checkCommentPermission(thg, commentIndex, user)

    thg.comments.splice(commentIndex, 1)

    await this.saveThing(thg)

    return 1
  }
}

module.exports = CommentsService
