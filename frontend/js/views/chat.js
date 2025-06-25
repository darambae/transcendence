
import { actualizeIndexPage, getCookie, isUserAuthenticated } from '../utils.js'; // Assuming getCookie is still needed for CSRF token
import { routes } from '../routes.js';

let mainChatBootstrapModal; // Bootstrap Modal instance
let currentActiveChatGroup = null; // No default active group, will be set on selection
const eventSources = {}; // Stores EventSource objects per groupName
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
async function loadMessageHistory(username, groupName, prepend = false) {
    const chatLog = document.getElementById('chatLog-active');
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

    const offset = messageOffsets[groupName] || 0;
    const limit = 20;

    try {
        // UPDATED URL: /chat/{group_name}/messages/
        const response = await fetch(
            `/chat/${groupName}/messages/?offset=${offset}&limit=${limit}`,
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
                messageOffsets[groupName] = data.next_offset;

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

// Function to send a message to the active group
async function sendMessage(username) {
    const usernameInput = document.getElementById('usernameInput-active'); // This should now hold username
    const messageInput = document.getElementById('messageInput-active');
    const groupNameInput = document.getElementById('groupNameInput-active'); // Contains the current active groupName

    const user_name = usernameInput.value.trim(); // Should be `username`
    const content = messageInput.value.trim();
    const groupName = groupNameInput.value;

    if (!user_name || !content || !groupName) {
        alert('Please ensure you are logged in, selected a chat, and typed a message.');
        return;
    }

    try {
        // UPDATED URL: /chat/{group_name}/messages/ (POST)
        const response = await fetch(`/chat/${groupName}/messages/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'), // For Django's CSRF protection on your frontend
            },
            credentials: 'include', // Include cookies for session management
            body: JSON.stringify({
                username: user_name,
                content: content,
                group_name: groupName, // Still useful for backend context, though redundant with URL
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
function initEventSource(groupName, username) {
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

    // UPDATED URL: /chat/stream/{group_name}/
    // ********* how do I get the token? *******
    const token = sessionStorage.getItem('accessToken');
    const source = new EventSource(`/chat/stream/${groupName}/?token=${encodeURIComponent(token)}`);

    eventSources[groupName] = source;

    source.onmessage = function (e) {
        try {
            const messageData = JSON.parse(e.data);
            // Only append if the message is for the currently active chat group
            if (messageData.group_name === currentActiveChatGroup) {
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

    source.onerror = function (err) {
        console.error('EventSource failed for group ' + groupName + ':', err);
        source.close();
        delete eventSources[groupName];
        // Only attempt reconnect if currentActiveChatGroup is still this groupName
        // Otherwise, it means user switched chat, and we shouldn't reconnect here
        if (currentActiveChatGroup === groupName) {
            setTimeout(() => initEventSource(groupName), 3000); // Attempt reconnect after 3 seconds
        }
    };
    console.log(`Opened SSE for group: ${groupName}`);
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
        const response = await fetch(`/chat/`, {
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

            data.chats.forEach((chat) => {
                const listItem = document.createElement('li');
                listItem.classList.add('list-group-item');
                if (chat.group_name === currentActiveChatGroup) {
                    listItem.classList.add('active'); // Highlight active room
                }
                listItem.dataset.groupName = chat.group_name;
                // Display the name of the other participant in the 1-to-1 chat
                listItem.textContent = chat.display_name;
                listItem.style.cursor = 'pointer';

                listItem.onclick = () => switchChatRoom(chat.group_name);
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
function switchChatRoom(username, newGroupName) {
    if (currentActiveChatGroup === newGroupName) {
        return; // Already in this room
    }

    // Update active class in the list
    const oldActiveItem = document.querySelector(`#chatRoomList .list-group-item.active`);
    if (oldActiveItem) {
        oldActiveItem.classList.remove('active');
    }
    const newActiveItem = document.querySelector(`#chatRoomList [data-group-name="${newGroupName}"]`);
    if (newActiveItem) {
        newActiveItem.classList.add('active');
    }

    // Update current active group
    currentActiveChatGroup = newGroupName;

    // Update header of the right column with the other user's name
    const activeChatRoomName = document.getElementById('activeChatRoomName');
    const targetChatListItem = document.querySelector(`#chatRoomList [data-group-name="${newGroupName}"]`);
    if (activeChatRoomName && targetChatListItem) {
        activeChatRoomName.textContent = `Chat with ${targetChatListItem.textContent}`;
    }

    // Update hidden input for sending messages
    const groupNameInput = document.getElementById('groupNameInput-active');
    if (groupNameInput) {
        groupNameInput.value = newGroupName;
    }

    // Enable message input and send button
    document.getElementById('messageInput-active').disabled = false;
    document.getElementById('sendMessageBtn').disabled = false;

    // Clear current messages
    const chatLog = document.getElementById('chatLog-active');
    if (chatLog) {
        chatLog.innerHTML = ''; // Clear chat log
        chatLog.scrollTop = chatLog.scrollHeight; // Reset scroll
    }

    // Load history and initialize SSE for the new group
    messageOffsets[newGroupName] = 0; // Reset offset for new room
    loadMessageHistory(username, newGroupName);
    initEventSource(newGroupName);

    // Focus on message input
    const messageInput = document.getElementById('messageInput-active');
    if (messageInput) {
        messageInput.focus();
    }
}

// Function to request creation/retrieval of a private group
async function promptPrivateChat(username, targetUsername) {
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
    let existingGroupName = null;
    chatRooms.forEach(room => {
        // Here we rely on the displayed name (other user's username)
        if (room.textContent.trim() === targetUsername.trim()) {
            existingGroupName = room.dataset.groupName;
        }
    });

    if (existingGroupName) {
        console.log(`Chat with ${targetUsername} already exists. Switching to it.`);
        switchChatRoom(existingGroupName);
        return;
    }

    if (confirm(`Do you want to start a new chat with ${targetUsername}?`)) {

        try {
            // UPDATED URL: /chat/ (POST)
            const response = await fetch('/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Backend expects JSON now
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify({ // Send as JSON
                    current_username: username,
                    target_username: targetUsername,
                }),
                credentials: 'include', // Include cookies for session management
            });

            const data = await response.json();
            if (response.ok && data.status === 'success' && data.group_name) {
                console.log(`Chat group ${data.group_name} created/retrieved.`);
                loadChatRoomList(username); // Reload list to include new chat
                // Wait for the list to be updated in the DOM before switching
                setTimeout(() => {
                    switchChatRoom(data.group_name); // Switch to the new chat
                }, 100); // Small delay to ensure DOM update
            } else {
                console.error('Server error creating chat group:', data.message);
                alert('Error creating chat group: ' + data.message);
            }
        } catch (error) {
            console.error('Network error creating chat group:', error);
            alert('Cannot connect to server to create chat group.');
        }
    }
}

// Event handler for "Start New Chat" button in the modal
async function handleStartNewChat(username) {
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

    await promptPrivateChat(targetUsername);
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
		const response = await fetch(
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
		document.querySelectorAll('.profile-btn').forEach((btn) => {
			btn.addEventListener('click', function () {
				userInput.value = btn.dataset.username;
				resultsBox.innerHTML = '';
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
            if (chatLog) chatLog.innerHTML = `<div class="no-chat-selected text-center text-muted py-5"><p>Select a chat from the left, or start a new one above.</p></div>`;
            
            document.getElementById('messageInput-active').disabled = true;
            document.getElementById('sendMessageBtn').disabled = true;
            document.getElementById('activeChatRoomName').textContent = ''; // Clear header
            document.getElementById('groupNameInput-active').value = '';
            document.getElementById('targetUserInput').value = ''; // Clear new chat input
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
        sendMessageBtn.addEventListener('click', sendMessage);
    }
    const messageInput = document.getElementById('messageInput-active');
    if (messageInput) {
        messageInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage(username);
            }
        });
    }

    // 4. Attach "Start New Chat" button event listener
    const startNewChatBtn = document.getElementById('startNewChatBtn');
    if (startNewChatBtn) {
        startNewChatBtn.addEventListener('click', handleStartNewChat);
    }
}

export async function renderChatButtonIfAuthenticated() {
	let userIsAuth = await isUserAuthenticated();
	if (userIsAuth) {
		const username = await fetch('user-service/infoUser/', {
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