const {validationResult} = require('express-validator')
const User = require('../models/user')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

exports.createUser = (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        const error = new Error('Validation Failed')
        error.statusCode = 422
        error.data = errors.array()
        throw error
    }
    const email = req.body.email
    const password = req.body.password
    const name = req.body.name
    bcrypt.hash(password, 12)
    .then(hashedPassword => {
        const user = new User({email: email, password: hashedPassword, name: name})
        return user.save()
    })
    .then(result => {
        res.status(201).json({message: "User created successfully", userId: result._id})
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    })
}
exports.loginUser = (req, res, next) => {
    let confirmedUser;
    const email = req.body.email
    const password = req.body.password
    User.findOne({email: email})
    .then(user => {
        if(!user){
            const error = new Error('User not found')
            err.statusCode = 401
            throw error
        }
        confirmedUser = user
        return bcrypt.compare(password, user.password)
    })
    .then(isEqual => {
        if(!isEqual){
            const error = new Error('Login data is invalid')
            err.statusCode = 401
            throw error
        }
        const token = jwt.sign(
            {email: email, userId: confirmedUser._id.toString()},
            'secretofconfirmeduserusedsecretquestion', {expiresIn: '1h'}
            )
            res.status(200).json({message: 'Logged in successfully', token: token, userId: confirmedUser._id.toString()})
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
    })
}

exports.getStatus = (req, res, next) => {
        User.findById(req.userId)
        .then(user => {
        if(!user){
            const error = new Error('User not found')
            error.statusCode = 404
            throw error
        }
        res.status(200).json({message: 'user status retrieved', status: user.status})
       
    })
     .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
     })
}

exports.updateStatus = (req, res, next) => {
    const userStatus = req.body.status
        User.findById(req.userId)
        .then(user => {
        if(!user){
            const error = new Error('User not found')
            error.statusCode = 404
            throw error
        }
        user.status = userStatus   
        return user.save()
    })
    .then(result => {
        res.status(200).json({message: 'Status updated'})
    })
     .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500
        }
        next(err)
     })
}
