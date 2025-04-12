import ApiError from "../utils/ApiError.js"
import asyncHandler from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token) {
            throw new ApiError("No token provided", 401)
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user) {
            // NEXT_VIDEO : discuss about frontend
            throw new ApiError("User not found", 404)
        }
    
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(error?.message || "Invalid access token", 401)
    }
})