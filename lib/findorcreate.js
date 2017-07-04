'use strict'

const defaultOptions = {

  /*
    If a field in the existing doc is an array, we can overwrite it (false) or
    merely append to it (true)
  */
  appendToArray: false,

  /*
    You can pass parameters to save() using this object
  */
  saveOptions: {},

  /*
    This param allows you to only save the additionalFields if the document is
    new, effectively not doing any update.

    This is useful if you need to check if a document exists and assign it a new
    value for a different field only if it is not already there.
  */
  saveIfFound: true

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

    this.findOne(query).exec((err, result) => {
      if (err) return callback(err, result, false, false)
      if (result && !additionalFields) return callback(err, result, false, false)

      const creating = result ? false : true
      const doc = creating ? new (this)(sanitizeMongoKeys(query)) : result

      if (!creating && !options.saveIfFound) return callback(err, doc, false, creating)

      if (additionalFields) {
        for (const field in additionalFields) {
          if (Array.isArray(doc[field]) && options.appendToArray) {
            doc.set(field, doc[field].concat(additionalFields[field]))
            continue
          }

          doc.set(field, additionalFields[field])
        }
      }

      if (!doc.isModified() && !creating) return callback(err, doc, false, creating)

      doc.save(options.saveOptions, err => callback(err, doc, true, creating))
    })
  }
}
