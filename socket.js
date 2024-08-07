let io;

module.exports = {
    init: (httpServer) => {
        io = require('socket.io')(httpServer, {
            cors: {
              origin: "*",
              credentials: true
            }});
        return io
    },
    getIo: () => {
        if(!io){
            throw new Error ("Socket.io is not initialized")
        }
        return io
    }
}