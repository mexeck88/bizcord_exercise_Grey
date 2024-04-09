from flask import Flask, render_template, send_from_directory, request, make_response, session
from flask_sock import Sock
from components.user_database import getUser, createUser, getUserBySessionToken, sendChatMessage, getRooms, getRoom
import json

app = Flask(__name__)
sock = Sock(app)

clients = {}

@app.route('/')
def index():
	return render_template('index.html')

@app.route('/static/<path:path>')
def send_static(path):
	return send_from_directory('static', path)

# Session route
@app.route('/get_session')
def getSession():
	session_token = request.cookies.get('session_token')

	foundUser = getUserBySessionToken(session_token)
	return json.dumps({
		'user': foundUser
	})

# Login Route
@app.route('/login', methods=['POST'])
def loginUser():
	username = request.form['username']
	user = getUser(username)
	if user is None:
		user = createUser(username)
	print(user)

	cResponse = make_response('{"loggedIn": true}');
	
	cResponse.set_cookie('session_token', user['session_token'])
	return cResponse

# Rooms route
@app.route('/rooms')
def getRoomsRoute():
	rooms = getRooms()

	for room in rooms:
		room['messages'] = room['messages'][-3:]

	return json.dumps({
		'rooms': rooms
	})

# Room route
@app.route('/room/<room_id>')
def getRoomRoute(room_id):
	room = getRoom(room_id)
	return json.dumps({
		'room': room
	})

@sock.route('/ws')
def socketServer(ws):
	session_token = request.cookies.get('session_token')

	if session_token is None:
		return 'no session token'

	clients[session_token] = ws

	while True:
		data = ws.receive()
		event_name = ''
		event_data = {}

		try:
			ws.send('["ping"]')
		except Exception as e:
			del clients[session_token]
			print(e.__class__, flush=True)
		
		try:
			parsed = json.loads(data);
			event_name = parsed[0]
			event_data = parsed[1]
		except Exception as e:
			print('Failed to parse JSON passed through websocket', e)

		if event_name == 'chat':
			messageObj = sendChatMessage(event_data['room_id'], session_token, event_data['body'])
			for pair in clients.items():
				client = pair[1]
				client.send(json.dumps(['chat', messageObj]))

if __name__ == "__main__":
	app.run(debug=True)