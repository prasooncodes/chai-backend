import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    
    //username or email
    if(!username || !email) {
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
    const loggedInUser = User.findById(user._id).select("-password -refreshToken")
    
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
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined
        }
    },
    {
        new: true
    })

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})

export { 
    registerUser, 
    loginUser,
    logoutUser
 }