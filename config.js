const mongoose = require('mongoose')

const connectDB = async() =>{
      try{
        await mongoose.connect('mongodb://localhost:27017/Myweb',{
            
        })
        console.log("Mongodb Connected Successful")
      }
      catch(error){
        console.log("Mongodb show error:",error)
        process.exit(1)
      }
}
module.exports = connectDB