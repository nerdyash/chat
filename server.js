var express = require('express'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io').listen(server),
    mongoose = require('mongoose'),
    usernames = {};

mongoose.connect('mongodb://localhost:27017/chat', function(err){
    if(err){
        console.log(err);
    }else {
        console.log("Connected to Mongo.");
    }
});



app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

var chatSchema = mongoose.Schema({
    nick: String,
    msg: String,
    time: {type: Date, default: Date.now}
});

var Chat = mongoose.model('Message', chatSchema);

io.sockets.on('connection',function(socket){
    Chat.find({}, function(err, docs){
        if(err) throw err;
        socket.emit('load old msgs',docs);
    });
    socket.on('new user', function(data, callback){
        if(data in usernames)
        {
            callback(false);
        }else{
            callback(true);
            socket.username = data;
            usernames[socket.username] = socket;
            updateUsername();
        }
    });

    function updateUsername(){
        io.sockets.emit('usernames', Object.keys(usernames));
    }

    socket.on('send message', function(data, callback){
        var msg = data.trim();
        if(msg.substr(0,3) === '/p '){
            msg = msg.substr(3);
            var ind = msg.indexOf(' ');
            if(ind !== -1){
                var name = msg.substring(0, ind);
                var msg = msg.substring(ind + 1);
                if(name in usernames){
                    usernames[name].emit('private', {msg: msg, user: socket.username});
                    console.log("Private message");
                }else {
                    callback('Error! Enter a valid Username.');
                }
            }
            else {
                callback('Error! Please enter message for your friend!');
            }
        }else {
            var newMsg = new Chat({msg: msg, nick: socket.username});
            newMsg.save(function(err){
                if(err) throw err;
                io.sockets.emit('new message', {msg: msg, user: socket.username});
            });
        }

    });

    socket.on('disconnect', function(data){
        if(!socket.username) return;
        delete usernames[socket.username];
        updateUsername();
    });
});

server.listen(3000);
