'use strict'

const expect = require('chai').expect
const mongoose = require('mongoose')
const findOrCreate = require('../index')

const Schema = mongoose.Schema

const Fruit = new Schema({

  name: { type: String },
  color: { type: String }

})

//Fruit.plugin(findOrCreate)
mongoose.model('Fruit', Fruit)
