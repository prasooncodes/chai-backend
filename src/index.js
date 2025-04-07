//require('dotenv').config({path: './.env'});
import dotenv from 'dotenv';

import mongoose from 'mongoose';
import connectDB from './db/db.js';

dotenv.config({path: './.env'});

connectDB()
.then(() => {
    app.on("error", (error) => {
        console.log("Error connecting to the database: ", error);
        throw error
    });

    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT || 8000}`); 
    });
}
)

.catch((err) => {
    console.log("Error connecting to the database: ", err);
    throw err;
});







/*import express from 'express';
const app = express();

(async () => {
    try{
mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
app.on("error", (error) => {
    console.log("Error connecting to the database: ", error);
    throw error
});

app.listen(process.env.PORT, () => {
    console.log(`App is listening on port ${process.env.PORT}`)
})
    }
    catch(error) {
        console.log("ERROR: ", error)
        throw error
    }
})()

*/