import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';
import express from 'express';
import { stringify } from 'flatted'; // Add this import at the top

const app = express();

const connectDB = async() => {
    try{
       const connectionInstance = await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
       console.log("MongoDB connected successfully")
       
       // Change this line:
       console.log("Connection Instance: ", connectionInstance.connection.host)
       
       // To this (if you need to log more than just the host):
       // console.log("Connection Instance: ", stringify(connectionInstance))
       
       // Or better yet, just log specific properties:
       console.log("Connection Host: ", connectionInstance.connection.host)
    }
    catch(error) {
        console.log("MONGODB connection ERROR: ", error)
        process.exit(1)
        throw error
    }
}

export default connectDB