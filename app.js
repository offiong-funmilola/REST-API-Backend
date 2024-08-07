const express = require('express')
const feedRoutes = require('./routes/feed')
const authRoutes = require('./routes/auth')
const bodyParser = require('body-parser')
const path = require('path')
const mongoose = require('mongoose')
const multer = require('multer')
const dotenv = require('dotenv')
dotenv.config();

const CONNECTION = process.env.CONNECTION_URL
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images')
    },
    filename: (req, file, cb) => {
        cb(null, new Date().toISOString() + '-' + file.originalname)
    }
})

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){
        cb(null, true)
    }
    else {
        cb(null, false)
    }
}

const app = express() // Inttializing an express app
app.use(bodyParser.json()) //application/josn
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'))
//serving image folder statically
app.use('/images', express.static(path.join(__dirname, 'images')))
//solving CORS issue
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*') //the * stands for access to all domain, however we can list the name of the specific domains we want to access
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, PATCH')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    next()
}) 
//'/feed' was used inorder to filter routes and direct every request starting with /feed to the feedRouter
app.use('/feed', feedRoutes)
app.use('/auth', authRoutes)

app.use((error, req, res, next) => {
    console.log(error)
    const status = error.statusCode || 500
    const message = error.message
    const data = error.data
    res.status(status).json({message: message, data: data})
})

mongoose.connect(CONNECTION)
.then(res => {
    const server = app.listen(8080)
    const io = require('./socket').init(server)
    io.on('connection', socket => {
        //when we listen to connection to users, socket is return with a unique id for individual connected user
        console.log('Client Connected')    
    })
    console.log('connected')    
})
.catch(err => {
    console.log(err)
})

