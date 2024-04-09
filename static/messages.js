window.SOCKET = null;
let currentRoomID = null;

document.addEventListener('login', async () => {
	const roomListElem = document.querySelector('#roomList');
	const chatBoxAvatarElem = document.querySelector('#chatBoxAvatar');

	const response = await window.Fetch('/rooms');

	roomListElem.innerHTML = '';
	response.rooms.forEach(room => {
		roomListElem.innerHTML += `
<li class="p-2 border-bottom room-button" data-id="${room.id}">
	<a href="javascript:void(0)" class="d-flex justify-content-between">
		<div class="d-flex flex-row">
			<div>
				<img
					src="${room.id.length < 15 ? 'http://localhost:5000/static/logo.svg' : window.getAvatarURL(room.id.charCodeAt(0))}"
					alt="avatar" class="d-flex align-self-center me-3" width="60">
				<span class="badge bg-warning badge-dot"></span>
			</div>
			<div class="pt-1">
				<p class="fw-bold mb-0">${room.name}</p>
				<p class="small text-muted">${(room.messages[room.messages.length - 1].body.slice(0, 32))}</p>
			</div>
		</div>
	</a>
</li>
`;
	});

	document.querySelectorAll('.room-button').forEach(elem => elem.addEventListener('click', event => {
		const roomID = event.currentTarget.dataset.id;

		switchToSelectedRoom(roomID);
	}));

	chatBoxAvatarElem.src = window.getAvatarURL(window.USER_SESSION.id.charCodeAt(0));

	switchToSelectedRoom(response.rooms[0].id);

	window.SOCKET = new WebSocket(`ws://${location.host}/ws`);

	window.SOCKET.addEventListener('message', event => {
		let eventName = '';
		let eventData = {};

		try {
			let parsed = JSON.parse(event.data);
			eventName = parsed[0];
			eventData = parsed[1];
		} catch(e) {
			console.error(event);
			throw new Error("Failed to parse WebSocket JSON from server. " + e);
		}

		if(eventName === 'chat') {
			appendChatMessageToBox(
				eventData.authorId, eventData.authorName, eventData.body, eventData.date
			);
		}
	});
});

document.querySelector('#chatMessageForm').addEventListener('submit', event => {
	event.preventDefault();

	const chatMessageInputElem = document.querySelector('#chatMessage');
	const messageBody = chatMessageInputElem.value.trim();

	if(messageBody) {
		window.SOCKET.send(JSON.stringify([
			'chat',
			{ room_id: currentRoomID, body: messageBody }
		]));

		chatMessageInputElem.value = "";
	}
});

async function switchToSelectedRoom(roomID) {
	currentRoomID = roomID;
	const messageBoxElem = document.querySelector('#messageBox');

	messageBoxElem.innerHTML = '';

	const response = await window.Fetch('/room/' + roomID);
	const room = response.room;

	for(const message of room.messages) {
		appendChatMessageToBox(
			message.authorId, message.authorName, message.body, message.date
		);
	}
}

function appendChatMessageToBox(...args) {
	const messageBoxElem = document.querySelector('#messageBox');
	messageBoxElem.innerHTML += createMessageElem(...args);

	messageBoxElem.scrollTop = Number.MAX_SAFE_INTEGER;
}

function createMessageElem(authorID, name, message, date) {
	console.log(window.USER_SESSION, authorID);
	let isSelfSent = window.USER_SESSION.id === authorID;
	let dateObj = new Date(date);

	return `
	<div class="d-flex flex-row justify-content-${isSelfSent ? 'end' : 'start'} align-items-start text-light">
		<img src="${authorID === 'ADMIN' ? 'http://localhost:5000/static/logo.svg' : window.getAvatarURL(authorID.charCodeAt(0))}"
			alt="avatar 1" style="width: 48px; margin-right: 16px;">
		<div>
			<p class="small p-2 ${isSelfSent ? 'me-3' : 'ms-3'} mb-1 rounded-3 bg-${isSelfSent ? 'primary' : 'secondary'}">${(message)}</p>
			<p class="small ${isSelfSent ? 'me-3' : 'ms-3'} mb-3 rounded-3 text-muted float-end">${name} | ${dateObj.toLocaleTimeString()} | ${dateObj.toDateString()}</p>
		</div>
	</div>`;
}

