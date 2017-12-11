var socket = io();
$(function () {
	
	var userSubmit = $('#submit');
	var sendMessage = $('#sendMessage');
	var messageArea = $('#messageArea');
	
	
	userSubmit.click(function () {
		$('#error').html('');
		var username = $('#username').val();
		if ( validateEmail(username) ) {
			socket.emit('connectUser', username);
		} else {
			$('#error').html('Invalid email!');
		}		
	});
	
	socket.on('updateusers', function (usernames, agents, customers, supervisor) {
		var customerHtml = '';
		var agent = '';
		var activeUsers = '';
		//$.each(usernames, function(key, value) {
			//activeUsers +='<div><b>All active users</b>:'+ value +'</div>';
		//});
		$.each(agents, function (key, value) {
			agent +='<div><b>Agents</b>:<a onclick="switchUser(\''+value+'\');" style="cursor:pointer;color:blue;">' + value + '</a></div>';
		});

		$.each(customers, function (key, value) {
			//var customerId = 99;//userDetails[value]['userId'] + userDetails[value]['roomId'];
			customerHtml += '<div><b>Customers</b>:<a onclick="switchUser(\''+value+'\');" style="cursor:pointer;color:blue;">' + value + '</a><span class="newMsg" data-email="'+value+'"> </span></div>';
		});
		
		$.each(usernames, function(key, value) {
			
				if (agents.indexOf(value) != -1) {
					activeUsers +='<div><b>Agent</b>:'+ value +'</div>';
				}
				if (customers.indexOf(value) != -1) {
					activeUsers += '<div><b>Customer</b>:'+ value +'</div>';
				}
			
		});
		
		$('#customer').html(customerHtml);
		//$('#alluser').html(activeUsers);
		$('#agents').html(agent);
		
		$.each(usernames, function(key, value) {

			if (supervisor.indexOf(value) != -1 && $('#username').val() === value) {
				alert(value);
				$('#supervisor').html(agent + customerHtml);
				$('#customer').html('');
				//$('#alluser').html(activeUsers);
				$('#agents').html('');
			}
		});
		

		
	});
	
	socket.on('notification', function (username, count) {
		$(".newMsg").each(function () {
			if (count == 'NEW') {
				if ($(this).data('email') == username) {
					$(this).attr('style', 'background-color:red');
					$(this).html(count);
				}
			} 
			if (count == 'OLD') {
				if ($(this).data('email') == username) {
					$(this).attr('style', 'background-color:none');
					$(this).html('');
				}
			}
		});
			
	});
	
	sendMessage.click(function () {
		var chatMessage = $('#message').val();
		socket.emit('chatMessage', chatMessage);
		$('#message').val('');
	});
	
	socket.on('updateChatMessage', function (username, message, currentDate) {
		messageArea.append('<div style="background-color:ghostwhite;padding-bottom:20px;">' + username + ': ' + message + '<span style="float:right;font-size:small;padding-top:20px;">'+currentDate+'</span></div>');
	});
	
	socket.on('supervisorUpdate', function (usernames, agents, customers) {
		var activeUsers = '';
		$.each(usernames, function(key, value) {
			if (agents.indexOf(value) != -1) {
				activeUsers +='<div><b>Agent</b>:'+ value +'</div>';
			}
			if (customers.indexOf(value) != -1) {
				activeUsers += '<div><b>Customer</b>:'+ value +'</div>';
			}
		});
		//$('#supervisor').html(activeUsers);
	});
});

function switchUser(room)
{
	$('#messageArea').html('');
	socket.emit('switchRoom', room);
}

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}
