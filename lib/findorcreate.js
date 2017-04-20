'use strict'

// I know about the deprecation of defer as outlined here:
// https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/Promise.jsm/Deferred#backwards_forwards_compatible
// but the proper way as done in https://github.com/Automattic/mongoose/blob/67c465aac5c864c3004d11d49934605037c8f520/lib/query.js#L2226
// would involve more changes to the code. As a first attempt, less changes is better I think. The proper way would
// yield the same results, so it's safe to refactor later.
function Deferred() {
  /* A method to resolve the associated Promise with the value passed.
   * If the promise is already settled it does nothing.
   *
   * @param {anything} value : This value is used to resolve the promise
   * If the value is a Promise then the associated promise assumes the state
   * of Promise passed as value.
   */
  this.resolve = null;

  /* A method to reject the associated Promise with the value passed.
   * If the promise is already settled it does nothing.
   *
   * @param {anything} reason: The reason for the rejection of the Promise.
   * Generally its an Error object. If however a Promise is passed, then the Promise
   * itself will be the reason for rejection no matter the state of the Promise.
   */
  this.reject = null;

  /* A newly created Promise object.
   * Initially in pending state.
   */
  this.promise = new Promise(function(resolve, reject) {
    this.resolve = resolve;
    this.reject = reject;
  }.bind(this));
  Object.freeze(this);
}

const defaultOptions = {

  /*
    If a field in the existing doc is an array, we can overwrite it (false) or
    merely append to it (true)
  */
  appendToArray: false,

  /*
    You can pass parameters to save() using this object
  */
  saveOptions: {}

}

function isObject(testMe) {
  if (testMe === null || typeof testMe === 'undefined') return false;
  return Object.getPrototypeOf(testMe) === Object.getPrototypeOf({});
}

function sanitizeMongoKeys(query) {
  if (Array.isArray(query)) return query
  if ([ 'string', 'number' ].indexOf(typeof query) > -1) return query
  if (query instanceof Date) return query

  const cleanQuery = {}

  for (const key in query) {
    if (key[0] === '$') continue

    const cleanParam = sanitizeMongoKeys(query[key])

    if (isObject(cleanParam) && Object.keys(cleanParam).length < 1) continue

    cleanQuery[key] = query[key]
  }

  return cleanQuery
}

module.exports = function(schema, modelOptions) {
  schema.statics.findOrCreate = function findOrCreate(query, additionalFields, contextOptions, callback) {
    // In the case of findOrCreate(query, callback)
    if (typeof additionalFields === 'function') {
      callback = additionalFields
      additionalFields = undefined
    }

    // In the case of findOrCreate(query, additionalFields, callback)
    if (typeof contextOptions === 'function') {
      callback = contextOptions
      contextOptions = undefined
    }

    const options = Object.assign({}, defaultOptions, modelOptions, contextOptions)

    var deferred;
    if (!callback) {
      deferred = new Deferred()
      callback = function(err, result, wasUpdated, isNew) {
        if (err) {
          deferred.reject(err)
        } else {
          if (options.status) {
            result = {
              result: result,
              wasUpdated: wasUpdated,
              isNew: isNew
            }
          }
          deferred.resolve(result)
        }
      }
    }

    this.findOne(query).exec((err, result) => {
      if (err) return callback(err, result, false, false)
      if (result && !additionalFields) return callback(err, result, false, false)

      const creating = result ? true : false
      const doc = creating ? result : new (this)(sanitizeMongoKeys(query))

      if (additionalFields) {
        for (const field in additionalFields) {
          if (Array.isArray(doc[field]) && options.appendToArray) {
            doc.set(field, doc[field].concat(additionalFields[field]))
            continue
          }

          doc.set(field, additionalFields[field])
        }
      }

      if (!doc.isModified()) return callback(err, doc, false, !creating)

      doc.save(options.saveOptions, err => callback(err, doc, true, !creating))
    })

    return deferred ? deferred.promise : undefined
  }
}
