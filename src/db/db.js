import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';
import express from 'express';
import { stringify } from 'flatted';

const app = express();


const connectDB = async() => {
    try{
       const connectionInstance = await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
       console.log("MongoDB connected successfully")
       console.log("Connection Instance: ", connectionInstance.connection.host)
       /*app.on("error", (error) => {
           console.log("Error connecting to the database: ", error);
           throw error
       });
       app.listen(process.env.PORT, () => {
           console.log(`App is listening on port ${process.env.PORT}`)
       }) 
    */
    }
    catch(error) {
        console.log("MONGODB connection ERROR: ", error)
        process.exit(1)
        throw error
    }
}

export default connectDB