// // chat in bubble style
// import { getCookie } from '../utils.js'; // getCookie만 필요.

// const chatBubbles = {}; // Stores references to chat bubble DOM elements by groupName
// const eventSources = {}; // Stores EventSource objects by groupName
// const messageOffsets = {}; // Stores the offset for message history for each group

// // Helper to create an HTML message element
// function createMessageElement(messageData, groupName) {
// 	const msg = document.createElement('div');
// 	msg.classList.add('chat-message');

// 	// Dynamically get the current username from the specific chat bubble's input
// 	const usernameInput = document.getElementById(`usernameInput-${groupName}`);
// 	const currentUsername = usernameInput ? usernameInput.value : '';

// 	if (
// 		messageData.sender === currentUsername ||
// 		messageData.sender__username === currentUsername
// 	) {
// 		msg.classList.add('self');
// 	} else {
// 		msg.classList.add('other');
// 	}

// 	const senderSpan = document.createElement('span');
// 	senderSpan.classList.add('message-sender');
// 	senderSpan.textContent = messageData.sender__username || messageData.sender;

// 	const displayedSender = messageData.sender__username || messageData.sender;
// 	if (displayedSender && displayedSender !== currentUsername) {
// 		senderSpan.style.cursor = 'pointer';
// 		senderSpan.style.textDecoration = 'underline';
// 		senderSpan.onclick = () =>
// 			promptPrivateChat(displayedSender, messageData.sender_id || null);
// 	}
// 	msg.appendChild(senderSpan);

// 	const contentText = document.createTextNode(messageData.content);
// 	msg.appendChild(contentText);

// 	const timestampSpan = document.createElement('span');
// 	timestampSpan.classList.add('message-timestamp');
// 	timestampSpan.textContent = messageData.timestamp;
// 	msg.appendChild(timestampSpan);

// 	return msg;
// }

// // Function to load message history
// async function loadMessageHistory(groupName, prepend = false) {
// 	const chatLog = document.getElementById(`chatLog-${groupName}`);
// 	if (!chatLog) {
// 		console.error(`chatLog-${groupName} not found to load history.`);
// 		return;
// 	}

// 	const offset = messageOffsets[groupName] || 0;
// 	const limit = 20;

// 	try {
// 		const response = await fetch(
// 			`/chat/history/${groupName}/?offset=${offset}&limit=${limit}`
// 		);
// 		const data = await response.json();

// 		if (response.ok && data.status === 'success') {
// 			if (data.messages.length > 0) {
// 				const fragment = document.createDocumentFragment();
// 				data.messages.forEach((msgData) => {
// 					const msgElement = createMessageElement(msgData, groupName);
// 					fragment.appendChild(msgElement);
// 				});

// 				if (prepend) {
// 					const oldScrollHeight = chatLog.scrollHeight;
// 					chatLog.insertBefore(fragment, chatLog.firstChild);
// 					const newScrollHeight = chatLog.scrollHeight;
// 					chatLog.scrollTop = newScrollHeight - oldScrollHeight;
// 				} else {
// 					chatLog.appendChild(fragment);
// 					chatLog.scrollTop = chatLog.scrollHeight;
// 				}
// 				messageOffsets[groupName] = offset + data.messages.length;
// 			} else if (!prepend) {
// 				console.log(`No history for ${groupName} or end of history.`);
// 			}
// 		} else {
// 			console.error('Error loading history:', data.message || 'Unknown error');
// 		}
// 	} catch (error) {
// 		console.error('Network error while loading history:', error);
// 	}
// }

// // Colors for private chat bubble buttons
// const privateChatButtonColors = [
// 	'color1',
// 	'color2',
// 	'color3',
// 	'color4',
// 	'color5',
// ];
// const assignedPrivateChatColors = {};

// // Function to hide all chat bubbles and show their respective toggle buttons
// function hideAllChatBubbles() {
// 	for (const groupName in chatBubbles) {
// 		const bubble = chatBubbles[groupName];
// 		bubble.style.display = 'none'; // Hide the bubble itself
// 		const button = document.getElementById(`chatToggleButton-${groupName}`);
// 		if (button) {
// 			button.style.display = 'flex'; // Show the minimized toggle button
// 		}
// 	}
// 	updateChatBubblePositions(); // Recalculate positions after hiding
// }

// // Function to create and manage chat toggle buttons (for minimized bubbles)
// function createChatToggleButton(groupName, isPrivate = false) {
// 	const buttonsContainer = document.getElementById('chatButtonsContainer');
// 	if (!buttonsContainer) {
// 		console.error(
// 			'chatButtonsContainer not found. Cannot create chat toggle button.'
// 		);
// 		return null;
// 	}

// 	let button = document.getElementById(`chatToggleButton-${groupName}`);
// 	if (button) {
// 		return button; // Button already exists
// 	}

// 	button = document.createElement('button');
// 	button.classList.add('chat-toggle-button');
// 	button.id = `chatToggleButton-${groupName}`;

// 	if (isPrivate) {
// 		button.classList.add('private');
// 		let colorClass = assignedPrivateChatColors[groupName];
// 		if (!colorClass) {
// 			const colorIndex =
// 				Object.keys(assignedPrivateChatColors).length %
// 				privateChatButtonColors.length;
// 			colorClass = privateChatButtonColors[colorIndex];
// 			assignedPrivateChatColors[groupName] = colorClass;
// 		}
// 		button.classList.add(colorClass);

// 		const participants = groupName.split('_').slice(1);
// 		if (participants.length >= 2) {
// 			// Display initial of the other user in private chat button
// 			const otherUser = participants[0]; // Assuming the first is the other user
// 			button.textContent = otherUser.charAt(0).toUpperCase();
// 		} else {
// 			button.textContent = '🔒'; // Fallback for private
// 		}
// 	} else {
// 		button.textContent = '💬'; // Default for general chat button
// 	}

// 	button.onclick = () => {
// 		toggleChat(groupName, true); // Force display when button is clicked
// 	};

// 	buttonsContainer.prepend(button); // Add new button to the top of the container
// 	return button;
// }

// // Function to create a dynamic chat bubble (General or Private)
// async function createChatBubble(groupName, isPrivate = false) {
// 	if (chatBubbles[groupName]) {
// 		// If bubble already exists, just toggle it to show
// 		toggleChat(groupName, true);
// 		return;
// 	}

// 	const chatContainer = document.createElement('div');
// 	chatContainer.classList.add('chat-bubble');
// 	chatContainer.id = `chatBubble-${groupName}`;

// 	// Position calculation for multiple bubbles
// 	const activeBubbles = Object.values(chatBubbles).filter(
// 		(bubble) => bubble.style.display === 'flex'
// 	).length;
// 	chatContainer.style.right = `${20 + activeBubbles * 340}px`; // Adjust 340px based on bubble width + gap

// 	let headerTitle = isPrivate
// 		? `Private Chat (${groupName.split('_').slice(1).join(', ')})`
// 		: 'General Chat';
// 	if (groupName === 'general') {
// 		// For general chat, a simpler title
// 		headerTitle = 'General Chat';
// 	} else if (isPrivate) {
// 		// For private chats, identify the other user
// 		const loggedInUser =
// 			document.getElementById('usernameInput-general')?.value || ''; // Assume general chat's username input for current user
// 		const participants = groupName.split('_').slice(1);
// 		const otherUser =
// 			participants.find((p) => p !== loggedInUser) || participants[0];
// 		headerTitle = `Chat with ${otherUser}`;
// 	}

// 	chatContainer.innerHTML = `
//         <div class="chat-header">
//             <span>${headerTitle}</span>
//             <button class="close-btn" id="closeChatBtn-${groupName}">&times;</button>
//         </div>
//         <div class="chat-body" id="chatLog-${groupName}"></div>
//         <div class="chat-footer">
//             ${
// 							isPrivate
// 								? ''
// 								: `<input type="text" id="usernameInput-${groupName}" placeholder="Your name" value="UserLoggedIn">`
// 						}
//             <input type="text" id="messageInput-${groupName}" placeholder="Type a message...">
//             <input type="hidden" id="groupNameInput-${groupName}" value="${groupName}">
//             <button onclick="sendMessage('${groupName}')">Send</button>
//         </div>
//     `;

// 	document.body.appendChild(chatContainer); // Add bubble to the body
// 	chatBubbles[groupName] = chatContainer;

// 	// Set default username if general chat
// 	if (!isPrivate) {
// 		const usernameInputGeneral = document.getElementById(
// 			'usernameInput-general'
// 		);
// 		if (usernameInputGeneral) {
// 			usernameInputGeneral.value = 'UserLoggedIn'; // Replace with actual logged in user
// 		}
// 	}

// 	// Attach close button event listener
// 	const closeBtn = document.getElementById(`closeChatBtn-${groupName}`);
// 	if (closeBtn) {
// 		closeBtn.onclick = () => toggleChat(groupName, false); // Toggle to hide
// 	}

// 	// Create the toggle button for this bubble
// 	createChatToggleButton(groupName, isPrivate);

// 	// Initial load of history and SSE connection
// 	await loadMessageHistory(groupName);
// 	initEventSource(groupName);

// 	// Attach scroll event listener for loading older messages
// 	const chatLog = document.getElementById(`chatLog-${groupName}`);
// 	if (chatLog) {
// 		chatLog.addEventListener('scroll', function () {
// 			if (chatLog.scrollTop === 0) {
// 				loadMessageHistory(groupName, true); // Prepend older messages
// 			}
// 		});
// 		chatLog.scrollTop = chatLog.scrollHeight; // Scroll to bottom on load
// 	}

// 	chatContainer.style.display = 'flex'; // Show the bubble after creation
// 	updateChatBubblePositions(); // Update positions after new bubble added
// }

// // Function to show/hide a chat bubble
// function toggleChat(groupName, forceDisplay = false) {
// 	const bubble = chatBubbles[groupName];
// 	const button = document.getElementById(`chatToggleButton-${groupName}`);

// 	if (!bubble) {
// 		console.error(`Chat bubble for ${groupName} not found.`);
// 		return;
// 	}

// 	if (forceDisplay || bubble.style.display === 'none') {
// 		// Show bubble, hide its toggle button
// 		hideAllChatBubbles(); // Hide all other bubbles first for better UX (optional)
// 		bubble.style.display = 'flex';
// 		if (button) {
// 			button.style.display = 'none';
// 		}
// 		// Focus on message input when opened
// 		const messageInput = document.getElementById(`messageInput-${groupName}`);
// 		if (messageInput) {
// 			messageInput.focus();
// 		}
// 		const chatLog = document.getElementById(`chatLog-${groupName}`);
// 		if (chatLog) {
// 			chatLog.scrollTop = chatLog.scrollHeight; // Scroll to bottom
// 		}
// 	} else {
// 		// Hide bubble, show its toggle button
// 		bubble.style.display = 'none';
// 		if (button) {
// 			button.style.display = 'flex';
// 		}
// 	}
// 	updateChatBubblePositions(); // Update positions after state change
// }

// // Function to send a message
// async function sendMessage(groupName) {
// 	const usernameInput = document.getElementById(`usernameInput-${groupName}`);
// 	const messageInput = document.getElementById(`messageInput-${groupName}`);
// 	const groupNameInput = document.getElementById(`groupNameInput-${groupName}`);

// 	const username = usernameInput.value.trim();
// 	const content = messageInput.value.trim();
// 	const currentGroupName = groupNameInput.value;

// 	if (!username || !content) {
// 		alert('Please enter your name and a message.');
// 		return;
// 	}

// 	try {
// 		const response = await fetch('/chat/send/', {
// 			method: 'POST',
// 			headers: {
// 				'Content-Type': 'application/json',
// 				'X-CSRFToken': getCookie('csrftoken'),
// 			},
// 			body: JSON.stringify({
// 				username: username,
// 				content: content,
// 				group_name: currentGroupName,
// 			}),
// 		});

// 		const data = await response.json();
// 		if (response.ok) {
// 			if (data.status === 'success') {
// 				messageInput.value = ''; // Clear message input
// 			} else {
// 				console.error('Server error sending message:', data.message);
// 				alert('Error sending message: ' + data.message);
// 			}
// 		} else {
// 			console.error(
// 				'HTTP error sending message:',
// 				response.status,
// 				data.message || response.statusText
// 			);
// 			alert('HTTP Error: ' + (data.message || response.statusText));
// 		}
// 	} catch (error) {
// 		console.error('Network or JSON error:', error);
// 		alert('Cannot connect to server to send message.');
// 	}
// }

// // Function to initialize EventSource (SSE) for a group
// function initEventSource(groupName) {
// 	if (
// 		eventSources[groupName] &&
// 		eventSources[groupName].readyState === EventSource.OPEN
// 	) {
// 		return; // Already open
// 	}

// 	const chatLog = document.getElementById(`chatLog-${groupName}`);
// 	if (!chatLog) {
// 		console.error(`chatLog-${groupName} not found for initEventSource.`);
// 		return;
// 	}

// 	const source = new EventSource(`/chat/stream/${groupName}/`);
// 	eventSources[groupName] = source;

// 	source.onmessage = function (e) {
// 		try {
// 			const messageData = JSON.parse(e.data);
// 			const msgElement = createMessageElement(messageData, groupName);
// 			chatLog.appendChild(msgElement);
// 			chatLog.scrollTop = chatLog.scrollHeight; // Auto-scroll to bottom
// 		} catch (error) {
// 			console.error(
// 				'JSON parsing error or SSE message processing error:',
// 				error,
// 				e.data
// 			);
// 		}
// 	};

// 	source.onerror = function (err) {
// 		console.error('EventSource failed:', err);
// 		// Attempt to reconnect if connection drops
// 		source.close();
// 		delete eventSources[groupName]; // Remove closed source
// 		setTimeout(() => initEventSource(groupName), 3000); // Try reconnecting after 3 seconds
// 	};
// }

// // Function to request creation/retrieval of a private group
// async function promptPrivateChat(targetUsername, targetUserId) {
// 	const currentUsernameInput = document.getElementById('usernameInput-general'); // Get username from general chat
// 	if (!currentUsernameInput || !currentUsernameInput.value) {
// 		alert('Please enter your username in the general chat first.');
// 		return;
// 	}
// 	const currentUsername = currentUsernameInput.value.trim();

// 	if (currentUsername === targetUsername) {
// 		alert('You cannot start a private chat with yourself.');
// 		return;
// 	}

// 	if (confirm(`Do you want to start a private chat with ${targetUsername}?`)) {
// 		try {
// 			const response = await fetch('/chat/group/create/private', {
// 				method: 'POST',
// 				headers: {
// 					'Content-Type': 'application/x-www-form-urlencoded',
// 					'X-CSRFToken': getCookie('csrftoken'),
// 				},
// 				body: new URLSearchParams({
// 					current_username: currentUsername,
// 					target_username: targetUsername,
// 					// target_user_id: targetUserId // if your backend uses user_id
// 				}).toString(),
// 			});

// 			const data = await response.json();
// 			if (response.ok) {
// 				if (data.status === 'success' && data.group_name) {
// 					// Create and display the private chat bubble
// 					createChatBubble(data.group_name, true);
// 				} else {
// 					console.error('Server error creating private group:', data.message);
// 					alert('Error creating private group: ' + data.message);
// 				}
// 			} else {
// 				console.error(
// 					'HTTP error creating private group:',
// 					response.status,
// 					data.error || response.statusText
// 				);
// 				alert('HTTP Error: ' + (data.error || response.statusText));
// 			}
// 		} catch (error) {
// 			console.error('Network error creating private group:', error);
// 			alert('Cannot connect to server to create private group.');
// 		}
// 	}
// }

// // Function to update the position of all active chat bubbles
// function updateChatBubblePositions() {
// 	const activeBubbles = Object.values(chatBubbles).filter(
// 		(bubble) => bubble.style.display === 'flex'
// 	);
// 	let currentOffset = 0; // Starting from the right edge
// 	activeBubbles.forEach((bubble) => {
// 		bubble.style.right = `${20 + currentOffset}px`; // 20px from right edge + offset
// 		currentOffset += bubble.offsetWidth + 20; // Add bubble width + gap
// 	});
// }

// // This function should be called ONLY when the user logs in.
// export function chatController() {
// 	// 1. Main Chat Toggle Button setup
// 	const mainChatToggleButton = document.getElementById('mainChatToggleButton');
// 	if (mainChatToggleButton) {
// 		mainChatToggleButton.style.display = 'flex'; // Make the main button visible

// 		mainChatToggleButton.onclick = () => {
// 			createChatBubble('general', false); // Create/open the general chat bubble
// 		};
// 	} else {
// 		console.error('Main chat toggle button not found.');
// 	}

// 	// 2. Initial state: hide all bubbles and show only the general chat button
// 	hideAllChatBubbles(); // Ensure all bubbles are closed initially

// 	// 3. Optional: Set a default username for the logged-in user (for general chat)
// 	// This will be set when the 'general' chat bubble is first created in createChatBubble
// }

// // Expose sendMessage globally for inline onclick (if you prefer this over addEventListener)
// window.sendMessage = sendMessage;


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
			`/chat/history/${groupName}/?offset=${offset}&limit=${limit}`
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