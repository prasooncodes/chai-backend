import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //save refresh token in db
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return { accessToken, refreshToken }
    }
    catch (error) {
        throw new ApiError("Error generating refresh and access tokens", 500)
    }
} 

const registerUser = asyncHandler( async (req, res) => {
    
    //get user details from frontend
    const {fullname, email, username, password}= req.body
    console.log("email", email);

    // validation - not empty
    if(
        [fullname, email, username, password].some((field) => !field)
    )
    {
        throw new ApiError("All fields are required", 400)
    }

    //check if user already exists: username, email
    const existedUser = await User.findOne({
        $or: [
            {username: username},
            {email: email}
        ]
    })

    if(existedUser) {
        throw new ApiError("User already exists", 409)
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files["avatar"]?.[0].path;
    //const coverImageLocalPath = req.files["coverImage"][0].path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files["coverImage"][0].path;
    }

    if(!avatarLocalPath) {
        throw new ApiError("Avatar is required", 400)
    }

    //upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath, "avatar")


    let coverImage = null;
    if (coverImageLocalPath) {
    coverImage = await uploadOnCloudinary(coverImageLocalPath, "coverImage");
    if (!coverImage) {
        throw new ApiError("Error uploading cover image", 500);
    }
}

    if(!avatar) {
        throw new ApiError("Error uploading images", 500)
    }

    //create user object - create entry in db
    const user = await User.create({
        fullname,
        email,
        username : username.toLowerCase(),
        password,
        avatar: avatar.secure_url,
        coverImage: coverImage?.secure_url || ""
    })

    // check for user creation and remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser) {
        throw new ApiError("Error creating user", 500)
    }

    // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully")
    );


} )

const loginUser = asyncHandler( async (req, res) => {

    //get user details from frontend
    const {email, username, password} = req.body
    console.log("email", email);
    
    //username or email
    if(!(username || !email)) {
        throw new ApiError("Username or email is required", 400)
    }

    //find the user
    const user = await User.findOne({
          $or: [{username}, {email}]
    })

    if(!user) {
        throw new ApiError("User not found", 404)
    }

    //password check
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError("Invalid password", 401)
    }

    //generate access token and refresh token
    const {refreshToken, accessToken} = await generateAccessAndRefreshTokens(user._id) 


    //send cookie
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )
})     

const logoutUser = asyncHandler(async(req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $unset: { refreshToken: 1 }
        },
        {
            new: true
        });
    
        const options = {
            httpOnly: true,
            secure: true,
        };
    
        return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiResponse(200, {}, "User logged out successfully"));
    } catch (error) {
        throw new ApiError("Error logging out user", 500);
    }
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(incomingRefreshToken) {
        throw new ApiError("Unauthorized request", 401)
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET
        )
    
        const user = User.findById(decodedToken?.id)
    
        if(!user) {
            throw new ApiError(401, "Invalied refresh token")
        }
    
        if(incomingRefreshToken != user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        const {accessToken, newRefreshToken} =  await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .ccokie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                accessToken, refreshToken : newRefreshToken
            },
            "Access token refreshed successfully"
        )
        )
    } 
    catch (error) {
        throw new ApiError(error?.message , 401 || "Invalid refresh token")
        
    }


})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword)

    if(!isPasswordCorrect) {
        throw new ApiError("Invalid current password", 401)
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(200, req.user, "User fetched successfully")
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email} = req.body

    if(!fullname || !email) {
        throw new ApiError("All fields are required", 400)
    }

    const user = User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullname, 
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) {
        throw new ApiError("Avatar is required", 400)
    }

    //upload it to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url) {
        throw new ApiError("Error uploading avatar", 500)
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            avatar: avatar.url
        }
    },
    {
        new: true
    }).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Image updated successfully"))

})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath) {
        throw new ApiError("Cover Image is required", 400)
    }

    //upload it to cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url) {
        throw new ApiError("Error uploading avatar", 500)
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {
            coverImage: coverImage.url
        }
    },
    {
        new: true
    }).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"))

})

export { 
    registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}