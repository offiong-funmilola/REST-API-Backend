const {validationResult} = require('express-validator')
const fs = require('fs')
const path = require('path')
const Post = require('../models/post')
const User = require('../models/user')
const io = require('../socket')


exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2
    let totalItems;
    try {
       const totalCount = await  Post.find().countDocuments() 
       totalItems = totalCount
       const posts = await Post.find()
       .populate('creator')
       .sort({createdAt: -1})
       .skip((currentPage - 1) * perPage)
       .limit(perPage)
       if(!posts){
        const error = new Error('There are no posts')
        error.statusCode = 422
        throw error
        }
        res.status(200).json({message: 'Posts retrieval successful', posts: posts, totalItems: totalItems })   
    }
    catch(err) {
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    } 
    // Post.find().countDocuments()
    // .then(totalCount => {
    //     totalItems = totalCount
    //     return Post.find()
     //         .populate('creator') //This is trying to get access to the user collection since the creator field is a ref to the user collection from the post collection
    //         .skip((currentPage - 1) * perPage)
    //         .limit(perPage)
    // })
    // .then(posts => {
    //     if(!posts){
    //         const error = new Error('There are no posts')
    //         error.statusCode = 422
    //         throw error
    //     }
    //     res.status(200).json({message: 'Posts retrieval successful', posts: posts, totalItems: totalItems })
    // })
    // .catch(err => {
    //     if(!err.statusCode){
    //         err.statusCode = 500
    //     }
    //     next(err)
    // }) 
}

exports.createPost = async(req, res, next) => {
    const errors = validationResult(req)
    //using the general error handling to handle error, the next method is not use here because this is an synchronous environment
    if(!errors.isEmpty()){
        const error = new Error ('Validation failed')
            error.statusCode = 422
            throw error
    }
    if(!req.file){
        const error = new Error ('Image upload failed')
            error.statusCode = 422
            throw error 
    }
    const imageUrl = req.file.path
    const title = req.body.title;
    const content = req.body.content;
    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId // the value for the creator is a string, however mongoose will convert the string to objectId 
    })
    try {
        const result = await post.save()
        if (result) {
            let user = await User.findById(req.userId)
            if(!user){
                const error = new Error ('user not found')
                error.statusCode = 404 
                throw error 
            }
            user.post.push(post) // is better I write posts because it is an array of postId's created by a particular user. Although we sent the entire post to the array mongoose extract the postId which is needed data
            await user.save()
            io.getIo().emit('posts', {action: 'create', post:post})
            res.status(201).json({
                message: "Post created successfully",
                post: post,
                creator: {id: user._id.toString(), name: user.name}
            })
        }        
    }
    catch(err) {
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    }    
    // post.save()
    // .then(result => {
    //     return User.findById(req.userId)
    // })
    // .then(user => {
    //     if(!user){
    //         const error = new Error ('user not found')
    //         error.statusCode = 404 
    //         throw error 
    //     }
    //     creator = user
    //     user.post.push(post) // is better I write posts because it is an array of postId's created by a particular user. Although we sent the entire post to the array mongoose extract the postId which is needed data
    //     return user.save()
    // })
    // .then(result => {
    //     res.status(201).json({
    //         message: "Post created successfully",
    //         post: post,
    //         creator: {id: creator._id.toString(), name: creator.name}
    //     })
    // })
    // .catch(err => {
    //     if(!err.statusCode){
    //         err.statusCode = 500
    //     }
    //     next(err)
    // })    
  
}

exports.getPost = async (req, res, next) => {
    const postId = req.params.postId
    try{
        const post = await Post.findById(postId)
        if(!post){
            const error = new Error('There is no post identified')
            error.statusCode = 404
            throw error
        } 
        res.status(200).json({message: 'Post successfully retrieved', post: post})
    }
    catch (err) {
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    }

    // .then(post => {
    //     if(!post){
    //         const error = new Error('There is no post identified')
    //         error.statusCode = 404
    //         throw error
    //     }
    //     res.status(200).json({message: 'Post successfully retrieved', post: post})
    // })
    // .catch(err => {
    //     if(!err.statusCode){
    //         err.statusCode = 500
    //     }
    //     next(err)
    //   
    // })
}

exports.updatePost = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        const error = new Error ('Validation failed')
        error.statusCode = 422
        throw error
    }
    const postId = req.params.postId
    const title = req.body.title
    const content = req.body.content
    let imageUrl = req.body.image
    //if a new image was selected in the course of editing
    if(req.file){
        imageUrl = req.file.path
    }
    if(!imageUrl){
        const error = new Error('Image is not selected')
        error.statusCode = 422
        throw error
    }
    try {
        const post = await Post.findById(postId)
        if(!post){
            const error = new Error('No Post is identified')
            error.statusCode = 404
            throw error 
        }
        if(post.creator.toString() !== req.userId){
            const error = new Error('UnAuthorized for this action')
            error.statusCode = 403
            throw error
        }
        if(imageUrl !== post.imageUrl){
            clearImage(post.imageUrl)
        }
        post.title = title
        post.content = content
        post.imageUrl = imageUrl
        const updatedPost = await post.save()
        io.getIo.emit('posts', {action: 'update', post: updatedPost})
        res.status(200).json({message: 'Post updated', post: updatedPost})
    }
    catch(err){
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    }
    // Post.findById(postId)
    // .then(post => {
    //     if(!post){
    //         const error = new Error('No Post is identified')
    //         error.statusCode = 404
    //         throw error 
    //     }
    //     if(post.creator.toString() !== req.userId){
    //         const error = new Error('UnAuthorized for this action')
    //         error.statusCode = 403
    //         throw error
    //     }
    //     if(imageUrl !== post.imageUrl){
    //         clearImage(post.imageUrl)
    //     }
    //     post.title = title
    //     post.content = content
    //     post.imageUrl = imageUrl
    //     return post.save()
    // })
    // .then(result => {
    //     res.status(200).json({message: 'Post updated', post: result})
    // })
    // .catch(err => {
    //     if(!err.statusCode){
    //         err.statusCode = 500
    //     }
    //     next(err)
    // })
}

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId
    //console.log(postId)
    try {
        const post = await Post.findById(postId)
        if(!post){
            const error = new Error('No Post is identified')
            error.statusCode = 422
            throw error 
        }
        if(post.creator.toString() !== req.userId){
            const error = new Error('UnAuthorized for this action')
            error.statusCode = 403
            throw error
        }
        //I have to look at the imagepath, as the arguement passed to the clear image, it is undefined
        clearImage(post.imageUrl)
        //delete the particular post from the Post collection
        const response = await Post.findByIdAndDelete(postId)
        //removing the deleted post from the post array ref in the user collection
        const user = await User.findById(req.userId)
        if(!user){
            const error = new Error('User not found')
            error.statusCode = 404
            throw error
        }
        //console.log(user.post)
        user.post.pull(postId)
        await user.save()
        io.getIo().emit('posts', {action: 'delete', post: postId})
       res.status(200).json({message:'Delete successful'})

    }
    catch(err){
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    }
    // .then(post => {
    //     if(!post){
    //         const error = new Error('No Post is identified')
    //         error.statusCode = 422
    //         throw error 
    //     }
    //     if(post.creator.toString() !== req.userId){
    //         const error = new Error('UnAuthorized for this action')
    //         error.statusCode = 403
    //         throw error
    //     }
    //     //check if the user is the creator of the post before we delete
    //     clearImage(post.imageUrl)
    //     return Post.findByIdAndDelete(postId)
    // })
    // .then(result => { 
    //     //removing the deleted post from the user ref
    //     return User.findById(req.userId)
    // })
    // .then(user => {
    //     if(!user){
    //         const error = new Error('User not found')
    //         error.statusCode = 404
    //         throw error
    //     }
    //     return user.post.pull(postId)
    // }) 
    // .then(result => {
    //     res.status(200).json({message:'Delete successful'})
    // })       
    // .catch(err => {
    //     if(!err.statusCode){
    //         err.statusCode = 500
    //     }
    //     next(err)
    // })
}


const clearImage = (imagePath) => {
    const filePath = path.join(__dirname, '..', imagePath)
    fs.unlink(filePath, err => console.log(err))
}

