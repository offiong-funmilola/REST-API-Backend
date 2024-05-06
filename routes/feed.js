const express = require('express')
const router = express.Router()
const {body} = require('express-validator')
const feedController = require('../controllers/feed')
const isAuth = require('../authenticate/isAuth')

//if the route is originally '/feed/post', and we have other routes starting with /feed, 
//we can decide to filter the route at the app.js(root file), so that we do not have to repeat '/feed/' here
//originally router.get('/feed/post', feedController.getPosts) but because we will add filter it is done this way
router.get('/posts', isAuth, feedController.getPosts)
router.get('/post/:postId', isAuth, feedController.getPost)
router.post('/post', [body('title').trim().isLength({min:5}), body('content').trim().isLength({min: 5})], isAuth, feedController.createPost)
router.put('/post/:postId', [body('title').trim().isLength({min:5}), body('content').trim().isLength({min: 5})], isAuth, feedController.updatePost)
router.delete('/post/:postId', isAuth, feedController.deletePost)


module.exports = router