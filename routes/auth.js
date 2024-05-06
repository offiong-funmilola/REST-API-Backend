const express = require('express')
const authController = require('../controllers/auth')
const {check, body} = require('express-validator')
const User = require('../models/user')
const isAuth = require('../authenticate/isAuth')
const router = express.Router()

router.post('/signup', 
    [
        check('email').isEmail().withMessage('Enter a valid email')
        .custom((value, {req}) => {
            return User.findOne({email: value})
            .then(userDoc => {
                if(userDoc){
                    return Promise.reject('E-mail address already exist')
                }
            })
        })
        .normalizeEmail(),
        body('name')
        .trim()
        .not()
        .isEmpty()
        .isLength({min: 7}),
        body('password').trim().isLength({min: 7})
    ], 
    authController.createUser
)
router.post('/login', authController.loginUser)
router.get('/status', isAuth, authController.getStatus)
router.put('/status', isAuth, [body('status').trim().not().isEmpty()], authController.updateStatus)
module.exports = router