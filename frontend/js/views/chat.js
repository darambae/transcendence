// chat in column style
import { getCookie } from '../utils.js';

let mainChatBootstrapModal; // Bootstrap Modal instance
let currentActiveChatGroup = 'public'; // Default active chat group
const eventSources = {}; // Stores EventSource objects per groupName
const messageOffsets = {}; // Stores the offset for message history for each group

// Helper to create an HTML message element (mostly same logic)
function createMessageElement(messageData) {
	const msg = document.createElement('div');
	msg.classList.add('chat-message');

	// Get current username from the active input field
	const currentUsernameInput = document.getElementById('usernameInput-active');
	const currentUsername = currentUsernameInput
		? currentUsernameInput.value
		: '';

	if (
		messageData.sender === currentUsername ||
		messageData.sender__username === currentUsername
	) {
		msg.classList.add('self');
	} else {
		msg.classList.add('other');
	}

	const senderSpan = document.createElement('span');
	senderSpan.classList.add('message-sender');
	senderSpan.textContent = messageData.sender__username || messageData.sender;

	// Make sender clickable for private chat (if not self)
	const displayedSender = messageData.sender__username || messageData.sender;
	if (displayedSender && displayedSender !== currentUsername) {
		senderSpan.style.cursor = 'pointer';
		senderSpan.style.textDecoration = 'underline';
		senderSpan.onclick = () =>
			promptPrivateChat(displayedSender, messageData.sender_id || null);
	}
	msg.appendChild(senderSpan);

	const contentText = document.createTextNode(messageData.content);
	msg.appendChild(contentText);

	const timestampSpan = document.createElement('span');
	timestampSpan.classList.add('message-timestamp');
	// Format timestamp nicely if possible, or just display raw
	timestampSpan.textContent =
		messageData.timestamp || new Date().toLocaleTimeString();
	msg.appendChild(timestampSpan);

	return msg;
}

// Function to load message history for the active group
async function loadMessageHistory(groupName, prepend = false) {
	const chatLog = document.getElementById('chatLog-active'); // Always target the active chat log
	if (!chatLog) {
		console.error(`chatLog-active not found for loading history.`);
		return;
	}

	const offset = messageOffsets[groupName] || 0;
	const limit = 20;

	try {
		const response = await fetch(
			`chat/history/${groupName}/?offset=${offset}&limit=${limit}`
		);
		const data = await response.json();

		if (response.ok && data.status === 'success') {
			if (data.messages.length > 0) {
				const fragment = document.createDocumentFragment();
				data.messages.forEach((msgData) => {
					const msgElement = createMessageElement(msgData); // Pass messageData only
					fragment.appendChild(msgElement);
				});

				if (prepend) {
					const oldScrollHeight = chatLog.scrollHeight;
					chatLog.insertBefore(fragment, chatLog.firstChild);
					const newScrollHeight = chatLog.scrollHeight;
					chatLog.scrollTop = newScrollHeight - oldScrollHeight;
				} else {
					chatLog.appendChild(fragment);
					chatLog.scrollTop = chatLog.scrollHeight;
				}
				messageOffsets[groupName] = offset + data.messages.length;
			} else if (!prepend) {
				console.log(`No history for ${groupName} or end of history.`);
			}
		} else {
			console.error('Error loading history:', data.message || 'Unknown error');
		}
	} catch (error) {
		console.error('Network error while loading history:', error);
	}
}

// Function to send a message to the active group
async function sendMessage() {
	const usernameInput = document.getElementById('usernameInput-active');
	const messageInput = document.getElementById('messageInput-active');
	const groupNameInput = document.getElementById('groupNameInput-active');

	const username = usernameInput.value.trim();
	const content = messageInput.value.trim();
	const groupName = groupNameInput.value; // Get the currently active group name

	if (!username || !content) {
		alert('Please enter your name and a message.');
		return;
	}

	try {
		const response = await fetch('/chat/send/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCookie('csrftoken'),
			},
			body: JSON.stringify({
				username: username,
				content: content,
				group_name: groupName, // Send to the active group
			}),
		});

		const data = await response.json();
		if (response.ok) {
			if (data.status === 'success') {
				messageInput.value = ''; // Clear message input
			} else {
				console.error('Server error sending message:', data.message);
				alert('Error sending message: ' + data.message);
			}
		} else {
			console.error(
				'HTTP error sending message:',
				response.status,
				data.message || response.statusText
			);
			alert('HTTP Error: ' + (data.message || response.statusText));
		}
	} catch (error) {
		console.error('Network or JSON error:', error);
		alert('Cannot connect to server to send message.');
	}
}

// Function to initialize EventSource (SSE) for a group
function initEventSource(groupName) {
	// Close existing EventSource if active for the previous group
	if (
		eventSources[groupName] &&
		eventSources[groupName].readyState === EventSource.OPEN
	) {
		return;
	}
	// Close any other active EventSources before opening a new one
	for (const key in eventSources) {
		if (eventSources[key].readyState === EventSource.OPEN) {
			eventSources[key].close();
			delete eventSources[key];
			console.log(`Closed SSE for group: ${key}`);
		}
	}

	const chatLog = document.getElementById('chatLog-active');
	if (!chatLog) {
		console.error(`chatLog-active not found for initEventSource.`);
		return;
	}

	const source = new EventSource(`/chat/stream/${groupName}/`);
	eventSources[groupName] = source;

	source.onmessage = function (e) {
		try {
			const messageData = JSON.parse(e.data);
			// Only append if the message is for the currently active chat group
			if (messageData.group_name === currentActiveChatGroup) {
				const msgElement = createMessageElement(messageData);
				chatLog.appendChild(msgElement);
				chatLog.scrollTop = chatLog.scrollHeight; // Auto-scroll to bottom
			}
		} catch (error) {
			console.error(
				'JSON parsing error or SSE message processing error:',
				error,
				e.data
			);
		}
	};

	source.onerror = function (err) {
		console.error('EventSource failed for group ' + groupName + ':', err);
		source.close();
		delete eventSources[groupName];
		setTimeout(() => initEventSource(groupName), 3000); // Attempt reconnect
	};
	console.log(`Opened SSE for group: ${groupName}`);
}

// Function to populate the chat room list
function loadChatRoomList() {
	const chatRoomListUl = document.getElementById('chatRoomList');
	if (!chatRoomListUl) {
		console.error('Chat room list element not found!');
		return;
	}

	// For now, hardcode some chat rooms. In a real app, you'd fetch this from your backend.
	const chatRooms = [
		{ name: 'Public', groupName: 'public' },
		{ name: 'User 1', groupName: 'private_user1_loggedInUser' }, // Example private chat
		{ name: 'User 5', groupName: 'private_user5_loggedInUser' }, // Example private chat
		// Add more dynamically fetched rooms here
	];

	chatRoomListUl.innerHTML = ''; // Clear existing list
	chatRooms.forEach((room) => {
		const listItem = document.createElement('li');
		listItem.classList.add('list-group-item');
		if (room.groupName === currentActiveChatGroup) {
			listItem.classList.add('active'); // Highlight active room
		}
		listItem.dataset.groupName = room.groupName;
		listItem.textContent = room.name;
		listItem.style.cursor = 'pointer';

		listItem.onclick = () => switchChatRoom(room.groupName);
		chatRoomListUl.appendChild(listItem);
	});
}

// Function to switch between chat rooms
function switchChatRoom(newGroupName) {
	if (currentActiveChatGroup === newGroupName) {
		return; // Already in this room
	}

	// Update active class in the list
	const oldActiveItem = document.querySelector(
		`#chatRoomList .list-group-item.active`
	);
	if (oldActiveItem) {
		oldActiveItem.classList.remove('active');
	}
	const newActiveItem = document.querySelector(
		`#chatRoomList [data-group-name="${newGroupName}"]`
	);
	if (newActiveItem) {
		newActiveItem.classList.add('active');
	}

	// Update current active group
	currentActiveChatGroup = newGroupName;

	// Update header of the right column
	const activeChatRoomName = document.getElementById('activeChatRoomName');
	if (activeChatRoomName) {
		activeChatRoomName.textContent =
			newGroupName === 'public'
				? 'Public Chat Room'
				: `Chat with ${newGroupName.split('_').slice(1).join(', ')}`;
	}

	// Update hidden input for sending messages
	const groupNameInput = document.getElementById('groupNameInput-active');
	if (groupNameInput) {
		groupNameInput.value = newGroupName;
	}

	// Clear current messages
	const chatLog = document.getElementById('chatLog-active');
	if (chatLog) {
		chatLog.innerHTML = '';
		chatLog.scrollTop = chatLog.scrollHeight; // Reset scroll
	}

	// Close existing SSE for previous group if any (handled in initEventSource, but explicit close here is safer)
	if (
		eventSources[currentActiveChatGroup] &&
		eventSources[currentActiveChatGroup].readyState === EventSource.OPEN
	) {
		eventSources[currentActiveChatGroup].close();
		delete eventSources[currentActiveChatGroup];
	}

	// Load history and initialize SSE for the new group
	messageOffsets[newGroupName] = 0; // Reset offset for new room
	loadMessageHistory(newGroupName);
	initEventSource(newGroupName);

	// Focus on message input
	const messageInput = document.getElementById('messageInput-active');
	if (messageInput) {
		messageInput.focus();
	}
}

// Function to request creation/retrieval of a private group
async function promptPrivateChat(targetUsername, targetUserId) {
	const currentUsernameInput = document.getElementById('usernameInput-active');
	if (!currentUsernameInput || !currentUsernameInput.value) {
		alert('Please ensure your username is set.');
		return;
	}
	const currentUsername = currentUsernameInput.value.trim();

	if (currentUsername === targetUsername) {
		alert('You cannot start a private chat with yourself.');
		return;
	}

	if (confirm(`Do you want to start a private chat with ${targetUsername}?`)) {
		try {
			const response = await fetch('/chat/group/create/private', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'X-CSRFToken': getCookie('csrftoken'),
				},
				body: new URLSearchParams({
					current_username: currentUsername,
					target_username: targetUsername,
					// target_user_id: targetUserId // if your backend uses user_id
				}).toString(),
			});

			const data = await response.json();
			if (response.ok) {
				if (data.status === 'success' && data.group_name) {
					console.log(
						`Private chat group ${data.group_name} created/retrieved.`
					);
					// After creating/retrieving, add it to the list and switch to it
					loadChatRoomList(); // Reload the list to include the new private chat
					switchChatRoom(data.group_name); // Switch to the newly created/found private chat
				} else {
					console.error('Server error creating private group:', data.message);
					alert('Error creating private group: ' + data.message);
				}
			} else {
				console.error(
					'HTTP error creating private group:',
					response.status,
					data.error || response.statusText
				);
				alert('HTTP Error: ' + (data.error || response.statusText));
			}
		} catch (error) {
			console.error('Network error creating private group:', error);
			alert('Cannot connect to server to create private group.');
		}
	}
}

// Main chat controller function, called after login
export function chatController() {
	// 1. Initialize Bootstrap Modal
	const mainChatWindowElement = document.getElementById('mainChatWindow');
	if (mainChatWindowElement) {
		mainChatBootstrapModal = new bootstrap.Modal(mainChatWindowElement);

		mainChatWindowElement.addEventListener('shown.bs.modal', () => {
			console.log('Main Chat Window is shown');
			// Ensure chat list is loaded and default chat room is active when modal opens
			loadChatRoomList();
			switchChatRoom(currentActiveChatGroup); // Activate the default/last active group
			const messageInput = document.getElementById('messageInput-active');
			if (messageInput) {
				messageInput.focus();
			}
		});
		mainChatWindowElement.addEventListener('hidden.bs.modal', () => {
			console.log('Main Chat Window is hidden');
			// Optionally close active SSE connection when modal closes
			if (eventSources[currentActiveChatGroup]) {
				eventSources[currentActiveChatGroup].close();
				delete eventSources[currentActiveChatGroup];
			}
		});
	} else {
		console.error('Main chat window modal element not found!');
		return;
	}

	// 2. Main Chat Toggle Button setup
	const mainChatToggleButton = document.getElementById('mainChatToggleButton');
	if (mainChatToggleButton) {
		mainChatToggleButton.style.display = 'flex'; // Make the main button visible

		mainChatToggleButton.onclick = () => {
			mainChatBootstrapModal.show(); // Show the main chat modal
		};
	} else {
		console.error('Main chat toggle button not found.');
	}

	// 3. Attach send message event listener
	const sendMessageBtn = document.getElementById('sendMessageBtn');
	if (sendMessageBtn) {
		sendMessageBtn.addEventListener('click', sendMessage);
	}
	const messageInput = document.getElementById('messageInput-active');
	if (messageInput) {
		messageInput.addEventListener('keypress', function (e) {
			if (e.key === 'Enter') {
				e.preventDefault(); // Prevent new line
				sendMessage();
			}
		});
	}

	// Set initial username (you should get this from your login response or a user profile)
	const usernameInput = document.getElementById('usernameInput-active');
	if (usernameInput) {
		usernameInput.value = 'LoggedInUser'; // Replace with actual user name
	}
}

// chat in column style // 이 줄은 코드의 목적을 나타내는 주석입니다. 채팅창이 컬럼(열) 스타일로 표시됨을 암시합니다.
// import { getCookie } from '../utils.js'; // `utils.js` 파일에서 `getCookie` 함수를 가져옵니다. CSRF 토큰을 가져오는 데 사용될 것으로 예상됩니다.

// let mainChatBootstrapModal; // Bootstrap 모달 인스턴스를 저장할 변수를 선언합니다. 초기값은 undefined입니다.
// let currentActiveChatGroup = 'public'; // 현재 활성화된 채팅 그룹(방)의 이름을 저장할 변수를 선언하고, 기본값으로 'public'을 설정합니다.
// const eventSources = {}; // 각 채팅 그룹에 대한 Server-Sent Events (SSE) `EventSource` 객체를 저장할 빈 객체를 선언합니다.
// const messageOffsets = {}; // 각 채팅 그룹별로 메시지 기록 로드를 위한 오프셋(페이지네이션에 사용)을 저장할 빈 객체를 선언합니다.

// // Helper to create an HTML message element (mostly same logic) // 메시지 요소를 생성하는 헬퍼 함수라는 주석입니다.
// function createMessageElement(messageData) { // `messageData` 객체(메시지 내용, 보낸이 등 포함)를 인자로 받아 메시지 HTML 요소를 생성합니다.
//     const msg = document.createElement('div'); // 새 `div` 요소를 생성하여 `msg` 변수에 할당합니다. 이 `div`가 단일 메시지를 나타냅니다.
//     msg.classList.add('chat-message'); // `msg` 요소에 'chat-message' CSS 클래스를 추가합니다.

//     // Get current username from the active input field // 현재 사용자 이름을 활성 입력 필드에서 가져옵니다.
//     const currentUsernameInput = document.getElementById('usernameInput-active'); // 'usernameInput-active' ID를 가진 HTML 요소를 가져옵니다. 이 필드는 현재 로그인된 사용자 이름을 담고 있습니다.
//     const currentUsername = currentUsernameInput // `currentUsernameInput`이 존재하면 그 `value`를 가져오고, 없으면 빈 문자열을 할당합니다.
//         ? currentUsernameInput.value
//         : '';

//     if ( // 메시지 보낸이(sender)가 현재 사용자와 같은지 확인합니다.
//         messageData.sender === currentUsername || // `messageData`에 직접 `sender` 필드가 있거나,
//         messageData.data.sender__username === currentUsername // `sender__username` 필드가 있는 경우를 모두 확인합니다.
//     ) {
//         msg.classList.add('self'); // 보낸이가 현재 사용자인 경우, 'self' CSS 클래스를 추가합니다. (예: 오른쪽에 정렬)
//     } else {
//         msg.classList.add('other'); // 보낸이가 다른 사용자인 경우, 'other' CSS 클래스를 추가합니다. (예: 왼쪽에 정렬)
//     }

//     const senderSpan = document.createElement('span'); // 메시지 보낸이(sender) 이름을 표시할 `span` 요소를 생성합니다.
//     senderSpan.classList.add('message-sender'); // `senderSpan`에 'message-sender' CSS 클래스를 추가합니다.
//     senderSpan.textContent = messageData.sender__username || messageData.sender; // `messageData`에서 `sender__username` (선호) 또는 `sender` 값을 가져와 `senderSpan`의 텍스트로 설정합니다.

//     // Make sender clickable for private chat (if not self) // 보낸이가 현재 사용자가 아니면 개인 채팅을 위해 클릭 가능하게 만듭니다.
//     const displayedSender = messageData.sender__username || messageData.sender; // 표시될 보낸이 이름을 결정합니다.
//     if (displayedSender && displayedSender !== currentUsername) { // 보낸이 이름이 있고, 그 이름이 현재 사용자가 아닌 경우:
//         senderSpan.style.cursor = 'pointer'; // 마우스 커서를 포인터로 변경하여 클릭 가능함을 시각적으로 나타냅니다.
//         senderSpan.style.textDecoration = 'underline'; // 텍스트에 밑줄을 추가하여 클릭 가능함을 강조합니다.
//         senderSpan.onclick = () => // `senderSpan`을 클릭했을 때 실행될 익명 함수를 정의합니다.
//             promptPrivateChat(displayedSender, messageData.sender_id || null); // `promptPrivateChat` 함수를 호출하여 해당 보낸이와 개인 채팅을 시작할지 묻습니다. `sender_id`가 있으면 함께 전달합니다.
//     }
//     msg.appendChild(senderSpan); // `senderSpan`을 `msg` 요소의 자식으로 추가합니다.

//     const contentText = document.createTextNode(messageData.content); // 메시지 내용을 담을 텍스트 노드를 생성합니다.
//     msg.appendChild(contentText); // `contentText`를 `msg` 요소의 자식으로 추가합니다.

//     const timestampSpan = document.createElement('span'); // 타임스탬프를 표시할 `span` 요소를 생성합니다.
//     timestampSpan.classList.add('message-timestamp'); // `timestampSpan`에 'message-timestamp' CSS 클래스를 추가합니다.
//     // Format timestamp nicely if possible, or just display raw // 타임스탬프를 보기 좋게 포맷하거나, 없다면 현재 시간을 표시합니다.
//     timestampSpan.textContent = // `messageData`에서 `timestamp` 값을 가져오고, 없으면 현재 시간(`new Date().toLocaleTimeString()`)을 가져와 `timestampSpan`의 텍스트로 설정합니다.
//         messageData.timestamp || new Date().toLocaleTimeString();
//     msg.appendChild(timestampSpan); // `timestampSpan`을 `msg` 요소의 자식으로 추가합니다.

//     return msg; // 생성된 메시지 `div` 요소를 반환합니다.
// }

// // Function to load message history for the active group // 활성 그룹에 대한 메시지 기록을 로드하는 함수입니다.
// async function loadMessageHistory(groupName, prepend = false) { // `groupName`(필수)과 `prepend`(선택, 기본값 false)를 인자로 받습니다.
//     const chatLog = document.getElementById('chatLog-active'); // 'chatLog-active' ID를 가진 HTML 요소를 가져와 `chatLog` 변수에 할당합니다. 이 요소는 메시지가 표시될 곳입니다.
//     if (!chatLog) { // `chatLog` 요소가 없으면,
//         console.error(`chatLog-active not found for loading history.`); // 오류 메시지를 콘솔에 출력합니다.
//         return; // 함수 실행을 중단합니다.
//     }

//     const offset = messageOffsets[groupName] || 0; // `messageOffsets` 객체에서 현재 `groupName`에 대한 오프셋 값을 가져오고, 없으면 0을 기본값으로 사용합니다.
//     const limit = 20; // 한 번에 로드할 메시지 수를 20으로 설정합니다.

//     try { // 비동기 작업을 시도합니다.
//         const response = await fetch( // 서버의 `/chat/history/{groupName}/` 엔드포인트로 GET 요청을 보냅니다.
//             `api/chat/history/${groupName}/?offset=${offset}&limit=${limit}` // URL에 오프셋과 제한 값을 쿼리 파라미터로 추가합니다.
//         );
//         const data = await response.json(); // 응답 본문을 JSON으로 파싱합니다.

//         if (response.ok && data.status === 'success') { // HTTP 응답이 성공(2xx)이고, JSON 데이터의 `status`가 'success'인 경우:
//             if (data.messages.length > 0) { // 받아온 메시지 배열(`data.messages`)에 메시지가 하나라도 있다면:
//                 const fragment = document.createDocumentFragment(); // 성능 향상을 위해 DocumentFragment를 생성합니다. (DOM에 직접 여러 번 추가하는 것을 방지)
//                 data.messages.forEach((msgData) => { // 각 메시지 데이터에 대해 반복합니다.
//                     const msgElement = createMessageElement(msgData); // `createMessageElement`를 사용하여 메시지 HTML 요소를 생성합니다.
//                     fragment.appendChild(msgElement); // 생성된 메시지 요소를 DocumentFragment에 추가합니다.
//                 });

//                 if (prepend) { // `prepend`가 `true`인 경우 (새 메시지를 위에 추가해야 할 때):
//                     const oldScrollHeight = chatLog.scrollHeight; // 메시지를 추가하기 전 `chatLog`의 전체 스크롤 높이를 저장합니다.
//                     chatLog.insertBefore(fragment, chatLog.firstChild); // DocumentFragment를 `chatLog`의 맨 앞에 삽입합니다.
//                     const newScrollHeight = chatLog.scrollHeight; // 메시지 추가 후 `chatLog`의 새 전체 스크롤 높이를 저장합니다.
//                     chatLog.scrollTop = newScrollHeight - oldScrollHeight; // 스크롤 위치를 조정하여 사용자가 로드되기 전의 위치를 유지하도록 합니다.
//                 } else { // `prepend`가 `false`인 경우 (새 메시지를 아래에 추가해야 할 때):
//                     chatLog.appendChild(fragment); // DocumentFragment를 `chatLog`의 맨 뒤에 삽입합니다.
//                     chatLog.scrollTop = chatLog.scrollHeight; // `chatLog`를 맨 아래로 스크롤하여 최신 메시지가 보이도록 합니다.
//                 }
//                 messageOffsets[groupName] = offset + data.messages.length; // 해당 그룹의 오프셋을 업데이트합니다 (현재 로드된 메시지 수만큼 증가).
//             } else if (!prepend) { // 메시지가 없고 `prepend`가 `false`인 경우 (즉, 더 이상 과거 메시지가 없을 때):
//                 console.log(`No history for ${groupName} or end of history.`); // 콘솔에 기록 종료 메시지를 출력합니다.
//             }
//         } else { // 응답이 성공적이지 않거나 `status`가 'success'가 아닌 경우:
//             console.error('Error loading history:', data.message || 'Unknown error'); // 오류 메시지를 콘솔에 출력합니다.
//         }
//     } catch (error) { // 네트워크 오류 또는 JSON 파싱 오류와 같은 예외가 발생한 경우:
//         console.error('Network error while loading history:', error); // 네트워크 오류 메시지를 콘솔에 출력합니다.
//     }
// }

// // Function to send a message to the active group // 활성 그룹으로 메시지를 보내는 함수입니다.
// async function sendMessage() { // 비동기 함수로 정의됩니다.
//     const usernameInput = document.getElementById('usernameInput-active'); // 사용자 이름 입력 필드를 가져옵니다.
//     const messageInput = document.getElementById('messageInput-active'); // 메시지 내용 입력 필드를 가져옵니다.
//     const groupNameInput = document.getElementById('groupNameInput-active'); // 현재 활성 그룹 이름을 담고 있는 숨겨진 입력 필드를 가져옵니다.

//     const username = usernameInput.value.trim(); // 사용자 이름 입력 필드의 값을 가져와 앞뒤 공백을 제거합니다.
//     const content = messageInput.value.trim(); // 메시지 내용 입력 필드의 값을 가져와 앞뒤 공백을 제거합니다.
//     const groupName = groupNameInput.value; // 현재 활성 그룹 이름을 가져옵니다.

//     if (!username || !content) { // 사용자 이름이나 메시지 내용이 비어있다면:
//         alert('Please enter your name and a message.'); // 경고 메시지를 표시합니다.
//         return; // 함수 실행을 중단합니다.
//     }

//     try { // 메시지 전송 작업을 시도합니다.
//         const response = await fetch('/chat/send/', { // 서버의 '/chat/send/' 엔드포인트로 POST 요청을 보냅니다.
//             method: 'POST', // HTTP 메서드를 POST로 설정합니다.
//             headers: { // 요청 헤더를 설정합니다.
//                 'Content-Type': 'application/json', // 본문 내용이 JSON 형식임을 알립니다.
//                 'X-CSRFToken': getCookie('csrftoken'), // CSRF 보호를 위해 쿠키에서 CSRF 토큰을 가져와 헤더에 추가합니다.
//             },
//             body: JSON.stringify({ // 요청 본문을 JSON 문자열로 변환하여 보냅니다.
//                 username: username, // 사용자 이름
//                 content: content, // 메시지 내용
//                 group_name: groupName, // 현재 활성 그룹 이름
//             }),
//         });

//         const data = await response.json(); // 응답 본문을 JSON으로 파싱합니다.
//         if (response.ok) { // HTTP 응답이 성공(2xx)인 경우:
//             if (data.status === 'success') { // JSON 데이터의 `status`가 'success'인 경우:
//                 messageInput.value = ''; // 메시지 입력 필드를 비웁니다.
//             } else { // JSON 데이터의 `status`가 'success'가 아닌 경우:
//                 console.error('Server error sending message:', data.message); // 서버 오류 메시지를 콘솔에 출력합니다.
//                 alert('Error sending message: ' + data.message); // 사용자에게 오류 메시지를 경고로 표시합니다.
//             }
//         } else { // HTTP 응답이 실패(4xx, 5xx)인 경우:
//             console.error( // HTTP 오류 메시지를 콘솔에 출력합니다.
//                 'HTTP error sending message:',
//                 response.status,
//                 data.message || response.statusText
//             );
//             alert('HTTP Error: ' + (data.message || response.statusText)); // 사용자에게 HTTP 오류 메시지를 경고로 표시합니다.
//         }
//     } catch (error) { // 네트워크 오류 또는 JSON 파싱 오류와 같은 예외가 발생한 경우:
//         console.error('Network or JSON error:', error); // 네트워크 또는 JSON 오류 메시지를 콘솔에 출력합니다.
//         alert('Cannot connect to server to send message.'); // 사용자에게 서버 연결 오류 메시지를 경고로 표시합니다.
//     }
// }

// // Function to initialize EventSource (SSE) for a group // 그룹에 대한 EventSource (SSE)를 초기화하는 함수입니다.
// function initEventSource(groupName) { // `groupName`을 인자로 받습니다.
//     // Close existing EventSource if active for the previous group // 이전 그룹에 대한 EventSource가 활성 상태인 경우 닫습니다.
//     if ( // 현재 `groupName`에 대한 EventSource가 이미 존재하고 열려 있다면:
//         eventSources[groupName] &&
//         eventSources[groupName].readyState === EventSource.OPEN
//     ) {
//         return; // 함수 실행을 중단합니다. (이미 연결되어 있으므로 새로 열 필요 없음)
//     }
//     // Close any other active EventSources before opening a new one // 새 EventSource를 열기 전에 다른 활성 EventSource를 모두 닫습니다.
//     for (const key in eventSources) { // `eventSources` 객체의 모든 키(그룹 이름)에 대해 반복합니다.
//         if (eventSources[key].readyState === EventSource.OPEN) { // 해당 그룹의 EventSource가 열려 있다면:
//             eventSources[key].close(); // 해당 EventSource 연결을 닫습니다.
//             delete eventSources[key]; // `eventSources` 객체에서 해당 항목을 삭제합니다.
//             console.log(`Closed SSE for group: ${key}`); // 콘솔에 SSE 연결 닫힘 메시지를 출력합니다.
//         }
//     }

//     const chatLog = document.getElementById('chatLog-active'); // 'chatLog-active' ID를 가진 HTML 요소를 가져옵니다.
//     if (!chatLog) { // `chatLog` 요소가 없으면:
//         console.error(`chatLog-active not found for initEventSource.`); // 오류 메시지를 콘솔에 출력합니다.
//         return; // 함수 실행을 중단합니다.
//     }

//     const source = new EventSource(`/chat/stream/${groupName}/`); // 새 `EventSource` 객체를 생성하여 서버의 `/chat/stream/{groupName}/` 엔드포인트에 연결합니다.
//     eventSources[groupName] = source; // 새로 생성된 `EventSource` 객체를 `eventSources` 객체에 `groupName`을 키로 저장합니다.

//     source.onmessage = function (e) { // 서버로부터 메시지가 도착할 때 실행될 이벤트 핸들러를 정의합니다.
//         try { // 메시지 파싱 및 처리를 시도합니다.
//             const messageData = JSON.parse(e.data); // 수신된 데이터(`e.data`)를 JSON으로 파싱합니다.
//             // Only append if the message is for the currently active chat group // 메시지가 현재 활성화된 채팅 그룹에 대한 것일 경우에만 추가합니다.
//             if (messageData.group_name === currentActiveChatGroup) { // 수신된 메시지의 `group_name`이 `currentActiveChatGroup`과 같다면:
//                 const msgElement = createMessageElement(messageData); // `createMessageElement`를 사용하여 메시지 HTML 요소를 생성합니다.
//                 chatLog.appendChild(msgElement); // 생성된 메시지 요소를 `chatLog`에 추가합니다.
//                 chatLog.scrollTop = chatLog.scrollHeight; // `chatLog`를 맨 아래로 스크롤하여 최신 메시지가 보이도록 합니다.
//             }
//         } catch (error) { // JSON 파싱 오류 또는 메시지 처리 중 오류가 발생한 경우:
//             console.error( // 오류 메시지를 콘솔에 출력합니다.
//                 'JSON parsing error or SSE message processing error:',
//                 error,
//                 e.data
//             );
//         }
//     };

//     source.onerror = function (err) { // EventSource 연결에 오류가 발생할 때 실행될 이벤트 핸들러를 정의합니다.
//         console.error('EventSource failed for group ' + groupName + ':', err); // 오류 메시지를 콘솔에 출력합니다.
//         source.close(); // 현재 EventSource 연결을 닫습니다.
//         delete eventSources[groupName]; // `eventSources` 객체에서 해당 항목을 삭제합니다.
//         setTimeout(() => initEventSource(groupName), 3000); // 3초 후에 `initEventSource`를 다시 호출하여 재연결을 시도합니다.
//     };
//     console.log(`Opened SSE for group: ${groupName}`); // 콘솔에 SSE 연결 시작 메시지를 출력합니다.
// }

// // Function to populate the chat room list // 채팅방 목록을 채우는 함수입니다.
// function loadChatRoomList() {
//     const chatRoomListUl = document.getElementById('chatRoomList'); // 'chatRoomList' ID를 가진 `<ul>` 요소를 가져옵니다.
//     if (!chatRoomListUl) { // `chatRoomListUl` 요소가 없으면:
//         console.error('Chat room list element not found!'); // 오류 메시지를 콘솔에 출력합니다.
//         return; // 함수 실행을 중단합니다.
//     }

//     // For now, hardcode some chat rooms. In a real app, you'd fetch this from your backend. // 현재는 채팅방을 하드코딩합니다. 실제 앱에서는 백엔드에서 가져와야 합니다.
//     const chatRooms = [ // 채팅방 객체 배열을 정의합니다.
//         { name: 'Public', groupName: 'public' }, // 공용 채팅방
//         { name: 'User 1', groupName: 'private_user1_loggedInUser' }, // 예시 개인 채팅방 (사용자 1과 로그인된 사용자)
//         { name: 'User 5', groupName: 'private_user5_loggedInUser' }, // 예시 개인 채팅방 (사용자 5와 로그인된 사용자)
//         // Add more dynamically fetched rooms here // 여기에 동적으로 가져온 방을 추가합니다.
//     ];

//     chatRoomListUl.innerHTML = ''; // 기존 목록을 지웁니다.
//     chatRooms.forEach((room) => { // 각 채팅방 객체에 대해 반복합니다.
//         const listItem = document.createElement('li'); // `<li>` 요소를 생성합니다.
//         listItem.classList.add('list-group-item'); // `listItem`에 'list-group-item' CSS 클래스를 추가합니다.
//         if (room.groupName === currentActiveChatGroup) { // 현재 방의 `groupName`이 `currentActiveChatGroup`과 같으면:
//             listItem.classList.add('active'); // 'active' CSS 클래스를 추가하여 활성화된 방임을 표시합니다.
//         }
//         listItem.dataset.groupName = room.groupName; // `data-group-name` HTML 데이터 속성을 설정하여 그룹 이름을 저장합니다.
//         listItem.textContent = room.name; // `listItem`의 텍스트 내용을 방 이름으로 설정합니다.
//         listItem.style.cursor = 'pointer'; // 마우스 커서를 포인터로 변경하여 클릭 가능함을 나타냅니다.

//         listItem.onclick = () => switchChatRoom(room.groupName); // `listItem`을 클릭했을 때 `switchChatRoom` 함수를 호출하도록 설정합니다.
//         chatRoomListUl.appendChild(listItem); // `listItem`을 `chatRoomListUl`의 자식으로 추가합니다.
//     });
// }

// // Function to switch between chat rooms // 채팅방을 전환하는 함수입니다.
// function switchChatRoom(newGroupName) { // 새 그룹 이름을 인자로 받습니다.
//     if (currentActiveChatGroup === newGroupName) { // 이미 같은 방에 있다면:
//         return; // 함수 실행을 중단합니다.
//     }

//     // Update active class in the list // 목록에서 활성 클래스를 업데이트합니다.
//     const oldActiveItem = document.querySelector( // 현재 활성 상태인 목록 항목을 찾습니다.
//         `#chatRoomList .list-group-item.active`
//     );
//     if (oldActiveItem) { // 이전 활성 항목이 있다면:
//         oldActiveItem.classList.remove('active'); // 'active' 클래스를 제거합니다.
//     }
//     const newActiveItem = document.querySelector( // 새 활성 항목을 찾습니다.
//         `#chatRoomList [data-group-name="${newGroupName}"]`
//     );
//     if (newActiveItem) { // 새 활성 항목이 있다면:
//         newActiveItem.classList.add('active'); // 'active' 클래스를 추가합니다.
//     }

//     // Update current active group // 현재 활성 그룹을 업데이트합니다.
//     currentActiveChatGroup = newGroupName; // `currentActiveChatGroup` 변수를 새 그룹 이름으로 업데이트합니다.

//     // Update header of the right column // 오른쪽 컬럼의 헤더를 업데이트합니다.
//     const activeChatRoomName = document.getElementById('activeChatRoomName'); // 'activeChatRoomName' ID를 가진 요소를 가져옵니다.
//     if (activeChatRoomName) { // 요소가 존재하면:
//         activeChatRoomName.textContent = // 텍스트 내용을 업데이트합니다.
//             newGroupName === 'public' // 새 그룹 이름이 'public'이면,
//                 ? 'Public Chat Room' // 'Public Chat Room'으로 설정하고,
//                 : `Chat with ${newGroupName.split('_').slice(1).join(', ')}`; // 그렇지 않으면 그룹 이름에서 'private_' 부분을 제거하고 사용자 이름만 추출하여 표시합니다.
//     }

//     // Update hidden input for sending messages // 메시지 전송을 위한 숨겨진 입력 필드를 업데이트합니다.
//     const groupNameInput = document.getElementById('groupNameInput-active'); // 'groupNameInput-active' ID를 가진 요소를 가져옵니다.
//     if (groupNameInput) { // 요소가 존재하면:
//         groupNameInput.value = newGroupName; // 해당 필드의 값을 새 그룹 이름으로 설정합니다.
//     }

//     // Clear current messages // 현재 메시지를 지웁니다.
//     const chatLog = document.getElementById('chatLog-active'); // 'chatLog-active' ID를 가진 요소를 가져옵니다.
//     if (chatLog) { // 요소가 존재하면:
//         chatLog.innerHTML = ''; // `chatLog`의 모든 자식 요소를 제거하여 메시지를 지웁니다.
//         chatLog.scrollTop = chatLog.scrollHeight; // 스크롤을 맨 아래로 리셋합니다.
//     }

//     // Close existing SSE for previous group if any (handled in initEventSource, but explicit close here is safer) // 이전 그룹에 대한 기존 SSE 연결이 있다면 닫습니다. (initEventSource에서 처리되지만 명시적으로 닫는 것이 더 안전)
//     if ( // `currentActiveChatGroup`에 대한 EventSource가 존재하고 열려 있다면:
//         eventSources[currentActiveChatGroup] &&
//         eventSources[currentActiveChatGroup].readyState === EventSource.OPEN
//     ) {
//         eventSources[currentActiveChatGroup].close(); // EventSource 연결을 닫습니다.
//         delete eventSources[currentActiveChatGroup]; // `eventSources` 객체에서 해당 항목을 삭제합니다.
//     }

//     // Load history and initialize SSE for the new group // 새 그룹에 대한 기록을 로드하고 SSE를 초기화합니다.
//     messageOffsets[newGroupName] = 0; // 새 그룹의 메시지 오프셋을 0으로 리셋합니다.
//     loadMessageHistory(newGroupName); // 새 그룹의 메시지 기록을 로드합니다.
//     initEventSource(newGroupName); // 새 그룹에 대한 SSE 연결을 초기화합니다.

//     // Focus on message input // 메시지 입력에 포커스합니다.
//     const messageInput = document.getElementById('messageInput-active'); // 'messageInput-active' ID를 가진 요소를 가져옵니다.
//     if (messageInput) { // 요소가 존재하면:
//         messageInput.focus(); // 입력 필드에 포커스를 설정합니다.
//     }
// }

// // Function to request creation/retrieval of a private group // 개인 그룹 생성/가져오기를 요청하는 함수입니다.
// async function promptPrivateChat(targetUsername, targetUserId) { // 대상 사용자 이름과 (선택적으로) 대상 사용자 ID를 인자로 받습니다.
//     const currentUsernameInput = document.getElementById('usernameInput-active'); // 현재 사용자 이름 입력 필드를 가져옵니다.
//     if (!currentUsernameInput || !currentUsernameInput.value) { // 현재 사용자 이름 입력 필드가 없거나 비어 있다면:
//         alert('Please ensure your username is set.'); // 사용자에게 경고 메시지를 표시합니다.
//         return; // 함수 실행을 중단합니다.
//     }
//     const currentUsername = currentUsernameInput.value.trim(); // 현재 사용자 이름을 가져와 앞뒤 공백을 제거합니다.

//     if (currentUsername === targetUsername) { // 현재 사용자와 대상 사용자가 같다면:
//         alert('You cannot start a private chat with yourself.'); // 자신과 개인 채팅을 시작할 수 없다는 경고 메시지를 표시합니다.
//         return; // 함수 실행을 중단합니다.
//     }

//     if (confirm(`Do you want to start a private chat with ${targetUsername}?`)) { // 사용자에게 `targetUsername`과 개인 채팅을 시작할지 확인 대화 상자를 띄웁니다.
//         try { // 개인 채팅 그룹 생성/가져오기 작업을 시도합니다.
//             const response = await fetch('/chat/group/create/private', { // 서버의 '/chat/group/create/private' 엔드포인트로 POST 요청을 보냅니다.
//                 method: 'POST', // HTTP 메서드를 POST로 설정합니다.
//                 headers: { // 요청 헤더를 설정합니다.
//                     'Content-Type': 'application/x-www-form-urlencoded', // 본문 내용이 URL 인코딩된 폼 데이터 형식임을 알립니다.
//                     'X-CSRFToken': getCookie('csrftoken'), // CSRF 보호를 위해 CSRF 토큰을 가져와 헤더에 추가합니다.
//                 },
//                 body: new URLSearchParams({ // 요청 본문을 URLSearchParams 객체로 생성하여 인코딩합니다.
//                     current_username: currentUsername, // 현재 사용자 이름
//                     target_username: targetUsername, // 대상 사용자 이름
//                     // target_user_id: targetUserId // if your backend uses user_id // 백엔드가 사용자 ID를 사용한다면 주석을 해제하여 전달합니다.
//                 }).toString(), // URLSearchParams 객체를 문자열로 변환합니다.
//             });

//             const data = await response.json(); // 응답 본문을 JSON으로 파싱합니다.
//             if (response.ok) { // HTTP 응답이 성공(2xx)인 경우:
//                 if (data.status === 'success' && data.group_name) { // JSON 데이터의 `status`가 'success'이고 `group_name`이 존재한다면:
//                     console.log( // 성공 메시지를 콘솔에 출력합니다.
//                         `Private chat group ${data.group_name} created/retrieved.`
//                     );
//                     // After creating/retrieving, add it to the list and switch to it // 생성/가져오기 후, 목록에 추가하고 해당 방으로 전환합니다.
//                     loadChatRoomList(); // 채팅방 목록을 다시 로드하여 새로운 개인 채팅방을 포함시킵니다.
//                     switchChatRoom(data.group_name); // 새로 생성되거나 찾아진 개인 채팅방으로 전환합니다.
//                 } else { // `status`가 'success'가 아니거나 `group_name`이 없는 경우:
//                     console.error('Server error creating private group:', data.message); // 서버 오류 메시지를 콘솔에 출력합니다.
//                     alert('Error creating private group: ' + data.message); // 사용자에게 오류 메시지를 경고로 표시합니다.
//                 }
//             } else { // HTTP 응답이 실패(4xx, 5xx)인 경우:
//                 console.error( // HTTP 오류 메시지를 콘솔에 출력합니다.
//                     'HTTP error creating private group:',
//                     response.status,
//                     data.error || response.statusText
//                 );
//                 alert('HTTP Error: ' + (data.error || response.statusText)); // 사용자에게 HTTP 오류 메시지를 경고로 표시합니다.
//             }
//         } catch (error) { // 네트워크 오류 또는 JSON 파싱 오류와 같은 예외가 발생한 경우:
//             console.error('Network error creating private group:', error); // 네트워크 오류 메시지를 콘솔에 출력합니다.
//             alert('Cannot connect to server to create private group.'); // 사용자에게 서버 연결 오류 메시지를 경고로 표시합니다.
//         }
//     }
// }

// // Main chat controller function, called after login // 로그인 후 호출되는 메인 채팅 컨트롤러 함수입니다.
// export function chatController() { // 이 함수는 외부에서 가져올 수 있도록 `export`됩니다.
//     // 1. Initialize Bootstrap Modal // Bootstrap 모달을 초기화합니다.
//     const mainChatWindowElement = document.getElementById('mainChatWindow'); // 'mainChatWindow' ID를 가진 모달 요소를 가져옵니다.
//     if (mainChatWindowElement) { // 모달 요소가 존재하면:
//         mainChatBootstrapModal = new bootstrap.Modal(mainChatWindowElement); // Bootstrap `Modal` 클래스의 새 인스턴스를 생성하여 `mainChatBootstrapModal`에 할당합니다.

//         mainChatWindowElement.addEventListener('shown.bs.modal', () => { // 모달이 완전히 표시된 후에(shown.bs.modal) 실행될 이벤트 리스너를 추가합니다.
//             console.log('Main Chat Window is shown'); // 콘솔에 모달이 표시되었음을 기록합니다.
//             // Ensure chat list is loaded and default chat room is active when modal opens // 모달이 열릴 때 채팅 목록이 로드되고 기본 채팅방이 활성화되도록 합니다.
//             loadChatRoomList(); // 채팅방 목록을 로드합니다.
//             switchChatRoom(currentActiveChatGroup); // 현재 활성화된(또는 기본) 채팅 그룹으로 전환합니다.
//             const messageInput = document.getElementById('messageInput-active'); // 메시지 입력 필드를 가져옵니다.
//             if (messageInput) { // 입력 필드가 존재하면:
//                 messageInput.focus(); // 입력 필드에 포커스를 설정합니다.
//             }
//         });
//         mainChatWindowElement.addEventListener('hidden.bs.modal', () => { // 모달이 완전히 숨겨진 후에(hidden.bs.modal) 실행될 이벤트 리스너를 추가합니다.
//             console.log('Main Chat Window is hidden'); // 콘솔에 모달이 숨겨졌음을 기록합니다.
//             // Optionally close active SSE connection when modal closes // 선택적으로 모달이 닫힐 때 활성 SSE 연결을 닫습니다.
//             if (eventSources[currentActiveChatGroup]) { // 현재 활성 그룹에 대한 EventSource가 존재하면:
//                 eventSources[currentActiveChatGroup].close(); // EventSource 연결을 닫습니다.
//                 delete eventSources[currentActiveChatGroup]; // `eventSources` 객체에서 해당 항목을 삭제합니다.
//             }
//         });
//     } else { // 모달 요소가 존재하지 않으면:
//         console.error('Main chat window modal element not found!'); // 오류 메시지를 콘솔에 출력합니다.
//         return; // 함수 실행을 중단합니다.
//     }

//     // 2. Main Chat Toggle Button setup // 메인 채팅 토글 버튼을 설정합니다.
//     const mainChatToggleButton = document.getElementById('mainChatToggleButton'); // 'mainChatToggleButton' ID를 가진 요소를 가져옵니다.
//     if (mainChatToggleButton) { // 버튼 요소가 존재하면:
//         mainChatToggleButton.style.display = 'flex'; // CSS `display` 속성을 'flex'로 설정하여 버튼을 보이게 합니다. (원래 'none'일 수 있음)
//                                                   // 참고: CSS를 통해 `display`를 'flex'로 설정하는 것이 더 일반적입니다.

//         mainChatToggleButton.onclick = () => { // 버튼을 클릭했을 때 실행될 이벤트 핸들러를 정의합니다.
//             mainChatBootstrapModal.show(); // Bootstrap 모달을 표시합니다.
//         };
//     } else { // 버튼 요소가 존재하지 않으면:
//         console.error('Main chat toggle button not found.'); // 오류 메시지를 콘솔에 출력합니다.
//     }

//     // 3. Attach send message event listener // 메시지 전송 이벤트 리스너를 연결합니다.
//     const sendMessageBtn = document.getElementById('sendMessageBtn'); // 'sendMessageBtn' ID를 가진 요소를 가져옵니다.
//     if (sendMessageBtn) { // 버튼 요소가 존재하면:
//         sendMessageBtn.addEventListener('click', sendMessage); // 클릭 이벤트 리스너를 추가하여 클릭 시 `sendMessage` 함수를 호출합니다.
//     }
//     const messageInput = document.getElementById('messageInput-active'); // 메시지 입력 필드를 가져옵니다.
//     if (messageInput) { // 입력 필드가 존재하면:
//         messageInput.addEventListener('keypress', function (e) { // `keypress` 이벤트 리스너를 추가합니다. (사용자가 키를 눌렀다 뗄 때)
//             if (e.key === 'Enter') { // 눌린 키가 'Enter'인 경우:
//                 e.preventDefault(); // Enter 키의 기본 동작(예: 새 줄 삽입)을 방지합니다.
//                 sendMessage(); // `sendMessage` 함수를 호출하여 메시지를 전송합니다.
//             }
//         });
//     }

//     // Set initial username (you should get this from your login response or a user profile) // 초기 사용자 이름을 설정합니다. (로그인 응답이나 사용자 프로필에서 가져와야 함)
//     const usernameInput = document.getElementById('usernameInput-active'); // 'usernameInput-active' ID를 가진 요소를 가져옵니다.
//     if (usernameInput) { // 요소가 존재하면:
//         usernameInput.value = 'LoggedInUser'; // 필드의 값을 'LoggedInUser'로 설정합니다. (실제 사용자 이름으로 교체 필요)
//     }
// }