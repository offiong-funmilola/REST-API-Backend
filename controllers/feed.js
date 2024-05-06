const {validationResult} = require('express-validator')
const fs = require('fs')
const path = require('path')
const Post = require('../models/post')
const User = require('../models/user')


exports.getPosts = (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2
    let totalItems;
    Post.find().countDocuments()
    .then(totalCount => {
        totalItems = totalCount
        return Post.find()
            .skip((currentPage - 1) * perPage)
            .limit(perPage)
    })
    .then(posts => {
        if(!posts){
            const error = new Error('There are no posts')
            error.statusCode = 422
            throw error
        }
        res.status(200).json({message: 'Posts retrieval successful', posts: posts, totalItems: totalItems })
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    }) 
}

exports.createPost = (req, res, next) => {
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
    let creator
    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId
    })
    post.save()
    .then(result => {
        return User.findById(req.userId)
    })
    .then(user => {
        if(!user){
            const error = new Error ('user not found')
            error.statusCode = 401
            throw error 
        }
        creator = user
        user.post.push(post)
        return user.save()
    })
    .then(result => {
        res.status(201).json({
            message: "Post created successfully",
            post: post,
            creator: {id: creator._id.toString(), name: creator.name}
        })
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    })    
   
}

exports.getPost = (req, res, next) => {
    const postId = req.params.postId
    Post.findById(postId)
    .then(post => {
        if(!post){
            const error = new Error('There is no post identified')
            error.statusCode = 404
            throw error
        }
        res.status(200).json({message: 'Post successfully retrieved', post: post})
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
        //console.log(err)
    })
}

exports.updatePost = (req, res, next) => {
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
    Post.findById(postId)
    .then(post => {
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
        if(imageUrl !== post.imageUrl){
            clearImage(post.imageUrl)
        }
        post.title = title
        post.content = content
        post.imageUrl = imageUrl
        return post.save()
    })
    .then(result => {
        res.status(200).json({message: 'Post updated', post: result})
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    })
}

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId
    Post.findById(postId)
    .then(post => {
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
        //check if the user is the creator of the post before we delete
        clearImage(post.imageUrl)
        return Post.findByIdAndDelete(postId)
    })
    .then(result => { 
        //removing the deleted post from the user ref
        return User.findById(req.userId)
    })
    .then(user => {
        if(!user){
            const error = new Error('User not found')
            error.statusCode = 404
            throw error
        }
        return user.post.pull(postId)
    }) 
    .then(result => {
        res.status(200).json({message:'Delete successful'})
    })       
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    })
}

const clearImage = (imagePath) => {
    const filePath = path.join(__dirname, '..', imagePath)
    fs.unlink(filePath, err => console.log(err))
}

