'use strict'

if (!process.env.MONGOOSE_TEST_URI) require('dotenv').load()

const expect = require('chai').expect
const mongoose = require('mongoose')
const findOrCreate = require('../index')

const Schema = mongoose.Schema

const ServeSchema = new Schema({
  idea: { type: String }
})

const FruitSchema = new Schema({
  name: { type: String },
  color: { type: String },
  tags: [],
  servingIdeas: [ServeSchema],
  slug: { type: String }
})

FruitSchema.path('slug').validate(value => {
  if (!value) return true
  if (value.length < 10) return true

  return false
}, 'Slug is too long')

FruitSchema.plugin(findOrCreate)

const Fruit = mongoose.model('Fruit', FruitSchema)

mongoose.connect(process.env.MONGOOSE_TEST_URI)

mongoose.connection.on('error', error => {
  console.error(`Error with the Mongo connection:`, error)
  process.exit(1)
})

describe('#findOrCreate()', () => {
  let grapefruitId = null

  before(done => {
    const grapefruit = new Fruit({
      name: 'Grapefruit',
      color: 'pink',
      tags: [ 'citrus' ],
      servingIdeas: [ { idea: 'Breakfast' } ]
    })

    grapefruitId = grapefruit._id
    grapefruit.save(err => done())
  })

  it('the static method findOrCreate is added to models', () => {
    expect(typeof Fruit.findOrCreate).to.equal('function')
  })

  it('creates a new record when just the query is provided', done => {

    Fruit.findOrCreate({ name: 'Apple', color: 'red' }, (err, result, wasUpdated, isNew) => {
      expect(err).to.equal(null)

      expect(result.name).to.equal('Apple')
      expect(result.color).to.equal('red')

      expect(isNew).to.be.true
      expect(wasUpdated).to.be.true

      done()
    })

  })

  it('avoids trying to set mongo query keywords as fields', done => {

    Fruit.findOrCreate({ name: 'Watermelon', color: { $exists: true } }, (err, result) => {
      expect(err).to.equal(null)

      expect(result.name).to.equal('Watermelon')

      done()
    })

  })

  it('finds an existing record when just the query is provided', done => {

    Fruit.findOrCreate({ name: 'Grapefruit' }, (err, result, wasUpdated, isNew) => {
      expect(err).to.equal(null)

      expect(result.name).to.equal('Grapefruit')

      expect(isNew).to.be.false
      expect(wasUpdated).to.be.false

      expect(result._id.toString()).to.equal(grapefruitId.toString())

      done()
    })

  })

  it('appends an existing record', done => {

    Fruit.findOrCreate({ name: 'Grapefruit' }, { color: 'ruby' }, (err, result, wasUpdated, isNew) => {
      expect(err).to.equal(null)

      expect(result.name).to.equal('Grapefruit')
      expect(result.color).to.equal('ruby')

      expect(isNew).to.be.false
      expect(wasUpdated).to.be.true

      expect(result._id.toString()).to.equal(grapefruitId.toString())

      done()
    })

  })

  it('doesn\'t perform a save if not required', done => {

    Fruit.findOrCreate({ name: 'Grapefruit' }, { color: 'ruby' }, (err, result, wasUpdated, isNew) => {
      expect(err).to.equal(null)

      expect(isNew).to.be.false
      expect(wasUpdated).to.be.false

      done()
    })

  })

  it('appends to an existing array if appendToArray is true', done => {

    Fruit.findOrCreate(
      { name: 'Grapefruit' },
      { tags: [ 'nutricious' ], servingIdeas: [ { idea: 'Fruit salad' } ] },
      { appendToArray: true },

      (err, result) => {
        expect(err).to.equal(null)

        expect(result.tags.indexOf('citrus') > -1).to.equal(true)
        expect(result.tags.indexOf('nutricious') > -1).to.equal(true)

        expect(result.servingIdeas[0].idea).to.equal('Breakfast')
        expect(result.servingIdeas[1].idea).to.equal('Fruit salad')

        expect(result._id.toString()).to.equal(grapefruitId.toString())

        done()
    })

  })

  it('replaces an existing array if appendToArray is false', done => {

    Fruit.findOrCreate(
      { name: 'Grapefruit' },
      { tags: [ 'delicious' ], servingIdeas: [ { idea: 'G&T Garnish' } ] },
      { appendToArray: false },

      (err, result) => {
        expect(err).to.equal(null)

        expect(result.tags.indexOf('citrus') > -1).to.equal(false)
        expect(result.tags.indexOf('delicious') > -1).to.equal(true)

        expect(result.servingIdeas[0].idea).to.equal('G&T Garnish')
        expect(result.servingIdeas[1]).to.equal(undefined)

        expect(result._id.toString()).to.equal(grapefruitId.toString())

        done()
    })

  })

  it('passes on any settings (like validateBeforeSave) to the save() method', done => {

    Fruit.findOrCreate(
      { name: 'Pear', slug: 'my-super-long-pear-slug' },
      {},
      { saveOptions: { validateBeforeSave: false } },

      (err, result) => {
        expect(err).to.equal(null)

        expect(result.name).to.equal('Pear')
        expect(result.slug).to.equal('my-super-long-pear-slug')

        done()
    })

  })

  it('does not save to an existing doc if saveIfFound is false', done => {

    Fruit.findOrCreate(
      { name: 'Grapefruit' },
      { color: 'salmon' },
      { saveIfFound: false },

      (err, result) => {
        expect(err).to.equal(null)

        expect(result.name).to.equal('Grapefruit')
        expect(result.color).not.to.equal('salmon')

        done()
    })

  })

})

after(done => {
  mongoose.connection.db.dropDatabase()
  done()
})
