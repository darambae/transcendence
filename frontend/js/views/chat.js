
import { actualizeIndexPage, getCookie, isUserAuthenticated, fetchWithRefresh } from '../utils.js'; // Assuming getCookie is still needed for CSRF token
import { routes } from '../routes.js';
import { card_profileController } from './card_profile.js';

let mainChatBootstrapModal; // Bootstrap Modal instance
let currentActiveChatGroup = null; // No default active group, will be set on selection
const eventSources = {}; // Stores EventSource objects per groupId
const messageOffsets = {}; // Stores the offset for message history for each group

// Helper to create an HTML message element
function createMessageElement(messageData, username) {
    const msg = document.createElement('div');
    msg.classList.add('chat-message');

    // Determine if the message sender is the current logged-in user
    const isSelf = messageData.sender === username || messageData.sender_username === username;

    if (isSelf) {
        msg.classList.add('self');
    } else {
        msg.classList.add('other');
    }

    const senderSpan = document.createElement('span');
    senderSpan.classList.add('message-sender');
    // Prioritize sender_username from backend if available, otherwise use sender
    senderSpan.textContent = messageData.sender_username || messageData.sender;
    msg.appendChild(senderSpan);

    const contentText = document.createTextNode(messageData.content);
    msg.appendChild(contentText);

    const timestampSpan = document.createElement('span');
    timestampSpan.classList.add('message-timestamp');
    // Format timestamp nicely if possible, or just display raw
    // Assuming timestamp comes as ISO 8601 string from backend
    try {
        const date = new Date(messageData.timestamp);
        timestampSpan.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        timestampSpan.textContent = messageData.timestamp || new Date().toLocaleTimeString();
    }
    msg.appendChild(timestampSpan);

    return msg;
}

// Function to load message history for the active group
async function loadMessageHistory(username, groupId, prepend = false) {
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
        // UPDATED URL: /chat/{group_id}/messages/
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
                const fragment = document.createDocumentFragment();
                data.messages.forEach((msgData) => {
                    const msgElement = createMessageElement(msgData, username);
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
                // Update offset based on backend's next_offset
                messageOffsets[groupId] = data.next_offset;

            } else if (!prepend && chatLog.children.length === 0) {
                // If no messages at all and not prepending, show "No messages yet"
                const noMessagesYet = document.createElement('div');
                noMessagesYet.classList.add('no-messages-yet', 'text-center', 'text-muted', 'py-5');
                noMessagesYet.innerHTML = '<p>No messages yet. Start the conversation!</p>';
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

function sendMessage(username) {
	const messageInput = document.getElementById('messageInput-active');
	const groupIdInput = document.getElementById('groupIdInput-active');

	const content = messageInput.value.trim();
    const groupId = groupIdInput.value;

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
		sender: username,
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

		const msgElement = createMessageElement(tempMessageData, username);
		chatLog.appendChild(msgElement);
		chatLog.scrollTop = chatLog.scrollHeight;
	}

	// Clear input field immediately for better UX
	messageInput.value = '';

	fetchWithRefresh(`/chat/${groupId}/messages/`, {

		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		credentials: 'include',
		body: JSON.stringify({
			content: content,
			group_id: groupId,
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

// Function to initialize EventSource (SSE) for a group
function initEventSource(groupId, username) {
	// Close any other active EventSources before opening a new one
	for (const key in eventSources) {
		if (eventSources[key].readyState === EventSource.OPEN) {
			eventSources[key].close();
			delete eventSources[key];
			console.log(`Closed SSE for group: ${key}`);
		}
	}
    // // Close any other active EventSources before opening a new one
    // for (const key in eventSources) {
    //     if (eventSources[key].readyState === EventSource.OPEN) {
    //         eventSources[key].close();
    //         delete eventSources[key];
    //         console.log(`Closed SSE for group: ${key}`);
    //     }
    // }

	const chatLog = document.getElementById('chatLog-active');
	if (!chatLog) {
		console.error(`chatLog-active not found for initEventSource.`);
		return;
	}

	// UPDATED URL: /chat/stream/{group_id}/
	const source = new EventSource(`/chat/stream/${groupId}/`);

	eventSources[groupId] = source;
	const recentlyReceivedMessages = new Set(); // For message deduplication
	source.onmessage = function (e) {
		try {
			const messageData = JSON.parse(e.data);

			// Skip if this message is from the current user (we've already displayed it)
			if (
				messageData.sender === username ||
				messageData.sender_username === username
			) {
				console.log('Skipping own message from SSE');
				return;
			}
            const messageId = `${messageData.id || ''}-${
							messageData.timestamp
						}-${messageData.sender}-${messageData.content}`;

            // Skip if we've seen this message recently (deduplication)
            if (recentlyReceivedMessages.has(messageId)) {
                console.log('Skipping duplicate message:', messageId);
                return;
            }

            // Add to recently seen messages
            recentlyReceivedMessages.add(messageId);

            // Remove old entries after 5 seconds to prevent set from growing too large
            setTimeout(() => {
                recentlyReceivedMessages.delete(messageId);
            }, 5000);
			// Only append if the message is for the currently active chat group
			if (messageData.group_id === currentActiveChatGroup) {
				// Remove "No messages yet" if a new message arrives
				const noMessagesDiv = chatLog.querySelector('.no-messages-yet');
				if (noMessagesDiv) {
					noMessagesDiv.remove();
				}
				const msgElement = createMessageElement(messageData, username);
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
    eventSources[groupId] = source;

    source.onmessage = function (e) {
        try {
            const messageData = JSON.parse(e.data);
            // Only append if the message is for the currently active chat group
            if (messageData.group_id === currentActiveChatGroup) {
                // Remove "No messages yet" if a new message arrives
                const noMessagesDiv = chatLog.querySelector('.no-messages-yet');
                if (noMessagesDiv) {
                    noMessagesDiv.remove();
                }
                const msgElement = createMessageElement(messageData, username);
                chatLog.appendChild(msgElement);
                chatLog.scrollTop = chatLog.scrollHeight; // Auto-scroll to bottom
            } else {
				//ajoute une pastille avec un chiffre correspondant au nombre de messages à lire
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
		console.error('EventSource failed for group ' + groupId + ':', err);
		source.close();
		delete eventSources[groupId];
		// Only attempt reconnect if currentActiveChatGroup is still this groupId
		// Otherwise, it means user switched chat, and we shouldn't reconnect here
		if (currentActiveChatGroup === groupId) {
			setTimeout(() => initEventSource(groupId, username), 3000); // Attempt reconnect after 3 seconds
		}
	};
	console.log(`Opened SSE for group: ${groupId}`);
}

async function getBlockedStatus(targetUser) {
    //rajouter peut-être une vérif du other-user
    try {
        const response = await fetch('/chat/${targetUser}/blockedStatus', {
            method : 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
			credentials: 'include'
        });
		if (!response.ok) {
			const errorData = await response.json();
			console.error('error loading blocked status', errorData.message || 'unknown error');
			alert('error loading blocked status' + (errorData.message || 'unknown error'));
			return;
		}
		const data = response.json();
		return (data);
    } catch (error) {
		console.error('Network error loading blocked status :', error);
		alert('network error: could not load blocked status');
	}
}


// Function to populate the chat room list (now dynamic and 1-to-1 only)
async function loadChatRoomList(current_user) {
    const chatRoomListUl = document.getElementById('chatRoomList');
    if (!chatRoomListUl) {
        console.error('Chat room list element not found!');
        return;
    }

    if (!current_user) {
        console.log("Not logged in, cannot load chat list.");
        chatRoomListUl.innerHTML = `<li class="list-group-item text-muted">Please log in to see chats.</li>`;
        return;
    }


    try {
        // UPDATED URL: /chat/ (GET)
        // Note: Your backend ChatGroupListCreateView GET should filter by the username internally
        // or accept a query parameter for it. Based on your urls.py, it seems it's `/chat/`
        // which implies the view itself handles the user context for listing.
        // If it requires a username in the URL, revert to `/chat/${username}/`
        // or modify the backend URL pattern. Assuming it lists for the authenticated user for now.
        const csrf = getCookie('csrftoken');
        console.log('Loading chat list for user:', current_user);
        const response = await fetchWithRefresh(`/chat/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf, // For CSRF protection if needed
            },
            credentials: 'include'
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error loading chat list:', errorData.message || 'Unknown error');
            alert('Error loading chat list: ' + (errorData.message || 'Unknown error'));
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
                    listItem.classList.add('active'); // Highlight active room
                }
                listItem.dataset.groupId = chat.group_id;
                listItem.dataset.receiver = chat.receiver; // Store username for this chat
                listItem.textContent = chat.receiver; // Display receiver's username
                listItem.style.cursor = 'pointer';
                console.log(`Adding chat room: ${chat.group_name} (ID: ${chat.group_id})`);
                listItem.onclick = async () => {
                    try {
                        await switchChatRoom(current_user, chat.group_id);
                    } catch (e) {
                        console.error('Error switching chat room:', e);
                        alert('Could not switch chat room. Please try again.');
                    }
                }
                // switchChatRoom(current_user, chat.group_id);
                chatRoomListUl.appendChild(listItem);
            });
        } else {
            console.error(
                'Error loading chat list:',
                data.message || 'Unknown error'
            );
            alert(
                'Error loading chat list: ' + (data.message || 'Unknown error')
            );
        }
    } catch (error) {
        console.error('Network error while loading chat list:', error);
        alert('Network error: Could not load chat list.');
    }
}

// Function to switch between chat rooms
async function switchChatRoom(username, newgroupId) {
    if (newgroupId === null || newgroupId === undefined) {
			console.error('No groupId provided for loading history.');
			return;
		}
    if (currentActiveChatGroup === newgroupId) {
        return; // Already in this room
    }

    // Update active class in the list
    const oldActiveItem = document.querySelector(`#chatRoomList .list-group-item.active`);
    if (oldActiveItem) {
        oldActiveItem.classList.remove('active');
    }
    const newActiveItem = document.querySelector(`#chatRoomList [data-group-id="${newgroupId}"]`);
    if (newActiveItem) {
        newActiveItem.classList.add('active');
    }

    // Update current active group
    currentActiveChatGroup = newgroupId;
    console.log(`Switched to chat room: ${newgroupId}`);
    // Update header of the right column with the other user's name
    const activeChatRoomName = document.getElementById('activeChatRoomName');
    const targetChatListItem = document.querySelector(`#chatRoomList [data-group-id="${newgroupId}"]`);
    if (activeChatRoomName && targetChatListItem) {
        const receiverUsername = targetChatListItem.dataset.receiver;
        activeChatRoomName.innerHTML = `Chat with <a href="#" id="receiverProfileLink" style="text-decoration:underline; cursor:pointer;">${receiverUsername}</a>`;

        const profileLink = document.getElementById('receiverProfileLink');
        if (profileLink) {
            profileLink.addEventListener('click', async function (e) {
                e.preventDefault();
                await actualizeIndexPage('modal-container', routes['card_profile'](receiverUsername));
            });
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
    loadMessageHistory(username, newgroupId);
	const targetUser = targetChatListItem.dataset.receiver;
	const targetbBlockedStatus = getBlockedStatus(targetUser)
	let block_reason = null;
	if (blockedStatus.hasBlocked) {
		block_reason = 'this user blocked you';
	} else if (targetbBlockedStatus.isBlocked) {
		//create a pop window to ask unblock
		const unblockTargetUser = confirm("You blocked this user, do you want to unblock him ?")
		if (unblockTargetUser) {//if yes
			fetch('/chat/${targetUser}/blockedStatus', {
				method : 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials : 'include',
				body: JSON.stringify({
					isBlocked: False,
				}),
			})
				.then((response) =>
					response
						.json()
						.then((data) => ({
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
						initEventSource(newgroupId, username);
						// Focus on message input
						const messageInput = document.getElementById('messageInput-active');
						if (messageInput) {
							messageInput.focus();
						}
						return;
					} else {
						console.error('Server error unblocking the user:', targetUser);
						alert('Error unblocking the user: ' + targetUser);
					}
				} else {
					console.error(
						'HTTP error unblocking the user :',
						status,
						targetUser || statusText
						);
						alert('HTTP Error: ' + (targetUser || statusText));
					}
				})
				.catch((error) => {
					console.error('Network or JSON error:', error);
					alert('Cannot connect to server to unblock the user.');
				});
		} else {//user doesn't want to unblock
			block_reason = "you blocked this user"
		}
	}
	if (block_reason != null) {
	    // Enable message input and send button
		document.getElementById('messageInput-active').disabled = true;
		document.getElementById('sendMessageBtn').disabled = true;
		alert(block_reason);
	} else {
	    // Enable message input and send button
		document.getElementById('messageInput-active').disabled = false;
		document.getElementById('sendMessageBtn').disabled = false;
		initEventSource(newgroupId, username);
		// Focus on message input
		const messageInput = document.getElementById('messageInput-active');
		if (messageInput) {
			messageInput.focus();
		}
	}
}

async function promptPrivateChat(username, targetUsername) {
	console.log(
		`Requesting private chat with ${targetUsername} for user ${username}`
	);
	if (!username) {
		alert('Please log in to start a new chat.');
		return;
	}

	if (username === targetUsername) {
		alert('You cannot start a chat with yourself.');
		return;
	}

	// Check if chat with this user already exists in the list
	const chatRooms = document.querySelectorAll('#chatRoomList .list-group-item');
	let existinggroupId = null;
	chatRooms.forEach((room) => {
		if (room.dataset.receiver === targetUsername) {
			existinggroupId = room.dataset.groupId; // Get the group ID of the existing chat
		}
	});

	if (existinggroupId) {
		console.log(`Chat with ${targetUsername} already exists. Switching to it.`);
		await switchChatRoom(username, existinggroupId);
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
				current_username: username,
				target_username: targetUsername,
			}),
			credentials: 'include',
		})
			.then((response) =>
				response.json().then((data) => ({ data, ok: response.ok }))
			)
			.then(({ data, ok }) => {
				if (ok && data.status === 'success' && data.group_id) {
					console.log(`Chat group ${data.group_id} created/retrieved.`);
					loadChatRoomList(username).then(() => {
						switchChatRoom(username, data.group_id);
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

// Event handler for "Start New Chat" button in the modal
function handleStartNewChat(username) {
	const targetUserInput = document.getElementById('targetUserInput');
	const targetUsername = targetUserInput.value.trim();

	if (!targetUsername) {
		alert('Please enter a user ID to start a new chat.');
		return;
	}

	if (targetUsername === username) {
		alert('You cannot start a chat with yourself.');
		return;
	}

	promptPrivateChat(username, targetUsername);
	targetUserInput.value = ''; // Clear input field
}

function setupUserSearchAutocomplete() {
	const userInput = document.getElementById('targetUserInput');
	const resultsBox = document.getElementById('resultsSearch');
	if (!userInput || !resultsBox) return;

	userInput.addEventListener('input', async function () {
		const query = this.value.trim();
		if (!query) {
			resultsBox.innerHTML = '';
			return;
		}
		const response = await fetchWithRefresh(
			`user-service/searchUsers?q=${encodeURIComponent(query)}`,
			{
				method: 'GET',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);

		const data = await response.json();
		const users = data.results ?? [];
		resultsBox.innerHTML = users
			.map(
				(user) => `<li class="list-group-item user-link">${user.username}</li>`
			)
			.join('');

        // When a user is clicked, fill the input and clear the results
        resultsBox.querySelectorAll('.user-link').forEach((item) => {
            item.addEventListener('click', () => {
                userInput.value = item.textContent.trim();
                resultsBox.innerHTML = ''; // Clear results after selection
            });
        });
    });
}


// Main chat controller function, called after login
export function chatController(username) {
	const container = document.getElementById('chat-container');
	if (!container) {
		console.error('No #chat-container found in DOM.');
		return;
	}

	const usernameInputActive = document.getElementById('usernameInput-active');
	if (usernameInputActive) {
		usernameInputActive.value = username;
	}

	// 1. Initialize Bootstrap Modal
	const mainChatWindowElement = document.getElementById('mainChatWindow');
	if (mainChatWindowElement) {
		mainChatBootstrapModal = new bootstrap.Modal(mainChatWindowElement);

        mainChatWindowElement.addEventListener('shown.bs.modal', () => {
            console.log('Main Chat Window is shown');
            console.log('Logged in user:', username);
            loadChatRoomList(username); // Load chat list dynamically

            // Set initial state for chat log
            const chatLog = document.getElementById('chatLog-active');
            if (chatLog && !currentActiveChatGroup) { // Only show initial message if no group is active
                chatLog.innerHTML = `<div class="no-chat-selected text-center text-muted py-5"><p>Select a chat from the left, or start a new one above.</p></div>`;
            }
            // If a group was active before closing/reopening, switch back to it
            if (currentActiveChatGroup) {
                switchChatRoom(currentActiveChatGroup);
            }
            setupUserSearchAutocomplete(); // Setup autocomplete for new chat input
            // Focus on new chat user ID input initially
            const targetUserInput = document.getElementById('targetUserInput');
            if (targetUserInput) {
                targetUserInput.focus();
            }
        });
        mainChatWindowElement.addEventListener('hidden.bs.modal', () => {
            console.log('Main Chat Window is hidden');
            // Close active SSE connection when modal closes
            if (currentActiveChatGroup && eventSources[currentActiveChatGroup]) {
                eventSources[currentActiveChatGroup].close();
                delete eventSources[currentActiveChatGroup];
            }
            currentActiveChatGroup = null; // Reset active chat group when closing modal
            // Clear chat log and reset UI state
            const chatLog = document.getElementById('chatLog-active');
            if (chatLog) {
			chatLog.innerHTML = `<div class="no-chat-selected text-center text-muted py-5"><p>Select a chat from the left, or start a new one above.</p></div>`;
            document.getElementById('messageInput-active').disabled = true;
            document.getElementById('sendMessageBtn').disabled = true;
            document.getElementById('activeChatRoomName').textContent = ''; // Clear header
            document.getElementById('groupIdInput-active').value = '';
            document.getElementById('targetUserInput').value = ''; // Clear new chat input
			} else {
				console.error('Main chat window modal element not found!');
        		return;
			}
		});
		mainChatWindowElement.addEventListener('shown.bs.modal', () => {
			console.log('Main Chat Window is shown');
			console.log('Logged in user:', username);
			loadChatRoomList(username); // Load chat list dynamically

			// Set initial state for chat log
			const chatLog = document.getElementById('chatLog-active');
			if (chatLog && !currentActiveChatGroup) {
				// Only show initial message if no group is active
				chatLog.innerHTML = `<div class="no-chat-selected text-center text-muted py-5"><p>Select a chat from the left, or start a new one above.</p></div>`;
			}
			// If a group was active before closing/reopening, switch back to it
			if (currentActiveChatGroup) {
				switchChatRoom(currentActiveChatGroup);
			}
			setupUserSearchAutocomplete(); // Setup autocomplete for new chat input
			// Focus on new chat user ID input initially
			const targetUserInput = document.getElementById('targetUserInput');
			if (targetUserInput) {
				targetUserInput.focus();
			}
		});
		mainChatWindowElement.addEventListener('hidden.bs.modal', () => {
			console.log('Main Chat Window is hidden');
			// Close active SSE connection when modal closes
			if (currentActiveChatGroup && eventSources[currentActiveChatGroup]) {
				eventSources[currentActiveChatGroup].close();
				delete eventSources[currentActiveChatGroup];
			}
			currentActiveChatGroup = null; // Reset active chat group when closing modal
			// Clear chat log and reset UI state
			const chatLog = document.getElementById('chatLog-active');
			if (chatLog) {
				chatLog.innerHTML = `<div class="no-chat-selected text-center text-muted py-5"><p>Select a chat from the left, or start a new one above.</p></div>`;

			document.getElementById('messageInput-active').disabled = true;
			document.getElementById('sendMessageBtn').disabled = true;
			document.getElementById('activeChatRoomName').textContent = ''; // Clear header
			document.getElementById('groupIdInput-active').value = '';
			document.getElementById('targetUserInput').value = ''; // Clear new chat input
			} else {
				console.error('Main chat window modal element not found!');
				return;
			}
		});
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
			// Always pass the logged-in user's username to sendMessage
			sendMessage(username);
		});
	}

	const messageInput = document.getElementById('messageInput-active');
	if (messageInput) {
		messageInput.addEventListener('keypress', function (e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				sendMessage(username);
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
			handleStartNewChat(username)
		);
	}
}

export async function renderChatButtonIfAuthenticated() {
	let userIsAuth = await isUserAuthenticated();
	if (userIsAuth) {
		const username = await fetchWithRefresh('user-service/infoUser/', {
			method: 'GET',
			credentials: 'include',
		})
		.then((response) => response.json())
		.then((data) => data.user_name)
		.catch((error) => {
			console.error('Error fetching user info:', error);
			return null;
		});
		if (!username) {
			console.error('Username not found');
			return;
		}
		try {
			await actualizeIndexPage('chat-container', routes['chat'](username));
		} catch (e) {
			console.error('Could not load chat UI:', e);
		}
	}
}
