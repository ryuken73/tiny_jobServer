const { Server } = require('socket.io');
const { EventEmitter } = require('events');

// const SOCKET_SERVER_PORT = process.env.PORT || 6875;

const socketServer = (function(){
  const server = new Server();
  const sockets = new Set();
  const emitter = new EventEmitter();

  const _addToSockets = socket => {
    sockets.add(socket);
    emitter.emit('new-socket', socket.id);
  }

  const _removeFromSockets = socket => {
    sockets.delete(socket);
    emitter.emit('del-socket', socket.id);
  }

  server.on('connect', (socket) => {
    _addToSockets(socket);
    socket.on('disconnect', () => {
      _removeFromSockets(socket);
    })
    socket.on('enqueue', (data, callback) => {
      emitter.emit('enqueue', data, (queueSize, jobId) => {
        callback(queueSize, jobId)
      })
    })
    socket.on('dequeue', (callback) => {
      emitter.emit('dequeue', (next) => {
        callback(next);
      })
    })
    socket.on('size', (callback) => {
      emitter.emit('size', (queueSize) => {
        callback(queueSize)
      })
    })
    socket.on('success', (data) => {
      const {jobData, result} = data;
      emitter.emit('job-success', socket.id, jobData, result)
    })
    socket.on('failure', (data) => {
      const {jobData} = data;
      emitter.emit('job-failure', socket.id, jobData)
    })
    socket.on('setIdle', (isIdle, callback) => {
      emitter.emit('set-worker-idle', socket.id, JSON.parse(isIdle), callback);
    })
  })

  const getSocketInfo = (socketId) => {
    const targetSocket = Array.from(sockets).find(socket => socket.id === socketId);
    const ip = targetSocket.handshake.address;
    const since = parseInt(targetSocket.handshake.issued);
    console.log(since)
    const connected = new Date(since);
    return `(ip=${ip}, since=${connected.toLocaleString()})`
  }
  const on = (eventName, callback) => {
    emitter.on(eventName, (...data) => callback(...data));
  }
  const unicast = (eventName, socketId, data) => {
    const targetSocket = Array.from(sockets).find(socket => socket.id === socketId);
    targetSocket.emit(eventName, data);
  }
  const broadcast = (event, ...data) => {
    console.log(event, ...data)
    server.emit('bcast', event,  ...data);
  }
  const listen = (port) => {
    server.listen(port);
  }

  // server.listen(SOCKET_SERVER_PORT);
  return {
    on,
    unicast,
    broadcast,
    listen,
    getSocketInfo
  }
})()

module.exports = socketServer;