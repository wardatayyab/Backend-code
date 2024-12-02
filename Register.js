const mongoose= require("mongoose")
mongoose.connect("mongodb://localhost:27017/Myweb")
const userSchema = new mongoose.Schema({
  name: String,
  email:String,
  password: String
 
})
module.exports = new mongoose.model("registers",userSchema)