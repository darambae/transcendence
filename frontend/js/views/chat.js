import {
	actualizeIndexPage,
	getCookie,
	isUserAuthenticated,
	fetchWithRefresh,
	getBlockedStatus,
} from '../utils.js';
import { handleGame2Players } from './multiplayerGameSession.js';
import { routes } from '../routes.js';
import { card_profileController } from './card_profile.js';

let hasOverallUnreadMessages = false;
let mainChatBootstrapModal; // Bootstrap Modal instance
let currentActiveChatGroup = null; // No default active group, will be set on selection
let currentTargetId = null;
let globalEventSource = null; // Global EventSource for general chat notifications
const eventSources = {}; // Stores EventSource objects per groupId
const messageOffsets = {}; // Stores the offset for message history for each group

// Initialize global EventSource for chat notifications
async function initGlobalChatNotifications(currentUserId) {
	// Close existing global connection if any
	if (globalEventSource) {
		globalEventSource.close();
		globalEventSource = null;
	}

	try {
		// Refresh token before establishing connection
		await fetchWithRefresh('/auth/refresh-token/', {
			method: 'GET',
			credentials: 'include',
			headers: { 'X-CSRFToken': getCookie('csrftoken') },
		});

		globalEventSource = new EventSource(`/chat/stream/notification/${currentUserId}/`);

		globalEventSource.addEventListener('chat_notification', function (e) {
			try {
				const notificationData = JSON.parse(e.data);
				console.log('Global: Chat notification received:', notificationData);

				// Vérifier le type de notification
				if (notificationData.type === 'new_chat_group') {
					// Only process if this user is the target (not the creator)
					// Convert both to strings for comparison to handle type differences
					if (notificationData.target_user_id.toString() === currentUserId.toString()) {
						// Show toast notification
						const message = `${notificationData.creator_username} started a new chat with you!`;
						const toast = showChatNotification(message, 'info', 10000);

						// Add click handler to toast for quick access
						toast.style.cursor = 'pointer';
						toast.addEventListener('click', async () => {
							// Open chat modal and switch to the new chat
							const mainChatWindowElement = document.getElementById('mainChatWindow');
							if (!mainChatWindowElement.classList.contains('show')) {
								mainChatBootstrapModal.show();
								// Wait for modal to be shown
								mainChatWindowElement.addEventListener('shown.bs.modal', async function onShown() {
									mainChatWindowElement.removeEventListener('shown.bs.modal', onShown);
									await loadChatRoomList(currentUserId);
									await switchChatRoom(currentUserId, notificationData.group_id, notificationData.creator_id);
								});
							} else {
								// Modal is already open, just switch
								await loadChatRoomList(currentUserId);
								await switchChatRoom(currentUserId, notificationData.group_id, notificationData.creator_id);
							}
							toast.remove();
						});

						// Refresh chat list if modal is open
						const mainChatWindowElement = document.getElementById('mainChatWindow');
						if (mainChatWindowElement && mainChatWindowElement.classList.contains('show')) {
							loadChatRoomList(currentUserId);
						}

						// Add visual indication that there's a new chat
						const mainChatToggleButton = document.getElementById('mainChatToggleButton');
						if (mainChatToggleButton && !hasOverallUnreadMessages) {
							mainChatToggleButton.classList.add('has-unread-overall');
							hasOverallUnreadMessages = true;
						}
					}
				}
			} catch (error) {
				console.error('Error handling chat notification:', error, e.data);
			}
		});

		globalEventSource.addEventListener('block_notification', function (e) {
			try {
				const notificationData = JSON.parse(e.data);
				console.log('Global: Block notification received:', notificationData);

				if (notificationData.target_user_id.toString() === currentUserId.toString()) {
					let message, toastType;

					if (notificationData.action === 'blocked') {
						message = `${notificationData.actor_name} has blocked you`;
						toastType = 'warning';
					} else if (notificationData.action === 'unblocked') {
						message = `${notificationData.actor_name} has unblocked you`;
						toastType = 'info';
					}

					if (message) {
						showChatNotification(message, toastType, 8000);

						if (currentTargetId && currentTargetId.toString() === notificationData.actor_id.toString()) {
							console.log('Block status changed for current chat partner, refreshing chat state');
							refreshChatAfterBlockStatusChange(notificationData.actor_id);
						}
					}
				}
			} catch (error) {
				console.error('Error handling block notification:', error, e.data);
			}
		});

		globalEventSource.onerror = function (err) {
			console.error('Global EventSource failed:', err);
			globalEventSource.close();
			globalEventSource = null;

			// Attempt reconnect after 5 seconds
			setTimeout(() => {
				console.log('Attempting to reconnect global chat notifications...');
				initGlobalChatNotifications(currentUserId);
			}, 5000);
		};

		console.log('Global chat notifications initialized');
	} catch (error) {
		console.error('Error initializing global chat notifications:', error);
	}
}

// Helper function to show toast notifications
function showChatNotification(message, type = 'info', duration = 5000) {
	// Create toast container if it doesn't exist
	let toastContainer = document.getElementById('chat-toast-container');
	if (!toastContainer) {
		toastContainer = document.createElement('div');
		toastContainer.id = 'chat-toast-container';
		toastContainer.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			z-index: 9999;
			max-width: 350px;
		`;
		document.body.appendChild(toastContainer);
	}

	// Create toast element
	const toast = document.createElement('div');
	toast.className = `alert alert-${type} alert-dismissible fade show`;
	toast.style.cssText = `
		margin-bottom: 10px;
		box-shadow: 0 4px 6px rgba(0,0,0,0.1);
		border-radius: 8px;
	`;

	toast.innerHTML = `
		<div style="display: flex; align-items: center;">
			<i class="fas fa-comments" style="margin-right: 10px; font-size: 18px;"></i>
			<span>${message}</span>
			<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
		</div>
	`;

	toastContainer.appendChild(toast);

	// Auto-remove after duration
	setTimeout(() => {
		if (toast.parentNode) {
			toast.remove();
		}
	}, duration);

	return toast;
}

// Helper to create an HTML message element
function createMessageElement(messageData, currentUserId) {
	const msg = document.createElement('div');
	msg.classList.add('chat-message');

	// Determine if the message sender is the current logged-in user
	const isSelf = messageData.sender_id === currentUserId;

	if (isSelf) {
		msg.classList.add('self');
	} else {
		msg.classList.add('other');
	}

	const senderSpan = document.createElement('span');
	senderSpan.classList.add('message-sender');
	senderSpan.textContent = messageData.sender_username;
	msg.appendChild(senderSpan);

	const contentText = document.createTextNode(messageData.content);
	msg.appendChild(contentText);

	const timestampSpan = document.createElement('span');
	timestampSpan.classList.add('message-timestamp');
	// Format timestamp nicely if possible, or just display raw
	// Assuming timestamp comes as ISO 8601 string from backend
	try {
		const date = new Date(messageData.timestamp);
		timestampSpan.textContent = date.toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
		});
	} catch (e) {
		timestampSpan.textContent =
			messageData.timestamp || new Date().toLocaleTimeString();
	}
	msg.appendChild(timestampSpan);

	return msg;
}

// Function to load message history for the active group
async function loadMessageHistory(currentUserId, groupId, prepend = false) {
	const chatLog = document.getElementById('chatLog-active');
	if (groupId === null || groupId === undefined) {
		console.error('No groupId provided for loading history.');
		return;
	}
	if (!chatLog) {
		console.error(`chatLog-active not found for loading history.`);
		return;
	}

	// Clear "No chat selected" or "No messages yet" messages before loading
	const noChatSelectedDiv = chatLog.querySelector('.no-chat-selected');
	if (noChatSelectedDiv) {
		noChatSelectedDiv.remove();
	}
	const noMessagesDiv = chatLog.querySelector('.no-messages-yet');
	if (noMessagesDiv) {
		noMessagesDiv.remove();
	}

	const offset = messageOffsets[groupId] || 0;
	const limit = 20;

	try {
		const response = await fetchWithRefresh(
			`/chat/${groupId}/messages/?offset=${offset}&limit=${limit}`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
			}
		);
		const data = await response.json();

		if (response.ok && data.status === 'success') {
			if (data.messages.length > 0) {
				// Get existing message contents to avoid duplicates
				const existingMessages = Array.from(
					chatLog.querySelectorAll('.chat-message')
				).map((msgEl) => {
					const sender =
						msgEl.querySelector('.message-sender')?.textContent || '';
					const content = msgEl.textContent
						.replace(
							msgEl.querySelector('.message-sender')?.textContent || '',
							''
						)
						.replace(
							msgEl.querySelector('.message-timestamp')?.textContent || '',
							''
						)
						.trim();
					const timestamp =
						msgEl.querySelector('.message-timestamp')?.textContent || '';
					return `${sender}-${content}-${timestamp}`;
				});

				const fragment = document.createDocumentFragment();
				const orderedMessages = [...data.messages].reverse();
				orderedMessages.forEach((msgData) => {
					// Create a unique identifier for the message
					const messageIdentifier = `${msgData.sender_username}-${
						msgData.content
					}-${new Date(msgData.timestamp).toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit',
					})}`;

					// Check if this message already exists in the chat log
					if (!existingMessages.includes(messageIdentifier)) {
						const msgElement = createMessageElement(msgData, currentUserId);
						fragment.appendChild(msgElement);
					}
				});

				if (prepend && fragment.children.length > 0) {
					const oldScrollHeight = chatLog.scrollHeight;
					chatLog.insertBefore(fragment, chatLog.firstChild);
					const newScrollHeight = chatLog.scrollHeight;
					chatLog.scrollTop = newScrollHeight - oldScrollHeight;
				} else if (fragment.children.length > 0) {
					chatLog.appendChild(fragment);
					chatLog.scrollTop = chatLog.scrollHeight;
				}
				// Update offset based on backend's next_offset
				messageOffsets[groupId] = data.next_offset;
			} else if (!prepend && chatLog.children.length === 0) {
				// If no messages at all and not prepending, show "No messages yet"
				const noMessagesYet = document.createElement('div');
				noMessagesYet.classList.add(
					'no-messages-yet',
					'text-center',
					'text-muted',
					'py-5'
				);
				noMessagesYet.innerHTML =
					'<p>No messages yet. Start the conversation!</p>';
				chatLog.appendChild(noMessagesYet);
			}
		} else {
			console.error('Error loading history:', data.message || 'Unknown error');
			alert('Error loading chat history: ' + (data.message || 'Unknown error'));
		}
	} catch (error) {
		console.error('Network error while loading history:', error);
		alert('Network error: Could not load chat history.');
	}
}


function sendMessage(currentUserId) {
	const messageInput = document.getElementById('messageInput-active');
	const groupIdInput = document.getElementById('groupIdInput-active');
	const usernameInput = document.getElementById('usernameInput-active');

	const content = messageInput.value.trim();
	const groupId = groupIdInput.value;
	const username = usernameInput.value;

	const MIN_LENGTH = 1;
	const MAX_LENGTH = 1000; // Set appropriate limit

	if (!content || !groupId) {
		alert(
			'Please ensure you are logged in, selected a chat, and typed a message.'
		);
		return;
	}
	if (content.length < MIN_LENGTH) {
		alert(
			`Message too short (${content.length}/${MIN_LENGTH} characters). Please type a longer message.`
		);
		return;
	}
	if (content.length > MAX_LENGTH) {
		alert(
			`Message too long (${content.length}/${MAX_LENGTH} characters). Please shorten your message.`
		);
		return;
	}

	// Create temporary message data to display immediately
	const tempMessageData = {
		content: content,
		group_id: groupId,
		sender_id: currentUserId,
		sender_username: username,
		timestamp: new Date().toISOString(),
	};

	// Add message to UI immediately
	const chatLog = document.getElementById('chatLog-active');
	if (chatLog) {
		// Remove "No messages yet" if present
		const noMessagesDiv = chatLog.querySelector('.no-messages-yet');
		if (noMessagesDiv) {
			noMessagesDiv.remove();
		}

		const msgElement = createMessageElement(tempMessageData, currentUserId);
		chatLog.appendChild(msgElement);
		chatLog.scrollTop = chatLog.scrollHeight;
	}

	// Clear input field immediately for better UX
	messageInput.value = '';

	fetchWithRefresh(`/chat/${groupId}/messages/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': getCookie('csrftoken'),
		},
		credentials: 'include',
		body: JSON.stringify({
			content: content,
			group_id: groupId,
			sender_id: currentUserId,
			sender_username: username,
		}),
	})
		.then((response) =>
			response.json().then((data) => ({
				data,
				ok: response.ok,
				status: response.status,
				statusText: response.statusText,
			}))
		)
		.then(({ data, ok, status, statusText }) => {
			if (!ok) {
				console.error(
					'HTTP error sending message:',
					status,
					data.message || statusText
				);
				alert('HTTP Error: ' + (data.message || statusText));
			} else if (data.status !== 'success') {
				console.error('Server error sending message:', data.message);
				alert('Error sending message: ' + data.message);
			}
		})
		.catch((error) => {
			console.error('Network or JSON error:', error);
			alert('Cannot connect to server to send message.');
		});
}

function updateGlobalUnreadStatus(hasUnread) {
    const mainChatToggleButton = document.getElementById('mainChatToggleButton');
    
    if (!mainChatToggleButton) return;
    
    if (hasUnread) {
        mainChatToggleButton.classList.add('has-unread-overall');
        console.log('Added unread indicator to chat button');
    } else {
        mainChatToggleButton.classList.remove('has-unread-overall');
        console.log('Removed unread indicator from chat button');
    }
}

async function initializeAllChatConnections(currentUserId) {
	if (!currentUserId) {
		console.log('No user ID provided for chat connections initialization');
		return;
	}

	try {
		console.log('Initializing all chat connections for user:', currentUserId);
		const response = await fetchWithRefresh(`/chat/?t=${Date.now()}`, {
			method: 'GET',
			headers: {
				'X-CSRFToken': getCookie('csrftoken'),
				'Content-Type': 'application/json',
			},
			credentials: 'include',
		});

		if (!response.ok) {
			console.error('Error loading chat list for connections initialization');
			return;
		}

		const data = await response.json();

		if (response.ok && Array.isArray(data.chats)) {
			console.log('Initializing SSE connections for', data.chats.length, 'chats');
			data.chats.forEach((chat) => {
				// Initialize all SSE connections for all existing chats
				initEventSource(chat.group_id, currentUserId);
			});
		}
	} catch (error) {
		console.error('Error initializing chat connections:', error);
	}
}

// Function to initialize EventSource (SSE) for a group
async function initEventSource(groupId, currentUserId) {
	console.log('in initEventSource');
	if (eventSources[groupId]) {
		console.log(
			`Fermeture de la connexion SSE existante pour le groupe ${groupId}.`
		);
		eventSources[groupId].close();
		delete eventSources[groupId];
	}
	try {
		await fetchWithRefresh('/auth/refresh-token/', {
			method: 'GET',
			credentials: 'include',
			headers: { 'X-CSRFToken': getCookie('csrftoken') },
		});
		const source = new EventSource(`/chat/stream/${groupId}/`);

		eventSources[groupId] = source;

		source.addEventListener('refresh_token', async function () {
			console.log('Token refresh requested by server');
			// Make a request that will refresh the token
			try {
				await fetch('/auth/refresh-token/', {
					method: 'GET',
					credentials: 'include',
					headers: {
						'X-CSRFToken': getCookie('csrftoken'),
						'Content-Type': 'application/json',
					},
				});
				console.log('Token refreshed successfully');
			} catch (error) {
				console.error('Failed to refresh token:', error);
			}
		});

		const recentlyReceivedMessages = new Set(); // For message deduplication
		source.onmessage = function (e) {
			try {
				console.log("in on message");
				if (
					e.data === 'heartbeat' ||
					e.data.trim() === ''
				) {
					return;
				}
				const messageData = JSON.parse(e.data);

				// Skip if this message is from the current user (we've already displayed it)
				if (messageData.sender_id === currentUserId) {
					console.log('Skipping own message from SSE');
					return;
				}

				// Create a unique identifier that matches the one used in loadMessageHistory
				const messageTimestamp = new Date(messageData.timestamp).toLocaleTimeString([], { 
					hour: '2-digit', 
					minute: '2-digit' 
				});
				const messageId = `${messageData.sender_username}-${messageData.content}-${messageTimestamp}`;

				// Skip if we've seen this message recently (deduplication)
				if (recentlyReceivedMessages.has(messageId)) {
					console.log('Skipping duplicate message:', messageId);
					return;
				}

				// Add to recently seen messages
				recentlyReceivedMessages.add(messageId);

				// Remove old entries after 10 seconds to prevent set from growing too large
				setTimeout(() => {
					recentlyReceivedMessages.delete(messageId);
				}, 10000);


				const mainChatWindowElement = document.getElementById('mainChatWindow');
				const isModalClosed = !mainChatWindowElement || !mainChatWindowElement.classList.contains('show');
				
				console.log('Modal state - isModalClosed:', isModalClosed, 'currentActiveChatGroup:', currentActiveChatGroup, 'messageGroupId:', messageData.group_id);

				if (isModalClosed || messageData.group_id !== currentActiveChatGroup) {
					console.log('Marking global unread status - modal closed:', isModalClosed, 'different chat:', messageData.group_id !== currentActiveChatGroup);
					updateGlobalUnreadStatus(true);
					
					if (isModalClosed) {
						return;
					}
				}

				if (!isModalClosed && messageData.group_id === currentActiveChatGroup) {
					const chatLog = document.getElementById('chatLog-active');
					if (!chatLog) {
						console.error(`chatLog-active not found for initEventSource.`);
						return;
					}

					// Check if this message already exists in the chat log
					const existingMessages = Array.from(chatLog.querySelectorAll('.chat-message')).map((msgEl) => {
						const sender = msgEl.querySelector('.message-sender')?.textContent || '';
						const content = msgEl.textContent
							.replace(msgEl.querySelector('.message-sender')?.textContent || '', '')
							.replace(msgEl.querySelector('.message-timestamp')?.textContent || '', '')
							.trim();
						const timestamp = msgEl.querySelector('.message-timestamp')?.textContent || '';
						return `${sender}-${content}-${timestamp}`;
					});

					if (existingMessages.includes(messageId)) {
						console.log('Message already exists in chat log, skipping:', messageId);
						return;
					}

					// Remove "No messages yet" if a new message arrives
					const noMessagesDiv = chatLog.querySelector('.no-messages-yet');
					if (noMessagesDiv) {
						noMessagesDiv.remove();
					}
					const msgElement = createMessageElement(messageData, currentUserId);
					chatLog.appendChild(msgElement);
					chatLog.scrollTop = chatLog.scrollHeight;
				}
			} catch (error) {
				console.error(
					'JSON parsing error or SSE message processing error:',
					error,
					e.data
				);
			}
		};

		source.onerror = async function (err) {
			console.error('EventSource failed for group ' + groupId + ':', err);

			// Check if this connection was intentionally closed (cleanup)
			if (!eventSources[groupId] || eventSources[groupId] !== source) {
				console.log(
					'SSE connection was intentionally closed, not reconnecting'
				);
				return;
			}

			source.close();
			delete eventSources[groupId];

			// Only attempt reconnect if currentActiveChatGroup is still this groupId
			// and the connection wasn't intentionally closed
			if (currentActiveChatGroup === groupId) {
				console.log('Refreshing token and reconnecting SSE...');
				await new Promise((resolve) => setTimeout(resolve, 3000));
				setTimeout(() => initEventSource(groupId, currentUserId), 3000); // Attempt reconnect after 3 seconds
			} else {
				console.log('Not reconnecting SSE - chat group no longer active');
			}
		};
		console.log(`Opened SSE for group: ${groupId}`);
	} catch (error) {
		console.error('Error initializing EventSource:', error);
	}
}

// Function to populate the chat room list (now dynamic and 1-to-1 only)
export async function loadChatRoomList(currentUserId) {
	const chatRoomListUl = document.getElementById('chatRoomList');
	if (!chatRoomListUl) {
		console.error('Chat room list element not found!');
		return;
	}
	if (!currentUserId) {
		console.log('Not logged in, cannot load chat list.');
		chatRoomListUl.innerHTML = `<li class="list-group-item text-muted">Please log in to see chats.</li>`;
		return;
	}
	try {
		console.log('Loading chat list for user:', currentUserId);
		const response = await fetchWithRefresh(`/chat/?t=${Date.now()}`, {
			method: 'GET',
			headers: {
				'X-CSRFToken': getCookie('csrftoken'),
				'Content-Type': 'application/json',
			},
			credentials: 'include',
		});
		if (!response.ok) {
			const errorData = await response.json();
			console.error(
				'Error loading chat list:',
				errorData.message || 'Unknown error'
			);
			alert(
				'Error loading chat list: ' + (errorData.message || 'Unknown error')
			);
			return;
		}
		const data = await response.json();

		if (response.ok && Array.isArray(data.chats)) {
			chatRoomListUl.innerHTML = ''; // Clear existing list
			if (data.chats.length === 0) {
				chatRoomListUl.innerHTML = `<li class="list-group-item text-muted">No active chats. Start one!</li>`;
			}
			console.log('Loaded chat list:', data.chats);
			data.chats.forEach((chat) => {
				const listItem = document.createElement('li');
				listItem.classList.add('list-group-item');
				if (chat.group_id === currentActiveChatGroup) {
					listItem.classList.add('active');
				}
				listItem.dataset.groupId = chat.group_id;
				listItem.dataset.targetUserId = chat.receiver_id; // Store ID
				listItem.dataset.receiver = chat.receiver_name; // Store username for display
				listItem.textContent = chat.receiver_name;
				listItem.style.cursor = 'pointer';
				listItem.onclick = async () => {
					try {
						await switchChatRoom(
							currentUserId,
							chat.group_id,
							chat.receiver_id
						);
						listItem.classList.remove('has-unread-messages');
					} catch (e) {
						console.error('Error switching chat room:', e);
						alert('Could not switch chat room. Please try again.');
					}
				};
				chatRoomListUl.appendChild(listItem);
				// *** MODIFICATION : Seulement initialiser SSE si pas déjà présent ***
				if (!eventSources[chat.group_id]) {
					initEventSource(chat.group_id, currentUserId);
				}
			});
		} else {
			console.error(
				'Error loading chat list:',
				data.message || 'Unknown error'
			);
			alert('Error loading chat list: ' + (data.message || 'Unknown error'));
		}
	} catch (error) {
		console.error('Network error while loading chat list:', error);
		alert('Network error: Could not load chat list.');
	}
}

// Function to switch between chat rooms
async function switchChatRoom(currentUserId, newgroupId, targetUserId) {
	if (newgroupId === null || newgroupId === undefined) {
		console.error('No groupId provided for loading history.');
		return;
	}
	if (currentActiveChatGroup === newgroupId) {
		return;
	}

	// Update active class in the list
	const oldActiveItem = document.querySelector(
		`#chatRoomList .list-group-item.active`
	);
	if (oldActiveItem) {
		oldActiveItem.classList.remove('active');
	}
	const newActiveItem = document.querySelector(
		`#chatRoomList [data-group-id="${newgroupId}"]`
	);
	if (newActiveItem) {
		newActiveItem.classList.add('active');
		newActiveItem.classList.remove('has-unread-messages');
	}

	// Update current active group
	currentActiveChatGroup = newgroupId;
	currentTargetId = targetUserId;
	console.log(`Switched to chat room: ${newgroupId}`);

	// *** NOUVEAU : Vérifier s'il reste des chats non lus ***
	const hasOtherUnreadChats = document.querySelector('#chatRoomList .has-unread-messages');
	if (!hasOtherUnreadChats) {
		console.log('No more unread chats, removing global unread status');
		updateGlobalUnreadStatus(false);
	}
	// Update header of the right column with the other user's name
	const activeChatRoomName = document.getElementById('activeChatRoomName');
	const targetChatListItem = document.querySelector(
		`#chatRoomList [data-group-id="${newgroupId}"]`
	);
	if (activeChatRoomName && targetChatListItem) {
		const receiverUsername = targetChatListItem.dataset.receiver;
		activeChatRoomName.innerHTML = `Chat with <a href="#" id="receiverProfileLink" style="text-decoration:underline; cursor:pointer;">${receiverUsername}</a>`;

		const profileLink = document.getElementById('receiverProfileLink');
		if (profileLink) {
			profileLink.addEventListener('click', async function (e) {
				e.preventDefault();
				await actualizeIndexPage(
					'modal-container',
					routes['card_profile'](receiverUsername)
				);
			});
		}

		//Invite friend to play the game
		const gameInvitationBtn = document.getElementById('gameInvitationBtn');
		if (gameInvitationBtn) {
			gameInvitationBtn.classList.remove('d-none');
			gameInvitationBtn.onclick = function () {
				if (
					confirm(
						`Do you want to invite ${receiverUsername} to play a game of PongPong ?`
					)
				) {
					inviteFriendToPlay(currentUserId);
				}
			};
		}
	}

	// Update hidden input for sending messages
	const groupIdInput = document.getElementById('groupIdInput-active');
	if (groupIdInput) {
		groupIdInput.value = newgroupId;
	}

	// Clear current messages
	const chatLog = document.getElementById('chatLog-active');
	if (chatLog) {
		chatLog.innerHTML = ''; // Clear chat log
		setTimeout(() => {
			chatLog.scrollTop = chatLog.scrollHeight;
		}, 0);
	}

	// Load history and initialize SSE for the new group
	messageOffsets[newgroupId] = 0; // Reset offset for new room
	loadMessageHistory(currentUserId, newgroupId);
	const targetbBlockedStatus = await getBlockedStatus(targetUserId);
	let block_reason = null;
	if (targetbBlockedStatus.hasBlocked) {
		block_reason = 'this user blocked you';
	} else if (targetbBlockedStatus.isBlocked) {
		//create a pop window to ask unblock
		const unblockTargetUser = confirm(
			'You blocked this user, do you want to unblock him ?'
		);
		if (unblockTargetUser) {
			//if yes
			fetchWithRefresh(`/chat/${targetUserId}/blockedStatus/`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': getCookie('csrftoken'),
				},
				credentials: 'include',
				body: JSON.stringify({}),
			})
				.then((response) =>
					response.json().then((data) => ({
						data,
						ok: response.ok,
						status: response.status,
						statusText: response.statusText,
					}))
				)
				.then(({ data, ok, status, statusText }) => {
					if (ok) {
						if (data.status === 'success') {
							// Enable message input and send button
							document.getElementById('messageInput-active').disabled = false;
							document.getElementById('sendMessageBtn').disabled = false;
							// Focus on message input
							const messageInput = document.getElementById(
								'messageInput-active'
							);
							if (messageInput) {
								messageInput.focus();
							}
							return;
						} else {
							console.error('Server error unblocking the user:', targetUserId);
							alert('Error unblocking the user: ' + targetUserId);
						}
					} else {
						console.error(
							'HTTP error unblocking the user :',
							status,
							targetUserId || statusText
						);
						alert('HTTP Error: ' + (targetUserId || statusText));
					}
				})
				.catch((error) => {
					console.error('Network or JSON error:', error);
					alert('Cannot connect to server to unblock the user.');
				});
		} else {
			//user doesn't want to unblock
			block_reason = 'you blocked this user';
		}
	}
	const gameInvitationBtn = document.getElementById('gameInvitationBtn');
	if (block_reason != null) {
		document.getElementById('messageInput-active').disabled = true;
		document.getElementById('sendMessageBtn').disabled = true;
		if (gameInvitationBtn) {
			gameInvitationBtn.classList.add('d-none');
			gameInvitationBtn.disabled = true;
		}
		alert(block_reason);
	} else {
		// Enable message input and send button
		document.getElementById('messageInput-active').disabled = false;
		document.getElementById('sendMessageBtn').disabled = false;
		if (gameInvitationBtn) {
			gameInvitationBtn.classList.remove('d-none');
			gameInvitationBtn.disabled = false;
		}
		// Focus on message input
		const messageInput = document.getElementById('messageInput-active');
		if (messageInput) {
			messageInput.focus();
		}
	}
}

async function createGameApiKey() {
	try {
		const csrf = getCookie('csrftoken');
		const response = await fetch(`server-pong/api-key`, {
			headers: {
				'X-CSRFToken': csrf,
			},
			credentials: 'include',
		});

		console.log('createGameApiKey Response status:', response.status);
		console.log('createGameApiKey Response headers:', response.headers);

		if (!response.ok) {
			throw new Error('HTTPS Error: ' + response.status);
		}

		const contentType = response.headers.get('content-type');
		console.log('Content-Type:', contentType);

		if (!contentType || !contentType.includes('application/json')) {
			const textResponse = await response.text();
			console.error('Expected JSON but got:', textResponse);
			throw new Error('Server returned non-JSON response: ' + textResponse);
		}

		const data = await response.json();
		console.log('Game created with key:', data.api_key);
		return data.api_key;
	} catch (error) {
		console.error('Error creating game:', error);
		return null;
	}
}

function waitForElement(elementId, timeout = 5000) {
	return new Promise((resolve, reject) => {
		const startTime = Date.now();

		function checkElement() {
			const element = document.getElementById(elementId);
			if (element) {
				resolve(element);
				return;
			}

			if (Date.now() - startTime > timeout) {
				reject(new Error(`Element ${elementId} not found within ${timeout}ms`));
				return;
			}

			// Vérifier à nouveau dans 50ms
			setTimeout(checkElement, 50);
		}

		checkElement();
	});
}

async function inviteFriendToPlay(currentUserId) {
	console.log('here in inviteFriendToPlay');
	//create API key for the game;

	let apiKey = await createGameApiKey();

	if (!apiKey) {
		console.error('No API key generated');
		alert('Failed to create game. Please try again.');
		return;
	}

	try {
		//const userIdInput = document.getElementById('userIdInput-active');
		//const currentUserId = parseInt(userIdInput.value);
		const messageInput = document.getElementById('messageInput-active');
		messageInput.value = `🎮 PongPong invitation: copy and paste this key to join my game : ${apiKey}.\n`;

		sendMessage(currentUserId);

		// const invitationMessage = `🎮 Game Invitation: Join my PongPong game with this key: ${apiKey}`;
		// await sendInvitationMessage(invitationMessage, currentUserId);

		window.location.hash = '#multiplayer';

		await waitForElement('gameCanvas');
		const gameCanvas = document.getElementById('gameCanvas');
		if (gameCanvas) {
			handleGame2Players(apiKey, 1, 0, -1);
		} else {
			console.error('Game canvas not found after navigation');
			alert(
				'Could not initialize game. Please try manually navigating to multiplayer.'
			);
		}
	} catch (error) {
		console.error('error sending invitation : ', error);
		alert('Failed to send game invitation. Please try again.');
	}
}

/**
 * Updates the message input placeholder and state based on blocking status
 * @param {Object} blockStatus - The blocking status object with isBlocked and hasBlocked properties
 * @param {boolean} enabled - Whether the input should be enabled or disabled
 */
function updateMessageInputState(blockStatus, enabled = true) {
	const messageInput = document.getElementById('messageInput-active');
	const sendBtn = document.getElementById('sendMessageBtn');

	if (!messageInput || !sendBtn) return;

	if (enabled && (!blockStatus || (!blockStatus.isBlocked && !blockStatus.hasBlocked))) {
		// Normal state - no blocking
		messageInput.disabled = false;
		messageInput.placeholder = "Type your message...";
		sendBtn.disabled = false;
		messageInput.focus();
	} else {
		// Blocked state
		messageInput.disabled = true;
		sendBtn.disabled = true;

		if (blockStatus?.hasBlocked) {
			messageInput.placeholder = "This user blocked you, you can't send a message";
		} else if (blockStatus?.isBlocked) {
			messageInput.placeholder = "Blocked user, you can't send a message";
		} else {
			messageInput.placeholder = "Type your message...";
		}
	}
}

// Function to initialize the chat module
export async function initChatModule(currentUserId) {
	// Close any open EventSource connections for the current user
	for (const key in eventSources) {
		if (eventSources[key].readyState === EventSource.OPEN) {
			eventSources[key].close();
			delete eventSources[key];
			console.log(`Closed SSE for group: ${key}`);
		}
	}

	// Close global event source
	if (globalEventSource) {
		globalEventSource.close();
		globalEventSource = null;
		console.log('Closed global chat notifications');
	}

	// Reset global state
	hasOverallUnreadMessages = false;
	currentActiveChatGroup = null;
	currentTargetId = null;
	Object.keys(messageOffsets).forEach(key => delete messageOffsets[key]);

	const chatLog = document.getElementById('chatLog-active');
	if (chatLog) {
		chatLog.innerHTML = `<div class="no-chat-selected text-center text-muted py-5"><p>Select a chat from the left, or start a new one above.</p></div>`;
	}

	const mainChatToggleButton = document.getElementById('mainChatToggleButton');
	if (mainChatToggleButton) {
		mainChatToggleButton.classList.remove('has-unread-overall');
	}

	// Load chat room list
	await loadChatRoomList(currentUserId);

	// Setup user search autocomplete
	setupUserSearchAutocomplete();

	// Initialize global notifications
	if (currentUserId) {
		initGlobalChatNotifications(currentUserId);
		await initializeAllChatConnections(currentUserId);
	}
}


// Main chat controller function, called after login
export function chatController(userId, username) {
	const container = document.getElementById('chat-container');
	if (!container) {
		console.error('No #chat-container found in DOM.');
		return;
	}
	const userIdInputActive = document.getElementById('userIdInput-active');
	const usernameInputActive = document.getElementById('usernameInput-active');
	if (userIdInputActive) {
		userIdInputActive.value = userId;
	}
	// Set the username in the input field for sending messages
	if (usernameInputActive) {
		usernameInputActive.value = username;
	}

	initGlobalChatNotifications(userId);
	initializeAllChatConnections(userId);

	// 1. Initialize Bootstrap Modal
	const mainChatWindowElement = document.getElementById('mainChatWindow');
	if (mainChatWindowElement) {
		mainChatBootstrapModal = new bootstrap.Modal(mainChatWindowElement);

		mainChatWindowElement.addEventListener('shown.bs.modal', async () => {
			console.log('Main Chat Window is shown');
			
			updateGlobalUnreadStatus(false);

			console.log('Logged in user ID:', userId);
			loadChatRoomList(userId);

			// Set initial state for chat log
			const chatLog = document.getElementById('chatLog-active');
			if (chatLog && !currentActiveChatGroup) {
				// Only show initial message if no group is active
				chatLog.innerHTML = `<div class="no-chat-selected text-center text-muted py-5"><p>Select a chat from the left, or start a new one above.</p></div>`;
			}
			// If a group was active before closing/reopening, switch back to it
			if (currentActiveChatGroup) {
				await switchChatRoom(userId, currentActiveChatGroup, currentTargetId);
			}
			setupUserSearchAutocomplete(); 

			// Focus on new chat user ID input initially
			const targetUserInput = document.getElementById('targetUserInput');
			if (targetUserInput) {
				targetUserInput.focus();
			}
		});
		mainChatWindowElement.addEventListener('hidden.bs.modal', () => {
			console.log('Main Chat Window is hidden');
			currentActiveChatGroup = null; // Reset active chat group when closing modal
			currentTargetId = null;

			const chatLog = document.getElementById('chatLog-active');
			if (chatLog)
				chatLog.innerHTML = `<div class="no-chat-selected text-center text-muted py-5"><p>Select a chat from the left, or start a new one above.</p></div>`;

			document.getElementById('messageInput-active').disabled = true;
			document.getElementById('sendMessageBtn').disabled = true;
			document.getElementById('activeChatRoomName').textContent = '';
			document.getElementById('groupIdInput-active').value = '';
			document.getElementById('targetUserInput').value = '';

			const gameInvitationBtn = document.getElementById('gameInvitationBtn');
			if (gameInvitationBtn) {
				gameInvitationBtn.classList.add('d-none');
			}
		});
	} else {
		console.error('Main chat window modal element not found!');
		return;
	}

	// 2. Main Chat Toggle Button setup
	const mainChatToggleButton = document.getElementById('mainChatToggleButton');
	if (mainChatToggleButton) {
		mainChatToggleButton.style.display = 'flex'; // Ensure button is visible

		mainChatToggleButton.onclick = () => {
			mainChatBootstrapModal.show();
		};
	} else {
		console.error('Main chat toggle button not found.');
	}
	// 3. Attach send message event listeners
	const sendMessageBtn = document.getElementById('sendMessageBtn');
	if (sendMessageBtn) {
		sendMessageBtn.addEventListener('click', () => {
			sendMessage(userId);
		});
	}

	const messageInput = document.getElementById('messageInput-active');
	if (messageInput) {
		messageInput.addEventListener('keypress', function (e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				sendMessage(userId);
			}
		});
		const charCounter = document.getElementById('char-counter');
		const MAX_LENGTH = 1000;

		// Initial counter value
		if (charCounter) {
			charCounter.textContent = `0/${MAX_LENGTH}`;
		}

		messageInput.addEventListener('input', function () {
			if (charCounter) {
				const length = this.value.length;
				charCounter.textContent = `${length}/${MAX_LENGTH}`;

				// Add visual feedback based on length
				if (length > MAX_LENGTH) {
					charCounter.className = 'char-counter danger';
				} else if (length > MAX_LENGTH * 0.8) {
					// At 80% of limit
					charCounter.className = 'char-counter warning';
				} else {
					charCounter.className = 'char-counter';
				}
			}
		});
	}

	// 4. Attach "Start New Chat" button event listener
	const startNewChatBtn = document.getElementById('startNewChatBtn');
	if (startNewChatBtn) {
		startNewChatBtn.addEventListener('click', () =>
			handleStartNewChat(userId, username)
		);
	}
}


// Function to clean up all chat SSE connections
function cleanupAllChatConnections() {
	console.log('Cleaning up all chat SSE connections...');

	// Close all active EventSources
	for (const groupId in eventSources) {
		if (
			eventSources[groupId] &&
			eventSources[groupId].readyState !== EventSource.CLOSED
		) {
			console.log(`Closing SSE connection for group: ${groupId}`);
			eventSources[groupId].close();
		}
		delete eventSources[groupId];
	}

	// Clear message offsets
	for (const groupId in messageOffsets) {
		delete messageOffsets[groupId];
	}

	console.log('All chat SSE connections cleaned up');
}

// Export cleanup function for use by other modules (like logout)
export function cleanupChatOnLogout() {
	console.log('Chat cleanup on logout called');
	cleanupAllChatConnections();

	// Reset global state
	hasOverallUnreadMessages = false;
	currentActiveChatGroup = null;
	currentTargetId = null;

	// Hide chat button
	const mainChatToggleButton = document.getElementById('mainChatToggleButton');
	if (mainChatToggleButton) {
		mainChatToggleButton.style.display = 'none';
		mainChatToggleButton.classList.remove('has-unread-overall');
	}

	// Close modal if open
	if (mainChatBootstrapModal) {
		mainChatBootstrapModal.hide();
	}
}

// Event handler for "Start New Chat" button in the modal
function handleStartNewChat(currentUserId, currentUsername) {
	const targetUserInput = document.getElementById('targetUserInput');
	const targetUsername = targetUserInput.value.trim();
	const targetUserId = targetUserInput.dataset.userId || null;

	if (!targetUsername || !targetUserId) {
		alert('Please select a valid user from the search results.');
		return;
	}

	if (targetUserId === currentUserId) {
		alert('You cannot start a chat with yourself.');
		return;
	}

	promptPrivateChat(currentUserId, targetUserId, targetUsername);
	targetUserInput.value = '';
	targetUserInput.dataset.userId = '';
}

async function promptPrivateChat(currentUserId, targetUserId, targetUsername) {
	console.log(
		`Requesting private chat with ${targetUsername} for user ${currentUserId}`
	);
	if (!currentUserId) {
		alert('Please log in to start a new chat.');
		return;
	}

	if (currentUserId === targetUserId) {
		alert('You cannot start a chat with yourself.');
		return;
	}

	// Check if chat with this user already exists in the list
	const chatRooms = document.querySelectorAll('#chatRoomList .list-group-item');
	let existinggroupId = null;
	chatRooms.forEach((room) => {
		if (room.dataset.targetUserId === targetUserId) {
			existinggroupId = room.dataset.groupId; 
		}
	});

	if (existinggroupId) {
		console.log(`Chat with ${targetUsername} already exists. Switching to it.`);
		await switchChatRoom(currentUserId, existinggroupId, targetUserId);
		return;
	}

	if (confirm(`Do you want to start a new chat with ${targetUsername}?`)) {
		fetchWithRefresh('/chat/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CSRFToken': getCookie('csrftoken'),
			},
			body: JSON.stringify({
				current_user_id: currentUserId,
				target_user_id: targetUserId,
			}),
			credentials: 'include',
		})
			.then((response) =>
				response.json().then((data) => ({ data, ok: response.ok }))
			)
			.then(({ data, ok }) => {
				if (ok && data.status === 'success' && data.group_id) {
					console.log(`Chat group ${data.group_id} created/retrieved.`);
					loadChatRoomList(currentUserId).then(async () => {
						await switchChatRoom(currentUserId, data.group_id, targetUserId);
					});
				} else {
					console.error('Server error creating chat group:', data.message);
					alert('Error creating chat group: ' + data.message);
				}
			})
			.catch((error) => {
				console.error('Network error creating chat group:', error);
				alert('Cannot connect to server to create chat group.');
			});
	}
}

export async function renderChatButtonIfAuthenticated(userIsAuth = null) {
	// Only check authentication if status wasn't provided
	if (userIsAuth === null) {
		console.log('Chat button - checking authentication');
		userIsAuth = await isUserAuthenticated();
	} else {
		console.log('Chat button - using provided auth status:', userIsAuth);
	}

	if (userIsAuth) {
		const userData = await fetchWithRefresh('/user-service/infoUser/', {
			method: 'GET',
			credentials: 'include',
		})
			.then((response) => response.json())
			.then((data) => ({
				id: data.id,
				username: data.user_name,
			}))
			.catch((error) => {
				console.error('Error fetching user info:', error);
				return null;
			});

		if (!userData || !userData.id) {
			console.error('User data not found');
			return;
		}

		try {
			await actualizeIndexPage(
				'chat-container',
				routes['chat'](userData.id, userData.username)
			);
		} catch (e) {
			console.error('Could not load chat UI:', e);
		}
	} else {
		// Hide chat button when not authenticated
		const mainChatToggleButton = document.getElementById(
			'mainChatToggleButton'
		);
		if (mainChatToggleButton) {
			mainChatToggleButton.style.display = 'none';
		}
	}
}

/**
 * Function to refresh chat status when block/unblock status changes
 * This function can be called from other modules like card_profile.js
 */
export async function refreshChatAfterBlockStatusChange(targetUserId) {
	console.log('Refreshing chat after block status change for user:', targetUserId);

	// Get current user info
	const userData = await fetchWithRefresh('/user-service/infoUser/', {
		method: 'GET',
		credentials: 'include',
	})
		.then((response) => response.json())
		.then((data) => ({
			id: data.id,
			username: data.user_name,
		}))
		.catch((error) => {
			console.error('Error fetching user info:', error);
			return null;
		});

	if (!userData || !userData.id) {
		console.error('User data not found for chat refresh');
		return;
	}

	// If the chat is currently active and the modal is open
	const mainChatWindowElement = document.getElementById('mainChatWindow');
	if (mainChatWindowElement && mainChatWindowElement.classList.contains('show')) {
		console.log('Chat modal is open, refreshing chat list and active chat');

		// Refresh the chat room list
		await loadChatRoomList(userData.id);

		// If we're currently chatting with the user whose block status changed, refresh that conversation
		if (currentTargetId && currentTargetId.toString() === targetUserId.toString()) {
			console.log('Currently chatting with affected user, refreshing conversation state');			// Re-check block status and update input state
			const targetBlockedStatus = await getBlockedStatus(targetUserId);
			let block_reason = null;

			if (targetBlockedStatus.hasBlocked) {
				block_reason = 'this user blocked you';
			} else if (targetBlockedStatus.isBlocked) {
				block_reason = 'you blocked this user';
			}

			// Update message input state based on blocking status
			const isEnabled = block_reason === null;
			updateMessageInputState(targetBlockedStatus, isEnabled);

			if (block_reason) {
				console.log('Chat input disabled due to blocking:', block_reason);
			} else {
				console.log('Chat input enabled - no blocking detected');
			}
		}
	} else {
		console.log('Chat modal is not open, no refresh needed');
	}
}

function setupUserSearchAutocomplete() {
	const userInput = document.getElementById('targetUserInput');
	const resultsBox = document.getElementById('chat-user-search');
	if (!userInput || !resultsBox) {
		console.error('Could not find search elements:', {
			userInput: !!userInput,
			resultsBox: !!resultsBox,
		});
		return;
	}
	userInput.addEventListener('input', async (event) => {
		const query = event.target.value.trim();
		if (!query) {
			resultsBox.innerHTML = '';
			return;
		}
		// Add debug logging
		console.log('Searching for users with query:', query);

		try {
			const response = await fetch(
				`/user-service/searchUsers/?t=${Date.now()}&q=${encodeURIComponent(
					query
				)}`,
				{
					method: 'GET',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
						'Cache-Control': 'no-cache', // Disable caching
					},
				}
			);

			const data = await response.json();
			const users = data.results ?? [];
			resultsBox.innerHTML = users
				.map(
					(user) =>
						`<li class="list-group-item user-link" data-user-id="${user.id}">${user.username}</li>`
				)
				.join('');

			// When a user is clicked, fill the input and clear the results
			resultsBox.querySelectorAll('.user-link').forEach((item) => {
				item.addEventListener('click', () => {
					userInput.value = item.textContent.trim();
					userInput.dataset.userId = item.getAttribute('data-user-id');
					console.log('Selected user ID:', item.getAttribute('data-user-id'));
					resultsBox.innerHTML = ''; // Clear results after selection
				});
			});
		} catch (error) {
			console.error('Error fetching user search results:', error);
			resultsBox.innerHTML = `<li class="list-group-item text-danger">Error loading users</li>`;
		}
	});
}
