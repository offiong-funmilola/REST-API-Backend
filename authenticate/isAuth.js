const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
dotenv.config();

const SECRET = process.env.SECRET_KEY

module.exports = (req, res, next) => {
    //accessing the token from the req header
    const authHeader = req.get('Authorization')
    if (!authHeader){
        const error = new Error('Not Authenticated')
        error.statusCode = 403
        throw error
    }
    const token = authHeader.split(' ')[1]
    let decodedToken
    try{
        //the verify method both decode the token and validate it, we can also use the decode method.
        //the vrify method takes the token and the secet key
        decodedToken = jwt.verify(token, SECRET)
    }
    catch(err) {
        err.statusCode = 500
        throw err
    }
    if(!decodedToken){
        const error = new Error('Not Authenticated')
        error.statusCode = 401
        throw error
    }
    //storing the userId we added to the token in the sign method while trying to create our token 
    //into the req inorder to access it subsequently in the project. for example confirming that the 
    //userId of the user that craetes a post is the authenticated user. 
    req.userId = decodedToken.userId
    // the next method is to ensuer that we pass execution to the next middle ware
    next()
}