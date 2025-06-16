import { routes } from '../routes.js';
import {
	actualizeIndexPage,
	getCookie,
	loadTemplate,
	closeModal,
} from '../utils.js';

const chatBubbles = {}; // Stocke les références aux éléments de bulle par groupName
const eventSources = {}; // Stocke les objets EventSource par groupName
const messageOffsets = {}; // NOUVEAU: Stocke l'offset pour l'historique de chaque groupe

// Helper pour créer un élément message HTML
function createMessageElement(messageData, groupName) {
	const msg = document.createElement('div');
	msg.classList.add('chat-message');

	const usernameInput = document.getElementById(`usernameInput-${groupName}`);
	const currentUsername = usernameInput ? usernameInput.value : '';

	// Détermine si c'est son propre message
	if (
		messageData.sender === currentUsername ||
		messageData.sender__username === currentUsername
	) {
		// Ajout de sender__username pour la compatibilité historique
		msg.classList.add('self');
	} else {
		msg.classList.add('other');
	}

	const senderSpan = document.createElement('span');
	senderSpan.classList.add('message-sender');
	// UTILISE 'messageData.sender__username' QUI VIENT DE L'HISTORIQUE OU 'messageData.sender' DES NOUVEAUX MESSAGES
	senderSpan.textContent = messageData.sender__username || messageData.sender;
	// ... (Reste du code pour le nom d'utilisateur cliquable) ...
	// Rendre le nom cliquable pour initier un chat privé (sauf avec soi-même)
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
	timestampSpan.textContent = messageData.timestamp;
	msg.appendChild(timestampSpan);

	return msg;
}

// NOUVELLE FONCTION: Charger l'historique des messages
async function loadMessageHistory(groupName, prepend = false) {
	const chatLog = document.getElementById(`chatLog-${groupName}`);
	if (!chatLog) {
		console.error(
			`chatLog-${groupName} introuvable pour charger l'historique.`
		);
		return;
	}

	const offset = messageOffsets[groupName] || 0;
	const limit = 20; // Nombre de messages à charger à chaque fois

	try {
		const response = await fetch(
			`/chat/history/${groupName}/?offset=${offset}&limit=${limit}`
		);
		const data = await response.json();

		if (response.ok && data.status === 'success') {
			if (data.messages.length > 0) {
				const fragment = document.createDocumentFragment();
				data.messages.forEach((msgData) => {
					const msgElement = createMessageElement(msgData, groupName);
					if (prepend) {
						fragment.appendChild(msgElement);
					} else {
						chatLog.appendChild(msgElement);
					}
				});

				if (prepend) {
					// Si on ajoute en haut, il faut insérer au début et ajuster le scroll
					const oldScrollHeight = chatLog.scrollHeight;
					chatLog.insertBefore(fragment, chatLog.firstChild);
					const newScrollHeight = chatLog.scrollHeight;
					// Maintenir la position de défilement relative
					chatLog.scrollTop = newScrollHeight - oldScrollHeight;
				} else {
					chatLog.appendChild(fragment);
					chatLog.scrollTop = chatLog.scrollHeight; // Défiler vers le bas après chargement initial
				}
				messageOffsets[groupName] = offset + data.messages.length;
			} else if (!prepend) {
				// Si aucun message n'est chargé au début, c'est peut-être la première fois
				console.log(
					`Pas d'historique pour ${groupName} ou fin de l'historique.`
				);
			}
		} else {
			console.error(
				'Erreur de chargement historique:',
				data.message || 'Unknown error'
			);
		}
	} catch (error) {
		console.error("Erreur réseau lors du chargement de l'historique:", error);
	}
}
// NOUVELLE variable pour les couleurs des boutons privés
const privateChatButtonColors = [
	'color1',
	'color2',
	'color3',
	'color4',
	'color5', // Ajoutez plus si vous prévoyez beaucoup de chats privés
];
const assignedPrivateChatColors = {}; // Pour suivre les couleurs déjà attribuées

// --- Nouvelle fonction pour créer et gérer les boutons de chat ---
function createChatToggleButton(groupName, isPrivate = false) {
	const buttonsContainer = document.getElementById('chatButtonsContainer');
	let button = document.getElementById(`chatToggleButton-${groupName}`);

	// Si le bouton existe déjà, ne rien faire (il est déjà là)
	if (button) {
		return button;
	}

	button = document.createElement('button');
	button.classList.add('chat-toggle-button');
	button.id = `chatToggleButton-${groupName}`;
	button.textContent = '💬'; // Icône par défaut

	if (isPrivate) {
		button.classList.add('private');
		// Trouver une couleur disponible ou en réutiliser une si le chat a déjà été ouvert
		let colorClass = assignedPrivateChatColors[groupName];
		if (!colorClass) {
			// Simple assignation de couleur cyclique
			const colorIndex =
				Object.keys(assignedPrivateChatColors).length %
				privateChatButtonColors.length;
			colorClass = privateChatButtonColors[colorIndex];
			assignedPrivateChatColors[groupName] = colorClass;
		}
		button.classList.add(colorClass);

		// Mettre les initiales de l'interlocuteur dans l'icône du bouton
		const participants = groupName.split('_').slice(1); // Ex: 'private_Alice_Bob' -> ['Alice', 'Bob']
		if (participants.length >= 2) {
			const otherUser = participants[0]; // Ou mettez une logique pour identifier l'autre utilisateur
			button.textContent = otherUser.charAt(0).toUpperCase(); // Première lettre de l'autre utilisateur
		} else {
			button.textContent = '🔒'; // Icône générique pour chat privé si noms non disponibles
		}
	} else {
		// Chat général, pas de changement pour l'icône par défaut
	}

	// Gérer l'action de clic
	button.onclick = () => {
		toggleChat(groupName);
	};

	// Ajouter le bouton au conteneur (il sera ajouté au début grâce à flex-direction: row-reverse)
	buttonsContainer.prepend(button); // Ajoute au début du conteneur pour alignement de droite à gauche

	return button;
}
// Fonction pour créer une bulle de chat dynamique
// --- Mise à jour de la fonction createChatBubble ---
async function createChatBubble(groupName, isPrivate = false) {
	// Si la bulle existe déjà, l'afficher et ne pas la recréer
	if (chatBubbles[groupName]) {
		toggleChat(groupName, true); // Force l'affichage
		// S'assurer que le nom d'utilisateur est copié si c'est un nouveau chat privé
		const usernameInputGeneral = document.getElementById(
			'usernameInput-general'
		);
		const usernameInputCurrent = document.getElementById(
			`usernameInput-${groupName}`
		);
		if (
			usernameInputGeneral &&
			usernameInputCurrent &&
			!usernameInputCurrent.value
		) {
			usernameInputCurrent.value = usernameInputGeneral.value;
		}
		const chatLog = document.getElementById(`chatLog-${groupName}`);
		if (chatLog) {
			chatLog.scrollTop = chatLog.scrollHeight; // Scroll vers le bas
		}
		// Assurez-vous que le bouton est créé/visible si la bulle existe déjà
		createChatToggleButton(groupName, isPrivate);
		return;
	}

	const chatContainer = document.createElement('div');
	chatContainer.classList.add('chat-bubble');
	chatContainer.id = `chatBubble-${groupName}`;

	if (isPrivate) {
		chatContainer.classList.add('private-chat');
		// Calculer la position 'right' pour que les bulles privées s'empilent à gauche
		// Chaque bulle privée aura un 'right' décalé par rapport à la précédente
		const existingBubbles = document.querySelectorAll(
			'.chat-bubble[style*="display: flex"]'
		);
		const offset = existingBubbles.length * 370; // 350px (largeur) + 20px (marge) ou plus
		chatContainer.style.right = `${20 + offset}px`; // 20px de base + offset
	}

	// Générer le contenu HTML de la bulle en utilisant les IDs dynamiques
	chatContainer.innerHTML = `
        <div class="chat-header" onclick="toggleChat('${groupName}')">
            ${
							isPrivate
								? `Chat Privé (${groupName.split('_').slice(1).join(' - ')})`
								: 'Chat Général'
						}
        </div>
        <div class="chat-body" id="chatLog-${groupName}">
        </div>
        <div class="chat-input">
            <input type="text" id="usernameInput-${groupName}" placeholder="Votre nom">
            <input type="hidden" id="groupNameInput-${groupName}" value="${groupName}">
        </div>
        <div class="chat-input">
            <input type="text" id="messageInput-${groupName}" placeholder="Écris un message">
            <button onclick="sendMessage('${groupName}')">Envoyer</button>
        </div>
    `;

	document.body.appendChild(chatContainer); // Ajouter la bulle au corps du document
	chatBubbles[groupName] = chatContainer; // Stocker la référence

	// Important: Créez le bouton correspondant à la bulle ici
	createChatToggleButton(groupName, isPrivate);

	toggleChat(groupName, true); // Force l'affichage de la nouvelle bulle

	// Copier le nom d'utilisateur si déjà renseigné dans le chat général
	const usernameInputGeneral = document.getElementById('usernameInput-general');
	const usernameInputCurrent = document.getElementById(
		`usernameInput-${groupName}`
	);
	if (usernameInputGeneral && usernameInputCurrent) {
		usernameInputCurrent.value = usernameInputGeneral.value;
	}

	await loadMessageHistory(groupName); // Charger l'historique des messages pour cette bulle

	initEventSource(groupName); // Initialiser la connexion SSE pour ce nouveau groupe

	// Ajouter l'écouteur de scroll pour charger plus d'historique
	const chatLog = document.getElementById(`chatLog-${groupName}`);
	if (chatLog) {
		chatLog.addEventListener('scroll', function () {
			if (chatLog.scrollTop === 0) {
				loadMessageHistory(groupName, true);
			}
		});
	}
}

// Fonction pour afficher/masquer une bulle de chat
// --- Mise à jour de la fonction toggleChat ---
function toggleChat(groupName, forceDisplay = false) {
	const bubble = document.getElementById(`chatBubble-${groupName}`);
	if (bubble) {
		if (forceDisplay) {
			bubble.style.display = 'flex';
		} else {
			bubble.style.display =
				bubble.style.display === 'none' || bubble.style.display === ''
					? 'flex'
					: 'none';
		}

		// Si affiché, faire défiler vers le bas
		if (bubble.style.display === 'flex') {
			const chatLog = document.getElementById(`chatLog-${groupName}`);
			if (chatLog) {
				chatLog.scrollTop = chatLog.scrollHeight;
			}
			// Mettre à jour la position des autres bulles si celle-ci s'affiche/se masque
			updateChatBubblePositions();
		} else {
			// Si la bulle est masquée, ajuster la position des autres
			updateChatBubblePositions();
		}
	}
}

// Fonction pour envoyer un message
async function sendMessage(groupName) {
	const usernameInput = document.getElementById(`usernameInput-${groupName}`);
	const messageInput = document.getElementById(`messageInput-${groupName}`);
	const groupNameInput = document.getElementById(`groupNameInput-${groupName}`);

	const username = usernameInput.value.trim();
	const content = messageInput.value.trim();
	const currentGroupName = groupNameInput.value;

	if (!username || !content) {
		alert('Veuillez entrer votre nom et un message.');
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
				group_name: currentGroupName,
			}),
		});

		const data = await response.json();
		if (response.ok) {
			if (data.status === 'success') {
				messageInput.value = '';
			} else {
				console.error("Erreur serveur lors de l'envoi:", data.message);
				alert("Erreur lors de l'envoi du message: " + data.message);
			}
		} else {
			console.error(
				"Erreur HTTP lors de l'envoi:",
				response.status,
				data.message || response.statusText
			);
			alert('Erreur HTTP: ' + (data.message || response.statusText));
		}
	} catch (error) {
		console.error('Erreur réseau ou JSON:', error);
		alert('Impossible de se connecter au serveur pour envoyer le message.');
	}
}

// Fonction pour initialiser l'EventSource (SSE) pour un groupe
function initEventSource(groupName) {
	if (
		eventSources[groupName] &&
		eventSources[groupName].readyState === EventSource.OPEN
	) {
		return;
	}

	const chatLog = document.getElementById(`chatLog-${groupName}`);
	if (!chatLog) {
		console.error(`chatLog-${groupName} introuvable pour initEventSource.`);
		return;
	}

	const source = new EventSource(`/chat/stream/${groupName}/`);
	eventSources[groupName] = source;

	source.onmessage = function (e) {
		try {
			// Les messages SSE sont envoyés directement par le backend en JSON pour le stream
			const messageData = JSON.parse(e.data);
			const msgElement = createMessageElement(messageData, groupName);
			chatLog.appendChild(msgElement);
			chatLog.scrollTop = chatLog.scrollHeight; // Défiler vers le bas
			// NOUVEAU: Ajouter le point rouge si la bulle n'est pas visible (futur)
			// addNotificationDot(groupName);
		} catch (error) {
			console.error(
				'Erreur de parsing JSON ou de traitement du message SSE:',
				error,
				e.data
			);
		}
	};

	source.onerror = function (err) {
		console.error('EventSource failed:', err);
		// Gérer les erreurs de connexion SSE (reconnexion, affichage message utilisateur, etc.)
		// source.close(); // Peut-être fermer et tenter de reconnecter après un délai
	};
}

// Fonction pour obtenir le token CSRF (inchangée)
function getCookie(name) {
	let cookieValue = null;
	if (document.cookie && document.cookie !== '') {
		const cookies = document.cookie.split(';');
		for (let i = 0; i < cookies.length; i++) {
			const cookie = cookies[i].trim();
			if (cookie.substring(0, name.length + 1) === name + '=') {
				cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
				break;
			}
		}
	}
	return cookieValue;
}

// Fonction pour demander la création/récupération d'un groupe privé (inchangée)
async function promptPrivateChat(targetUsername, targetUserId) {
	const currentUsernameInput =
		document.getElementById('usernameInput-general') ||
		document.querySelector('.chat-bubble input[id^="usernameInput-"]');
	if (!currentUsernameInput || !currentUsernameInput.value) {
		alert(
			"Veuillez d'abord entrer votre nom d'utilisateur dans le chat général."
		);
		return;
	}
	const currentUsername = currentUsernameInput.value.trim();

	if (currentUsername === targetUsername) {
		alert('Vous ne pouvez pas démarrer un chat privé avec vous-même.');
		return;
	}

	if (confirm(`Voulez-vous démarrer un chat privé avec ${targetUsername}?`)) {
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
					// target_user_id: targetUserId // Si vous avez l'ID et que le backend l'utilise
				}).toString(),
			});

			const data = await response.json();
			if (response.ok) {
				if (data.status === 'success' && data.group_name) {
					createChatBubble(data.group_name, true); // Créer la bulle du chat privé
				} else {
					console.error(
						'Erreur serveur lors de la création du groupe privé:',
						data.message
					);
					alert('Erreur lors de la création du groupe privé: ' + data.message);
				}
			} else {
				console.error(
					'Erreur HTTP lors de la création du groupe privé:',
					response.status,
					data.error || response.statusText
				);
				alert('Erreur HTTP: ' + (data.error || response.statusText));
			}
		} catch (error) {
			console.error(
				'Erreur réseau lors de la création du groupe privé:',
				error
			);
			alert(
				'Impossible de se connecter au serveur pour créer le groupe privé.'
			);
		}
	}
}
// NOUVELLE FONCTION: Mettre à jour la position des bulles de chat privées
function updateChatBubblePositions() {
	const activeBubbles = document.querySelectorAll(
		'.chat-bubble[style*="display: flex"]'
	);
	let currentOffset = 0;
	activeBubbles.forEach((bubble) => {
		// Ne déplace que les bulles privées
		if (bubble.classList.contains('private-chat')) {
			bubble.style.right = `${20 + currentOffset}px`;
			currentOffset += bubble.offsetWidth + 20; // Largeur de la bulle + gap
		}
	});
}

// Exécute ce code lorsque le DOM est entièrement chargé
document.addEventListener('DOMContentLoaded', () => {
	// Créer la bulle de chat générale au chargement de la page
	createChatBubble('general', false);

	// Attacher l'écouteur d'événements pour la touche 'Entrée'
	document.addEventListener('keydown', function (event) {
		if (event.key === 'Enter') {
			const activeElement = document.activeElement;
			if (activeElement && activeElement.id.startsWith('messageInput-')) {
				const groupName = activeElement.id.split('-')[1];
				sendMessage(groupName);
				event.preventDefault();
			}
		}
	});
});

export function chatController() {
	
}
