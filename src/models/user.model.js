import mongoose, {Schema} from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const userSchema = new Schema(
    {
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index:true
    },
    avatar: {
        type: String, //cloudinary url
        required: true
    }, 
    coverImage: {
        type: String, //cloudinary url
    }, 
    watchHistory: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
    },
    regreshToken: {
        type: String,
    }
}, {timestamps: true})

userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) {
        return next()
    }

    this.password = bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function() {
    jwt.sign()
}

userSchema.methods.generateRefreshToken = function() {

}

export const User = mongoose.model('User', userSchema);