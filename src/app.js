import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

//For middlewares and configurations
//This enables Cross-Origin Resource Sharing (CORS) in your Express.js app. It controls which frontend domains can send requests to your backend API.
app.use(cors({
    origin: process.env.CORS_ORIGIN, // allow requests from this origin
    credentials: true, // allow credentials (cookies) to be sent

}))

app.use(express.json({limit: '16kb'})); 
app.use(express.urlencoded({limit: '16kb', extended: true})); // parse URL-encoded bodies (as sent by HTML forms)
app.use(express.static('public')); // serve static files from the 'public' directory
app.use(cookieParser()); // parse cookies from the request headers
export default app; 