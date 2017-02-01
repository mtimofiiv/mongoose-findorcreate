# mongoose-findorcreate ![Travis](https://img.shields.io/travis/mtimofiiv/mongoose-findorcreate.svg)

A plugin for Mongoose which adds the findOrCreate method to models. The method will either append an existing object or save a new one, depending on wether it finds it or not.

There is already a [`mongoose-findorcreate` plugin](https://github.com/drudge/mongoose-findorcreate), but it has not been maintained, and the author does not respond to issues or PRs.

This is why this package is called `mongoose-find-or-create`

## Usage

When you create a schema, simply add this plugin like so:

```js
const findOrCreate = require('mongoose-find-or-create')

const MySchema = new mongoose.Schema({
  name: { type: String },
  slug: { type: String }
})
MySchema.plugin(findOrCreate)

const MyModel = mongoose.model('Fruit', FruitSchema)

MyModel.findOrCreate({ name: 'Mike' }, (err, result) => {
  // my new or existing model is loaded as result
})

// To search by one set of criteria and to save another set, simply use a second object:
MyModel.findOrCreate({ name: 'Mike' }, { slug: 'mike' }, (err, result) => {
  // my new or existing model is loaded as result
})

```

## Options

You can pass an `options` object when adding the plugin to a schema or directly when using the method:

```js
// Like so...
MySchema.plugin(findOrCreate, { appendToArray: true })

// And/or like so:
MyModel.findOrCreate({ name: 'Mike' }, { slug: 'mike' }, { appendToArray: true }, (err, result) => {
  // my new or existing model is loaded as result
})
```

The only option for the moment is `appendToArray`. If this is set to `true`, then if your field is an array, including a subdocument, your additional information will be appended rather than overwriting the currently existing value.

## Testing

```
npm run test
```

## Contributing

PRs and issues are greatly appreciated, so please go ahead!
