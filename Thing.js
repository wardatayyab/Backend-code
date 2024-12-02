const mongoose = require('mongoose');

const techSchema = new mongoose.Schema({
    title:String,
    price:String,
    description:String,
    category:String,
    image:String,
    soldOut: { type: Boolean, default: false }
})

module.exports =  mongoose.model("products",techSchema)