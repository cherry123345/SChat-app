const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const { Socket } = require('dgram')
const Filter = require('bad-words')
const { generateMessage, generateMessageLocation } = require('./utils/messages')
const { addUser, removeUser, findUser, getUserInRoom } = require('./utils/user')


const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

//socketio connections
io.on('connection', (socket) => {
    console.log('socketio is working')

    // welcome message for new user
    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)
        socket.emit('message', generateMessage('Admin', 'Welcomes'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined the room`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUserInRoom(user.room)
        })
        callback()
    })

    // sends messages
    socket.on('Send-message', (message, callback) => {
        const user = findUser(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profane messages are not allowed')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    // disconnected user message
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left the room`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUserInRoom(user.room)
            })
        }
    })

    // send location
    socket.on('sendlocation', (coords, callback) => {
        const user = findUser(socket.id)
        io.to(user.room).emit('locationMessage', generateMessageLocation(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude} `))
        callback()
    })
})

server.listen(port, () => {
    console.log(`Server is now up on port ${port}!`)
})

    // socket.emit('countUpdated', count)

    // socket.on('increment', () => {
    //     count++
    //     socket.emit('countUpdated', count)
    //     io.emit('countUpdated', count)
    // })