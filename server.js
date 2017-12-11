var express = require("express");
var app = express();
var bodyParser = require('body-parser');
var http = require("http").Server(app);
var io = require("socket.io")(http);
var mysql = require("mysql");

app.get('/', function (req, res){
	res.sendFile(__dirname + '/views/index.html');
});

app.use(express.static('public'));
app.use(bodyParser.urlencoded({
	extended: true
}));

//http.listen('7827', function (){
http.listen('7827', '192.168.2.216', function (){
	console.log('You are connected to port 7827');
});

var chatPeople = {};
var customers = [];
var agents = [];
var rooms = [];
var usernames = [];
var userDetails = [];
var supervisor = [];

var connection  = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '',
	database: 'chat'
});

connection.connect((err) => {
	if (err) throw err;
	console.log('Mysql connected...');
});

io.on('connection', function (socket) {
	socket.on('connectUser', function (username) {
		var fetchUser = 'SELECT * FROM users WHERE user_name = ? and status = 1';
		userDetails[username] = {};

		connection.query(fetchUser, [username], function (err, rows) {
			if (err) throw err;
			
			// Check if any matching record found
			if (rows.length > 0) {
				rows.forEach( (row) => {
					
					var fetchRoom = 'SELECT * FROM rooms WHERE name = ?';
					// Check for existing room and join if not then insert room and join
					connection.query(fetchRoom, [username], function (err, existRooms) {
						if (err) throw err;
						
						if (existRooms.length > 0) {
							existRooms.forEach( (room) => {
								socket.room = room.name;
								if (rooms.indexOf(room.name) === -1) {
									rooms.push(room.name);
								}
								socket.join(room.name);
								userDetails[room.name]['roomId'] = room.id;
							});
						} else {
							// insert room and join room
							var insertRoom = "INSERT INTO rooms (name) values (?)";
							connection.query(insertRoom, [username], function (err, res) {
								if (err) throw err;
								socket.room = username;
								rooms.push(username);
								socket.join(username);
								userDetails[username]['roomId'] = res.insertId;
								console.log('room created with id ' + res.insertId);
							});
						}
					});
					
					// Update the array according to user role
					if (row.role_id === 2) {
						if (agents.indexOf(username) === -1) {
							agents.push(username);
						}
					} 
					if (row.role_id === 1) {
						if (customers.indexOf(username) === -1) {
							customers.push(username);
						}
					}
					if (row.role_id === 3) {
						if (supervisor.indexOf(username) === -1) {
							supervisor.push(username);
						}
					}
					
					userDetails[username]['userId'] = row.id;
					userDetails[username]['alise'] = row.alise;
					
				});
				socket.username = username;
				if (usernames.indexOf(username) === -1) {
					usernames.push(username);
				}
				console.log('CONNECTION = username: ' + JSON.stringify(usernames) + ' supervisor: ' + supervisor + ' agent:' + agents);
				if (agents.indexOf(username) != -1) {
					socket.emit('updateusers', usernames, agents, customers, supervisor);
					for (var i=0; i<agents.length; i++) {
						io.sockets.in(agents[i]).emit('updateusers', usernames, agents, customers, supervisor);
					};
					
				} else {
					for (var i=0; i<agents.length; i++) {
						io.sockets.in(agents[i]).emit('updateusers', usernames, agents, customers, supervisor);
					};
					/*for (var j=0; j< supervisor.length; j++) {
						io.sockets.in(supervisor[i]).emit('supervisorUpdate', usernames, agents, customers);
					}*/
				}
				if (supervisor.indexOf(username) != -1) {
					for (var j=0; j< supervisor.length; j++) {
						console.log('CONNECTION super = username: ' + JSON.stringify(usernames) + ' supervisor: ' + supervisor);
						//io.sockets.in(supervisor[i]).emit('supervisorUpdate', usernames, agents, customers);
						io.sockets.to(supervisor[j]).emit('updateusers', usernames, agents, customers, supervisor);
					}
				} else {
					for (var j=0; j< supervisor.length; j++) {
						console.log('CONNECTION super = username: ' + JSON.stringify(usernames) + ' supervisor: ' + supervisor);
						//io.sockets.in(supervisor[i]).emit('supervisorUpdate', usernames, agents, customers);
						io.sockets.to(supervisor[j]).emit('updateusers', usernames, agents, customers, supervisor);
					}
				}
			} else {
				var alise = username.substring(0, 2).toUpperCase();
				var insertUser ='INSERT INTO users (role_id, user_name, alise, status, created_on) VALUES (?, ?, ?, ?, NOW())';
				connection.query(insertUser, [1, username, alise, 1], function (err, res) {
					if (err) throw err;
					
					
					customers.push(username);
					userDetails[username]['userId'] = res.insertId;
					userDetails[username]['alise'] = alise;
					console.log('user created successfully with user id' + res.insertId);

					// insert room and join room
					var insertRoom = "INSERT INTO rooms (name) values (?)";
					connection.query(insertRoom, [username], function (err, res) {
						if (err) throw err;
						
						socket.room = username;
						rooms.push(username);
						socket.join(username);
						userDetails[username]['roomId'] = res.insertId;
						console.log('room created with id ' + res.insertId);
					});
				});
				socket.username = username;
				if (usernames.indexOf(username) === -1) usernames.push(username);
				
				if (agents.indexOf(username) != -1) {
					socket.emit('updateusers', usernames, agents, customers, supervisor);
					for (var i=0; i<agents.length; i++) {
						io.sockets.in(agents[i]).emit('updateusers', usernames, agents, customers, supervisor);
					};
					for (var j=0; j< supervisor.length; j++) {
						//io.sockets.in(supervisor[i]).emit('supervisorUpdate', usernames, agents, customers);
						io.sockets.to(supervisor[j]).emit('updateusers', usernames, agents, customers, supervisor);
					}
				} else {
					for (var i=0; i<agents.length; i++) {
						io.sockets.in(agents[i]).emit('updateusers', usernames, agents, customers, supervisor);
					};
					/*for (var j=0; j< supervisor.length; j++) {
						//io.sockets.to(supervisor[i]).emit('supervisorUpdate', usernames, agents, customers);
						io.sockets.to(supervisor[j]).emit('updateusers', usernames, agents, customers, supervisor);
					}*/
				}
			}
		});
	});
	
	socket.on('chatMessage', function (data) {
		var userId = userDetails[socket.username]['userId'];
		var roomId = userDetails[socket.room]['roomId'];
		var alise = userDetails[socket.username]['alise'];
		var insertMessage = 'INSERT INTO messages (user_id, room_id, messages, read_status, created_on) values (?, ?, ?, ?, NOW())';
		connection.query(insertMessage, [userId, roomId, data, 0], function (err, res) {
			if (err) throw err;
			
			console.log('Message save to db');
			for (var i=0; i<agents.length; i++) {
				io.sockets.in(agents[i]).emit('notification', socket.username, 'NEW');
			};
		});
		io.sockets.in(socket.room).emit('updateChatMessage', alise, data, getDate());
	});
	
	socket.on('switchRoom', function (newroom) {
		socket.leave(socket.room);
		socket.join(newroom);
		socket.room = newroom;
		io.sockets.to(socket.room).emit('notification', socket.room, 'OLD');
		for (var i=0; i<agents.length; i++) {
			io.sockets.in(agents[i]).emit('notification', socket.room, 'OLD');
		};
		var newMessage = 'SELECT m.messages, u.alise, m.created_on FROM messages m JOIN users u ON u.id = m.user_id WHERE m.room_id = ? AND m.read_status = 0 AND date(m.created_on) = date(NOW())';

		connection.query(newMessage, [userDetails[socket.room]['roomId']], function (err, res) {
			if (err) throw err;
			var messageArray = [];
			
			if (res.length > 0) {
				
				res.forEach( (row) => {
					io.sockets.in(socket.room).emit('updateChatMessage', row.alise, row.messages, row.created_on);
				});
				
			}
		});
		
	});
	
	socket.on('disconnect', function () {
		
		usernames.splice(usernames.indexOf(socket.username), 1);
		rooms.splice(rooms.indexOf(socket.username), 1);
		if (agents.indexOf(socket.username) != -1) agents.splice(agents.indexOf(socket.username), 1);
		if (customers.indexOf(socket.username)!= -1) customers.splice(customers.indexOf(socket.username), 1);
		if (supervisor.indexOf(socket.username)!= -1) supervisor.splice(supervisor.indexOf(socket.username), 1);

		delete userDetails[socket.username];
		
		var activeAgent = usernames.filter(function(val) {
		  return agents.indexOf(val) != -1;
		});
		console.log('DISCONNECT =username: ' + JSON.stringify(usernames) + ' activeAgents: ' + JSON.stringify(agents) + ' customers: ' + customers);
		for (var i=0; i<agents.length; i++) {
			io.sockets.to(agents[i]).emit('updateusers', usernames, agents, customers, supervisor);
		};
		socket.leave(socket.room);
		console.log(socket.username + ' has disconnected');
	});
});

function getDate()
{
	var today = new Date();
	var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
	var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
	return dateTime = date+' '+time;
}
