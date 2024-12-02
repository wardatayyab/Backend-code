// const mongoose = require(mongoose)
// mongoose.connect('mongodb://localhost:27017/Myweb')
const mongoose = require('mongoose')

const techSchema = new mongoose.Schema({
    title:String,
    description:String,
    price:String,
    category:String,
    image:String,
    soldOut: { type: Boolean, default: false }
})
module.exports = new mongoose.model("products",techSchema)