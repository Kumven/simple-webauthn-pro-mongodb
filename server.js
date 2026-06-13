require('dotenv').config()
const path = require('path');
const express = require('express')
const cors = require('cors')

const authns =  require('./src/routes/authns')
const adminRoutes =  require('./src/routes/admins')
const studentRoutes =  require('./src/routes/students')

const connectDB = require('./src/db')
const app = express()
const port = process.env.PORT || 4000
// const port = 4000

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public','views'));
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

// Connect to MongoDB
connectDB()

// Routes
app.use('/', studentRoutes)
app.use('/', adminRoutes)
app.use('/api/authn', authns)

app.get('/',(req,res)=>{
  res.sendFile(path.join(__dirname, '/public/pages/signup.html'))
  
})


// For when user puts in wrong Routes
app.use((req,res)=>{
  res.status(404).send('Page This Page dosen\'t exist')
})



app.listen(port, () => {
  console.log(`Servering on localhost:${port}`);
});

//for vercel serverless functions
module.exports = app;