// import { routes } from '../routes.js';
// import {
// 	actualizeIndexPage,
// 	getCookie,
// 	loadTemplate,
// 	closeModal,
// } from '../utils.js';

// const chatBubbles = {}; // Stocke les références aux éléments de bulle par groupName
// const eventSources = {}; // Stocke les objets EventSource par groupName
// const messageOffsets = {}; // NOUVEAU: Stocke l'offset pour l'historique de chaque groupe


// // Helper pour créer un élément message HTML
// function createMessageElement(messageData, groupName) {
// 	const msg = document.createElement('div');
// 	msg.classList.add('chat-message');

// 	const usernameInput = document.getElementById(`usernameInput-${groupName}`);
// 	const currentUsername = usernameInput ? usernameInput.value : '';

// 	// Détermine si c'est son propre message
// 	if (
// 		messageData.sender === currentUsername ||
// 		messageData.sender__username === currentUsername
// 	) {
// 		// Ajout de sender__username pour la compatibilité historique
// 		msg.classList.add('self');
// 	} else {
// 		msg.classList.add('other');
// 	}

// 	const senderSpan = document.createElement('span');
// 	senderSpan.classList.add('message-sender');
// 	// UTILISE 'messageData.sender__username' QUI VIENT DE L'HISTORIQUE OU 'messageData.sender' DES NOUVEAUX MESSAGES
// 	senderSpan.textContent = messageData.sender__username || messageData.sender;
// 	// ... (Reste du code pour le nom d'utilisateur cliquable) ...
// 	// Rendre le nom cliquable pour initier un chat privé (sauf avec soi-même)
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

// // NOUVELLE FONCTION: Charger l'historique des messages
// async function loadMessageHistory(groupName, prepend = false) {
// 	const chatLog = document.getElementById(`chatLog-${groupName}`);
// 	if (!chatLog) {
// 		console.error(
// 			`chatLog-${groupName} introuvable pour charger l'historique.`
// 		);
// 		return;
// 	}

// 	const offset = messageOffsets[groupName] || 0;
// 	const limit = 20; // Nombre de messages à charger à chaque fois

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
// 					if (prepend) {
// 						fragment.appendChild(msgElement);
// 					} else {
// 						chatLog.appendChild(msgElement);
// 					}
// 				});

// 				if (prepend) {
// 					// Si on ajoute en haut, il faut insérer au début et ajuster le scroll
// 					const oldScrollHeight = chatLog.scrollHeight;
// 					chatLog.insertBefore(fragment, chatLog.firstChild);
// 					const newScrollHeight = chatLog.scrollHeight;
// 					// Maintenir la position de défilement relative
// 					chatLog.scrollTop = newScrollHeight - oldScrollHeight;
// 				} else {
// 					chatLog.appendChild(fragment);
// 					chatLog.scrollTop = chatLog.scrollHeight; // Défiler vers le bas après chargement initial
// 				}
// 				messageOffsets[groupName] = offset + data.messages.length;
// 			} else if (!prepend) {
// 				// Si aucun message n'est chargé au début, c'est peut-être la première fois
// 				console.log(
// 					`Pas d'historique pour ${groupName} ou fin de l'historique.`
// 				);
// 			}
// 		} else {
// 			console.error(
// 				'Erreur de chargement historique:',
// 				data.message || 'Unknown error'
// 			);
// 		}
// 	} catch (error) {
// 		console.error("Erreur réseau lors du chargement de l'historique:", error);
// 	}
// }
// // NOUVELLE variable pour les couleurs des boutons privés
// const privateChatButtonColors = [
// 	'color1',
// 	'color2',
// 	'color3',
// 	'color4',
// 	'color5', // Ajoutez plus si vous prévoyez beaucoup de chats privés
// ];
// const assignedPrivateChatColors = {}; // Pour suivre les couleurs déjà attribuées

// // --- Nouvelle fonction pour créer et gérer les boutons de chat ---
// function createChatToggleButton(groupName, isPrivate = false) {
// 	const buttonsContainer = document.getElementById('chatButtonsContainer');
// 	let button = document.getElementById(`chatToggleButton-${groupName}`);

// 	// Si le bouton existe déjà, ne rien faire (il est déjà là)
// 	if (button) {
// 		return button;
// 	}

// 	button = document.createElement('button');
// 	button.classList.add('chat-toggle-button');
// 	button.id = `chatToggleButton-${groupName}`;
// 	button.textContent = '💬'; // Icône par défaut

// 	if (isPrivate) {
// 		button.classList.add('private');
// 		// Trouver une couleur disponible ou en réutiliser une si le chat a déjà été ouvert
// 		let colorClass = assignedPrivateChatColors[groupName];
// 		if (!colorClass) {
// 			// Simple assignation de couleur cyclique
// 			const colorIndex =
// 				Object.keys(assignedPrivateChatColors).length %
// 				privateChatButtonColors.length;
// 			colorClass = privateChatButtonColors[colorIndex];
// 			assignedPrivateChatColors[groupName] = colorClass;
// 		}
// 		button.classList.add(colorClass);

// 		// Mettre les initiales de l'interlocuteur dans l'icône du bouton
// 		const participants = groupName.split('_').slice(1); // Ex: 'private_Alice_Bob' -> ['Alice', 'Bob']
// 		if (participants.length >= 2) {
// 			const otherUser = participants[0]; // Ou mettez une logique pour identifier l'autre utilisateur
// 			button.textContent = otherUser.charAt(0).toUpperCase(); // Première lettre de l'autre utilisateur
// 		} else {
// 			button.textContent = '🔒'; // Icône générique pour chat privé si noms non disponibles
// 		}
// 	} else {
// 		// Chat général, pas de changement pour l'icône par défaut
// 	}

// 	// Gérer l'action de clic
// 	button.onclick = () => {
// 		toggleChat(groupName);
// 	};

// 	// Ajouter le bouton au conteneur (il sera ajouté au début grâce à flex-direction: row-reverse)
// 	buttonsContainer.prepend(button); // Ajoute au début du conteneur pour alignement de droite à gauche

// 	return button;
// }
// // Fonction pour créer une bulle de chat dynamique
// // --- Mise à jour de la fonction createChatBubble ---
// async function createChatBubble(groupName, isPrivate = false) {
// 	// Si la bulle existe déjà, l'afficher et ne pas la recréer
// 	if (chatBubbles[groupName]) {
// 		toggleChat(groupName, true); // Force l'affichage
// 		// S'assurer que le nom d'utilisateur est copié si c'est un nouveau chat privé
// 		const usernameInputGeneral = document.getElementById(
// 			'usernameInput-general'
// 		);
// 		const usernameInputCurrent = document.getElementById(
// 			`usernameInput-${groupName}`
// 		);
// 		if (
// 			usernameInputGeneral &&
// 			usernameInputCurrent &&
// 			!usernameInputCurrent.value
// 		) {
// 			usernameInputCurrent.value = usernameInputGeneral.value;
// 		}
// 		const chatLog = document.getElementById(`chatLog-${groupName}`);
// 		if (chatLog) {
// 			chatLog.scrollTop = chatLog.scrollHeight; // Scroll vers le bas
// 		}
// 		// Assurez-vous que le bouton est créé/visible si la bulle existe déjà
// 		createChatToggleButton(groupName, isPrivate);
// 		return;
// 	}

// 	const chatContainer = document.createElement('div');
// 	chatContainer.classList.add('chat-bubble');
// 	chatContainer.id = `chatBubble-${groupName}`;

// 	if (isPrivate) {
// 		chatContainer.classList.add('private-chat');
// 		// Calculer la position 'right' pour que les bulles privées s'empilent à gauche
// 		// Chaque bulle privée aura un 'right' décalé par rapport à la précédente
// 		const existingBubbles = document.querySelectorAll(
// 			'.chat-bubble[style*="display: flex"]'
// 		);
// 		const offset = existingBubbles.length * 370; // 350px (largeur) + 20px (marge) ou plus
// 		chatContainer.style.right = `${20 + offset}px`; // 20px de base + offset
// 	}

// 	// Générer le contenu HTML de la bulle en utilisant les IDs dynamiques
// 	chatContainer.innerHTML = `
//         <div class="chat-header" onclick="toggleChat('${groupName}')">
//             ${
// 							isPrivate
// 								? `Chat Privé (${groupName.split('_').slice(1).join(' - ')})`
// 								: 'Chat Général'
// 						}
//         </div>
//         <div class="chat-body" id="chatLog-${groupName}">
//         </div>
//         <div class="chat-input">
//             <input type="text" id="usernameInput-${groupName}" placeholder="Votre nom">
//             <input type="hidden" id="groupNameInput-${groupName}" value="${groupName}">
//         </div>
//         <div class="chat-input">
//             <input type="text" id="messageInput-${groupName}" placeholder="Écris un message">
//             <button onclick="sendMessage('${groupName}')">Envoyer</button>
//         </div>
//     `;

// 	document.body.appendChild(chatContainer); // Ajouter la bulle au corps du document
// 	chatBubbles[groupName] = chatContainer; // Stocker la référence

// 	// Important: Créez le bouton correspondant à la bulle ici
// 	createChatToggleButton(groupName, isPrivate);

// 	toggleChat(groupName, true); // Force l'affichage de la nouvelle bulle

// 	// Copier le nom d'utilisateur si déjà renseigné dans le chat général
// 	const usernameInputGeneral = document.getElementById('usernameInput-general');
// 	const usernameInputCurrent = document.getElementById(
// 		`usernameInput-${groupName}`
// 	);
// 	if (usernameInputGeneral && usernameInputCurrent) {
// 		usernameInputCurrent.value = usernameInputGeneral.value;
// 	}

// 	await loadMessageHistory(groupName); // Charger l'historique des messages pour cette bulle

// 	initEventSource(groupName); // Initialiser la connexion SSE pour ce nouveau groupe

// 	// Ajouter l'écouteur de scroll pour charger plus d'historique
// 	const chatLog = document.getElementById(`chatLog-${groupName}`);
// 	if (chatLog) {
// 		chatLog.addEventListener('scroll', function () {
// 			if (chatLog.scrollTop === 0) {
// 				loadMessageHistory(groupName, true);
// 			}
// 		});
// 	}
// }

// // Fonction pour afficher/masquer une bulle de chat
// // --- Mise à jour de la fonction toggleChat ---
// function toggleChat(groupName, forceDisplay = false) {
// 	const bubble = document.getElementById(`chatBubble-${groupName}`);
// 	if (bubble) {
// 		if (forceDisplay) {
// 			bubble.style.display = 'flex';
// 		} else {
// 			bubble.style.display =
// 				bubble.style.display === 'none' || bubble.style.display === ''
// 					? 'flex'
// 					: 'none';
// 		}

// 		// Si affiché, faire défiler vers le bas
// 		if (bubble.style.display === 'flex') {
// 			const chatLog = document.getElementById(`chatLog-${groupName}`);
// 			if (chatLog) {
// 				chatLog.scrollTop = chatLog.scrollHeight;
// 			}
// 			// Mettre à jour la position des autres bulles si celle-ci s'affiche/se masque
// 			updateChatBubblePositions();
// 		} else {
// 			// Si la bulle est masquée, ajuster la position des autres
// 			updateChatBubblePositions();
// 		}
// 	}
// }

// // Fonction pour envoyer un message
// async function sendMessage(groupName) {
// 	const usernameInput = document.getElementById(`usernameInput-${groupName}`);
// 	const messageInput = document.getElementById(`messageInput-${groupName}`);
// 	const groupNameInput = document.getElementById(`groupNameInput-${groupName}`);

// 	const username = usernameInput.value.trim();
// 	const content = messageInput.value.trim();
// 	const currentGroupName = groupNameInput.value;

// 	if (!username || !content) {
// 		alert('Veuillez entrer votre nom et un message.');
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
// 				messageInput.value = '';
// 			} else {
// 				console.error("Erreur serveur lors de l'envoi:", data.message);
// 				alert("Erreur lors de l'envoi du message: " + data.message);
// 			}
// 		} else {
// 			console.error(
// 				"Erreur HTTP lors de l'envoi:",
// 				response.status,
// 				data.message || response.statusText
// 			);
// 			alert('Erreur HTTP: ' + (data.message || response.statusText));
// 		}
// 	} catch (error) {
// 		console.error('Erreur réseau ou JSON:', error);
// 		alert('Impossible de se connecter au serveur pour envoyer le message.');
// 	}
// }

// // Fonction pour initialiser l'EventSource (SSE) pour un groupe
// function initEventSource(groupName) {
// 	if (
// 		eventSources[groupName] &&
// 		eventSources[groupName].readyState === EventSource.OPEN
// 	) {
// 		return;
// 	}

// 	const chatLog = document.getElementById(`chatLog-${groupName}`);
// 	if (!chatLog) {
// 		console.error(`chatLog-${groupName} introuvable pour initEventSource.`);
// 		return;
// 	}

// 	const source = new EventSource(`/chat/stream/${groupName}/`);
// 	eventSources[groupName] = source;

// 	source.onmessage = function (e) {
// 		try {
// 			// Les messages SSE sont envoyés directement par le backend en JSON pour le stream
// 			const messageData = JSON.parse(e.data);
// 			const msgElement = createMessageElement(messageData, groupName);
// 			chatLog.appendChild(msgElement);
// 			chatLog.scrollTop = chatLog.scrollHeight; // Défiler vers le bas
// 			// NOUVEAU: Ajouter le point rouge si la bulle n'est pas visible (futur)
// 			// addNotificationDot(groupName);
// 		} catch (error) {
// 			console.error(
// 				'Erreur de parsing JSON ou de traitement du message SSE:',
// 				error,
// 				e.data
// 			);
// 		}
// 	};

// 	source.onerror = function (err) {
// 		console.error('EventSource failed:', err);
// 		// Gérer les erreurs de connexion SSE (reconnexion, affichage message utilisateur, etc.)
// 		// source.close(); // Peut-être fermer et tenter de reconnecter après un délai
// 	};
// }

// // Fonction pour obtenir le token CSRF (inchangée)
// function getCookie(name) {
// 	let cookieValue = null;
// 	if (document.cookie && document.cookie !== '') {
// 		const cookies = document.cookie.split(';');
// 		for (let i = 0; i < cookies.length; i++) {
// 			const cookie = cookies[i].trim();
// 			if (cookie.substring(0, name.length + 1) === name + '=') {
// 				cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
// 				break;
// 			}
// 		}
// 	}
// 	return cookieValue;
// }

// // Fonction pour demander la création/récupération d'un groupe privé (inchangée)
// async function promptPrivateChat(targetUsername, targetUserId) {
// 	const currentUsernameInput =
// 		document.getElementById('usernameInput-general') ||
// 		document.querySelector('.chat-bubble input[id^="usernameInput-"]');
// 	if (!currentUsernameInput || !currentUsernameInput.value) {
// 		alert(
// 			"Veuillez d'abord entrer votre nom d'utilisateur dans le chat général."
// 		);
// 		return;
// 	}
// 	const currentUsername = currentUsernameInput.value.trim();

// 	if (currentUsername === targetUsername) {
// 		alert('Vous ne pouvez pas démarrer un chat privé avec vous-même.');
// 		return;
// 	}

// 	if (confirm(`Voulez-vous démarrer un chat privé avec ${targetUsername}?`)) {
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
// 					// target_user_id: targetUserId // Si vous avez l'ID et que le backend l'utilise
// 				}).toString(),
// 			});

// 			const data = await response.json();
// 			if (response.ok) {
// 				if (data.status === 'success' && data.group_name) {
// 					createChatBubble(data.group_name, true); // Créer la bulle du chat privé
// 				} else {
// 					console.error(
// 						'Erreur serveur lors de la création du groupe privé:',
// 						data.message
// 					);
// 					alert('Erreur lors de la création du groupe privé: ' + data.message);
// 				}
// 			} else {
// 				console.error(
// 					'Erreur HTTP lors de la création du groupe privé:',
// 					response.status,
// 					data.error || response.statusText
// 				);
// 				alert('Erreur HTTP: ' + (data.error || response.statusText));
// 			}
// 		} catch (error) {
// 			console.error(
// 				'Erreur réseau lors de la création du groupe privé:',
// 				error
// 			);
// 			alert(
// 				'Impossible de se connecter au serveur pour créer le groupe privé.'
// 			);
// 		}
// 	}
// }
// // NOUVELLE FONCTION: Mettre à jour la position des bulles de chat privées
// function updateChatBubblePositions() {
// 	const activeBubbles = document.querySelectorAll(
// 		'.chat-bubble[style*="display: flex"]'
// 	);
// 	let currentOffset = 0;
// 	activeBubbles.forEach((bubble) => {
// 		// Ne déplace que les bulles privées
// 		if (bubble.classList.contains('private-chat')) {
// 			bubble.style.right = `${20 + currentOffset}px`;
// 			currentOffset += bubble.offsetWidth + 20; // Largeur de la bulle + gap
// 		}
// 	});
// }

// // Exécute ce code lorsque le DOM est entièrement chargé
// document.addEventListener('DOMContentLoaded', () => {
// 	// Créer la bulle de chat générale au chargement de la page
// 	createChatBubble('general', false);

// 	// Attacher l'écouteur d'événements pour la touche 'Entrée'
// 	document.addEventListener('keydown', function (event) {
// 		if (event.key === 'Enter') {
// 			const activeElement = document.activeElement;
// 			if (activeElement && activeElement.id.startsWith('messageInput-')) {
// 				const groupName = activeElement.id.split('-')[1];
// 				sendMessage(groupName);
// 				event.preventDefault();
// 			}
// 		}
// 	});
// });

// export function chatController() {
	
// }

import { routes } from '../routes.js'; // `routes.js` 파일에서 경로 관련 설정을 가져옵니다. 이 파일에서는 직접 사용되지 않지만, 프로젝트의 URL 관리에 필요할 수 있습니다.
import {
    actualizeIndexPage, // `../utils.js`에서 페이지 UI를 업데이트하는 함수를 가져옵니다.
    getCookie, // `../utils.js`에서 쿠키 값(예: CSRF 토큰)을 읽는 함수를 가져옵니다.
    loadTemplate, // `../utils.js`에서 템플릿을 동적으로 로드하는 함수를 가져옵니다. 이 파일에서는 직접 사용되지 않습니다.
    closeModal, // `../utils.js`에서 모달 창을 닫는 함수를 가져옵니다. 이 파일에서는 직접 사용되지 않습니다.
} from '../utils.js'; // 유틸리티 함수가 포함된 파일의 상대 경로입니다.

const chatBubbles = {}; // 각 채팅 그룹 이름(groupName)에 해당하는 채팅 버블(HTML 요소)의 참조를 저장하는 객체입니다. 이를 통해 이미 생성된 채팅 버블을 빠르게 찾을 수 있습니다.
const eventSources = {}; // 각 채팅 그룹 이름(groupName)에 해당하는 EventSource(Server-Sent Events) 객체의 참조를 저장하는 객체입니다. 실시간 메시지 스트리밍 연결을 관리합니다.
const messageOffsets = {}; // NOUVEAU: 각 채팅 그룹별로 이전에 로드된 메시지 수(오프셋)를 저장하는 객체입니다. 스크롤하여 이전 메시지 기록을 더 로드할 때 사용됩니다.

// Helper to create an HTML message element
// 메시지 데이터를 받아 HTML 메시지 요소를 생성하는 도우미 함수입니다.
function createMessageElement(messageData, groupName) {
    const msg = document.createElement('div'); // 새로운 `div` 요소를 생성하여 메시지 컨테이너로 사용합니다.
    msg.classList.add('chat-message'); // CSS 스타일링을 위해 `chat-message` 클래스를 추가합니다.

    const usernameInput = document.getElementById(`usernameInput-${groupName}`); // 현재 채팅 그룹의 사용자 이름 입력 필드를 찾습니다.
    const currentUsername = usernameInput ? usernameInput.value : ''; // 입력 필드가 존재하면 해당 값을 현재 사용자 이름으로 가져옵니다.

    // Détermine si c'est son propre message
    // 메시지가 현재 사용자가 보낸 것인지(자신) 아니면 다른 사용자가 보낸 것인지 판별합니다.
    if (
        messageData.sender === currentUsername || // 메시지 데이터의 `sender` 필드와 현재 사용자 이름이 일치하는 경우
        messageData.sender__username === currentUsername // 또는 `sender__username` 필드(메시지 기록과의 호환성을 위해 사용됨)와 현재 사용자 이름이 일치하는 경우
    ) {
        msg.classList.add('self'); // 메시지 발신자가 본인인 경우 `self` 클래스를 추가하여 다르게 스타일링합니다 (보통 오른쪽에 정렬).
    } else {
        msg.classList.add('other'); // 메시지 발신자가 다른 사람인 경우 `other` 클래스를 추가하여 다르게 스타일링합니다 (보통 왼쪽에 정렬).
    }

    const senderSpan = document.createElement('span'); // 발신자 이름을 표시할 `span` 요소를 생성합니다.
    senderSpan.classList.add('message-sender'); // CSS 스타일링을 위해 `message-sender` 클래스를 추가합니다.
    senderSpan.textContent = messageData.sender__username || messageData.sender; // `sender__username` (메시지 기록용) 또는 `sender` (새 메시지용)를 사용하여 발신자 이름을 텍스트로 설정합니다.

    const displayedSender = messageData.sender__username || messageData.sender; // 실제로 표시될 발신자 이름입니다.
    if (displayedSender && displayedSender !== currentUsername) { // 표시될 발신자 이름이 존재하고 현재 사용자가 아닌 경우에만
        senderSpan.style.cursor = 'pointer'; // `senderSpan`에 마우스 커서를 포인터로 변경하여 클릭 가능함을 나타냅니다.
        senderSpan.style.textDecoration = 'underline'; // 텍스트에 밑줄을 추가하여 클릭 가능함을 시각적으로 나타냅니다.
        senderSpan.onclick = () => // `senderSpan`을 클릭했을 때 실행될 함수를 정의합니다.
            promptPrivateChat(displayedSender, messageData.sender_id || null); // `promptPrivateChat` 함수를 호출하여 해당 사용자와의 개인 채팅 시작을 제안합니다. `sender_id`가 없으면 `null`을 전달합니다.
    }
    msg.appendChild(senderSpan); // 발신자 이름 `span`을 메시지 `div`에 추가합니다.

    const contentText = document.createTextNode(messageData.content); // 메시지 내용 텍스트 노드를 생성합니다.
    msg.appendChild(contentText); // 메시지 내용 텍스트 노드를 메시지 `div`에 추가합니다.

    const timestampSpan = document.createElement('span'); // 타임스탬프를 표시할 `span` 요소를 생성합니다.
    timestampSpan.classList.add('message-timestamp'); // CSS 스타일링을 위해 `message-timestamp` 클래스를 추가합니다.
    timestampSpan.textContent = messageData.timestamp; // 메시지 데이터의 타임스탬프를 텍스트로 설정합니다.
    msg.appendChild(timestampSpan); // 타임스탬프 `span`을 메시지 `div`에 추가합니다.

    return msg; // 완성된 메시지 HTML 요소를 반환합니다.
}

// Load message history
// 특정 그룹의 메시지 기록을 비동기적으로 로드하는 함수입니다. `prepend`가 true이면 메시지를 채팅 로그의 상단에 추가합니다.
async function loadMessageHistory(groupName, prepend = false) {
    const chatLog = document.getElementById(`chatLog-${groupName}`); // 해당 `groupName`에 대한 채팅 로그 컨테이너 요소를 찾습니다.
    if (!chatLog) { // `chatLog` 요소가 없으면 오류를 콘솔에 기록하고 함수를 종료합니다.
        console.error(
            `chatLog-${groupName} introuvable pour charger l'historique.`
        );
        return;
    }

    const offset = messageOffsets[groupName] || 0; // `messageOffsets` 객체에서 현재 그룹의 메시지 오프셋을 가져오거나, 없으면 0으로 초기화합니다.
    const limit = 20; // 한 번에 로드할 메시지의 최대 개수입니다.

    try {
        const response = await fetch( // 백엔드의 `/chat/history/` 엔드포인트에 메시지 기록을 요청합니다.
            `/chat/history/${groupName}/?offset=${offset}&limit=${limit}`
        );
        const data = await response.json(); // 응답을 JSON 형식으로 파싱합니다.

        if (response.ok && data.status === 'success') { // HTTP 응답이 성공적이고(2xx) 백엔드 응답의 `status` 필드가 'success'인 경우
            if (data.messages.length > 0) { // 응답에 메시지가 하나 이상 포함되어 있는 경우
                const fragment = document.createDocumentFragment(); // 성능 향상을 위해 DocumentFragment를 생성합니다. DOM에 직접 추가하는 대신 이 Fragment에 메시지를 추가한 후 한 번에 DOM에 추가합니다.
                data.messages.forEach((msgData) => { // 가져온 각 메시지 데이터에 대해
                    const msgElement = createMessageElement(msgData, groupName); // 메시지 HTML 요소를 생성합니다.
                    if (prepend) { // `prepend` 플래그가 `true`이면
                        fragment.appendChild(msgElement); // 메시지를 Fragment의 끝에 추가합니다.
                    } else { // `prepend` 플래그가 `false`이면 (초기 로드)
                        chatLog.appendChild(msgElement); // 메시지를 `chatLog`의 끝에 직접 추가합니다. (이 부분은 `fragment`를 사용한 `prepend` 로직과 일관성을 위해 조정될 수 있습니다.)
                    }
                });

                if (prepend) { // `prepend`가 `true`일 때 (스크롤하여 이전 기록 로드)
                    const oldScrollHeight = chatLog.scrollHeight; // 메시지 추가 전 `chatLog`의 전체 스크롤 높이를 저장합니다.
                    chatLog.insertBefore(fragment, chatLog.firstChild); // DocumentFragment를 `chatLog`의 맨 앞에 삽입합니다.
                    const newScrollHeight = chatLog.scrollHeight; // 메시지 추가 후 `chatLog`의 새 전체 스크롤 높이를 가져옵니다.
                    chatLog.scrollTop = newScrollHeight - oldScrollHeight; // 스크롤 위치를 조정하여 사용자가 새로운 메시지를 로드한 후에도 이전 메시지가 화면에 보이는 상대적 위치에 머물도록 합니다.
                } else { // `prepend`가 `false`일 때 (초기 메시지 로드)
                    chatLog.appendChild(fragment); // DocumentFragment를 `chatLog`의 끝에 삽입합니다.
                    chatLog.scrollTop = chatLog.scrollHeight; // 스크롤을 맨 아래로 이동하여 최신 메시지가 보이도록 합니다.
                }
                messageOffsets[groupName] = offset + data.messages.length; // 다음 `loadMessageHistory` 호출을 위해 `messageOffsets`를 업데이트합니다.
            } else if (!prepend) { // `prepend`가 `false`인데 메시지가 없는 경우 (즉, 초기 로드 시 기록 없음)
                console.log(
                    `Pas d'historique pour ${groupName} ou fin de l'historique.`
                ); // 콘솔에 로그를 출력합니다.
            }
        } else { // HTTP 응답이 실패했거나 백엔드 응답의 `status`가 'success'가 아닌 경우
            console.error(
                'Erreur de chargement historique:', // 오류 메시지를 콘솔에 기록합니다.
                data.message || 'Unknown error' // `data.message`가 있으면 사용하고, 없으면 'Unknown error'를 사용합니다.
            );
        }
    } catch (error) { // 네트워크 요청 중 오류가 발생한 경우 (예: 연결 문제)
        console.error("Erreur réseau lors du chargement de l'historique:", error); // 네트워크 오류 메시지를 콘솔에 기록합니다.
    }
}

// Variable for private chat button colors
const privateChatButtonColors = [ // 개인 채팅 버튼에 적용할 수 있는 CSS 클래스 이름 배열입니다.
    'color1',
    'color2',
    'color3',
    'color4',
    'color5', // 더 많은 색상을 추가하여 개인 채팅의 시각적 다양성을 높일 수 있습니다.
];
const assignedPrivateChatColors = {}; // 각 개인 채팅 그룹 이름에 이미 할당된 색상 클래스를 추적하는 객체입니다.

// Function to hide all chat bubbles and show their respective toggle buttons
// 현재 열려 있는 모든 채팅 버블을 숨기고 해당 채팅 토글 버튼을 표시하는 함수입니다.
function hideAllChatBubbles() {
    for (const groupName in chatBubbles) { // `chatBubbles` 객체의 모든 `groupName`을 순회합니다.
        const bubble = chatBubbles[groupName]; // 해당 `groupName`에 대한 채팅 버블 요소를 가져옵니다.
        bubble.style.display = 'none'; // 채팅 버블의 CSS `display` 속성을 'none'으로 설정하여 숨깁니다.
        const button = document.getElementById(`chatToggleButton-${groupName}`); // 해당 `groupName`에 대한 채팅 토글 버튼 요소를 찾습니다.
        if (button) { // 버튼이 존재하는 경우
            button.style.display = 'flex'; // 버튼의 `display` 속성을 'flex'로 설정하여 표시합니다.
        }
    }
}

// Function to create and manage chat toggle buttons
// 채팅 토글 버튼을 생성하고 관리하는 함수입니다. 이 버튼은 최소화된 채팅 창을 나타냅니다.
function createChatToggleButton(groupName, isPrivate = false) {
    const buttonsContainer = document.getElementById('chatButtonsContainer'); // 채팅 버튼들이 추가될 컨테이너 요소를 찾습니다.
    let button = document.getElementById(`chatToggleButton-${groupName}`); // 해당 `groupName`에 대한 버튼이 이미 DOM에 존재하는지 확인합니다.

    if (button) { // 버튼이 이미 존재하면
        return button; // 기존 버튼을 반환하고 새롭게 생성하지 않습니다.
    }

    button = document.createElement('button'); // 새로운 `button` 요소를 생성합니다.
    button.classList.add('chat-toggle-button'); // CSS 스타일링을 위한 기본 클래스를 추가합니다.
    button.id = `chatToggleButton-${groupName}`; // 버튼에 고유한 ID를 할당합니다.
    button.textContent = '💬'; // 기본 아이콘(말풍선 이모지)을 설정합니다.

    if (isPrivate) { // 이 버튼이 개인 채팅용인 경우
        button.classList.add('private'); // CSS 스타일링을 위해 `private` 클래스를 추가합니다.
        let colorClass = assignedPrivateChatColors[groupName]; // `assignedPrivateChatColors`에서 이 그룹에 이미 할당된 색상 클래스를 확인합니다.
        if (!colorClass) { // 할당된 색상 클래스가 없는 경우
            const colorIndex = // `privateChatButtonColors` 배열에서 사용할 색상 인덱스를 계산합니다.
                Object.keys(assignedPrivateChatColors).length % // 이미 할당된 개인 채팅 수(키의 개수)를 가져옵니다.
                privateChatButtonColors.length; // 색상 배열의 길이로 나눈 나머지를 사용하여 순환적으로 색상을 할당합니다.
            colorClass = privateChatButtonColors[colorIndex]; // 계산된 인덱스를 사용하여 색상 클래스를 가져옵니다.
            assignedPrivateChatColors[groupName] = colorClass; // 이 그룹에 해당 색상 클래스를 할당하고 저장합니다.
        }
        button.classList.add(colorClass); // 버튼에 할당된 색상 클래스를 추가합니다.

        const participants = groupName.split('_').slice(1); // `groupName` (예: 'private_Alice_Bob')을 '_'로 분리하고 첫 부분을 제외하여 참가자 이름들을 가져옵니다.
        if (participants.length >= 2) { // 참가자가 두 명 이상인 경우
            const otherUser = participants[0]; // 첫 번째 참가자를 '다른 사용자'로 가정합니다 (실제 로직에 따라 변경될 수 있음).
            button.textContent = otherUser.charAt(0).toUpperCase(); // 다른 사용자의 이름 첫 글자를 대문자로 버튼 아이콘으로 설정합니다.
        } else {
            button.textContent = '🔒'; // 참가자 이름을 사용할 수 없으면 잠금 아이콘을 사용합니다.
        }
    } else {
        // 일반 채팅 버튼인 경우 기본 아이콘(💬)을 그대로 사용합니다.
    }

    button.onclick = () => { // 버튼 클릭 시 실행될 이벤트 핸들러를 정의합니다.
        toggleChat(groupName, true); // `toggleChat` 함수를 호출하여 해당 채팅 버블을 강제로 표시(확장)합니다.
    };

    buttonsContainer.prepend(button); // `buttonsContainer`의 맨 앞에 버튼을 추가합니다. 이렇게 하면 CSS의 `flex-direction: row-reverse`에 따라 버튼이 오른쪽에서 왼쪽으로 정렬됩니다.

    return button; // 생성된 버튼 요소를 반환합니다.
}

// Function to create a dynamic chat bubble
// 동적인 채팅 버블(확장된 채팅 창)을 생성하는 함수입니다.
async function createChatBubble(groupName, isPrivate = false) {
    if (chatBubbles[groupName]) { // 해당 `groupName`에 대한 채팅 버블이 이미 `chatBubbles` 객체에 존재하는 경우
        toggleChat(groupName, true); // 기존 버블의 상태를 `toggleChat` 함수를 통해 업데이트(표시)합니다.
        const usernameInputGeneral = document.getElementById('usernameInput-general'); // 일반 채팅의 사용자 이름 입력 필드를 찾습니다.
        const usernameInputCurrent = document.getElementById(`usernameInput-${groupName}`); // 현재 그룹의 사용자 이름 입력 필드를 찾습니다.
        if (usernameInputGeneral && usernameInputCurrent && !usernameInputCurrent.value) { // 일반 채팅 입력 필드에 값이 있고, 현재 그룹 입력 필드가 비어 있으면
            usernameInputCurrent.value = usernameInputGeneral.value; // 일반 채팅의 사용자 이름을 현재 그룹 입력 필드로 복사합니다.
        }
        const chatLog = document.getElementById(`chatLog-${groupName}`); // 현재 그룹의 채팅 로그 컨테이너를 찾습니다.
        if (chatLog) { // 채팅 로그가 존재하면
            chatLog.scrollTop = chatLog.scrollHeight; // 스크롤을 맨 아래로 이동하여 최신 메시지가 보이도록 합니다.
        }
        createChatToggleButton(groupName, isPrivate); // 버블이 존재해도 해당 토글 버튼이 생성/표시되도록 합니다.
        return; // 함수를 종료합니다.
    }

    const chatContainer = document.createElement('div'); // 새로운 `div` 요소를 생성하여 채팅 버블의 컨테이너로 사용합니다.
    chatContainer.classList.add('chat-bubble'); // CSS 스타일링을 위해 `chat-bubble` 클래스를 추가합니다.
    chatContainer.id = `chatBubble-${groupName}`; // 버블에 고유한 ID를 할당합니다.

    if (isPrivate) { // 개인 채팅 버블인 경우
        chatContainer.classList.add('private-chat'); // CSS 스타일링을 위해 `private-chat` 클래스를 추가합니다.
        const existingBubbles = document.querySelectorAll( // 현재 `display: flex`로 표시된(열려 있는) 모든 채팅 버블을 선택합니다.
            '.chat-bubble[style*="display: flex"]'
        );
        const offset = existingBubbles.length * 370; // 이미 열려 있는 버블의 개수에 따라 오프셋(간격)을 계산합니다. (350px는 버블 너비, 20px는 마진)
        chatContainer.style.right = `${20 + offset}px`; // `right` CSS 속성을 설정하여 개인 채팅 버블이 오른쪽에서 왼쪽으로 쌓이도록 합니다.
    } else { // 일반 채팅 버블인 경우
        chatContainer.classList.add('general-chat'); // CSS 스타일링을 위해 `general-chat` 클래스를 추가합니다.
    }

    // Generate the HTML content of the bubble with dynamic IDs
    // 동적 ID를 사용하여 채팅 버블의 내부 HTML 콘텐츠를 생성합니다.
    chatContainer.innerHTML = `
        <div class="chat-header ${isPrivate ? 'private' : 'general'}"> // 헤더 영역. 개인/일반 채팅에 따라 클래스 추가.
            <h4>${ // 헤더 제목. 개인 채팅이면 'Chat Privé (참가자)', 일반 채팅이면 'Chat Général'을 표시합니다.
                            isPrivate
                                ? `Chat Privé (${groupName.split('_').slice(1).join(' - ')})`
                                : 'Chat Général'
                        }</h4>
            <button class="close-btn" onclick="toggleChat('${groupName}')">&times;</button> // 닫기 버튼. 클릭 시 `toggleChat`을 호출하여 버블을 최소화합니다.
        </div>
        <div class="chat-body" id="chatLog-${groupName}"> // 메시지 내용이 표시될 영역.
        </div>
        <div class="chat-input"> // 사용자 이름 입력 필드 영역.
            <input type="text" id="usernameInput-${groupName}" placeholder="Votre nom">
            <input type="hidden" id="groupNameInput-${groupName}" value="${groupName}"> // 그룹 이름을 숨겨진 필드로 저장하여 메시지 전송 시 사용합니다.
        </div>
        <div class="chat-input"> // 메시지 입력 필드 및 전송 버튼 영역.
            <input type="text" id="messageInput-${groupName}" placeholder="Écris un message">
            <button onclick="sendMessage('${groupName}')">Envoyer</button> // 'Envoyer'(보내기) 버튼. 클릭 시 `sendMessage`를 호출하여 메시지를 전송합니다.
        </div>
    `;

    document.getElementById('chat-container').appendChild(chatContainer); // 새로 생성된 채팅 버블을 `index.html`의 `#chat-container` 요소에 추가합니다.
    chatBubbles[groupName] = chatContainer; // 나중에 참조할 수 있도록 `chatBubbles` 객체에 버블 요소를 저장합니다.

    // Create the toggle button for this bubble (it will be initially visible if its bubble is hidden)
    // 이 버블에 해당하는 토글 버튼을 생성합니다. (버블이 처음에 숨겨져 있으면 버튼은 표시됩니다.)
    createChatToggleButton(groupName, isPrivate);

    // Initial state: created but hidden. Will be shown via toggleChat later.
    // 초기 상태: 버블은 생성되었지만 숨겨져 있습니다. 나중에 `toggleChat` 함수를 통해 표시됩니다.
    chatContainer.style.display = 'none';

    // Copy username from general chat if available
    // 일반 채팅의 사용자 이름이 이미 입력되어 있으면 현재 그룹의 사용자 이름 입력 필드로 복사합니다.
    const usernameInputGeneral = document.getElementById('usernameInput-general');
    const usernameInputCurrent = document.getElementById(
        `usernameInput-${groupName}`
    );
    if (usernameInputGeneral && usernameInputCurrent && !usernameInputCurrent.value) {
        usernameInputCurrent.value = usernameInputGeneral.value;
    }

    // Load history and init SSE if the bubble is *initially* set to display (e.g. for general chat only)
    // Or delay this until the first time it is maximized. For now, keep it for functionality.
    // 메시지 기록을 로드하고 SSE 연결을 초기화합니다. (기능을 위해 일단 생성 시점에 호출하지만, 나중에 버블이 처음으로 확장될 때까지 지연시킬 수도 있습니다.)
    await loadMessageHistory(groupName);
    initEventSource(groupName);

    const chatLog = document.getElementById(`chatLog-${groupName}`); // 해당 그룹의 채팅 로그 요소를 가져옵니다.
    if (chatLog) { // 채팅 로그 요소가 존재하면
        chatLog.addEventListener('scroll', function () { // 스크롤 이벤트를 수신합니다.
            if (chatLog.scrollTop === 0) { // 스크롤이 맨 위로 이동한 경우 (이전 메시지 로드 시점)
                loadMessageHistory(groupName, true); // 이전 메시지 기록을 `prepend`(상단에 추가)하여 로드합니다.
            }
        });
    }
}

// Function to show/hide a chat bubble
// 채팅 버블을 표시하거나 숨기는 (확장/최소화) 함수입니다.
function toggleChat(groupName, forceDisplay = false) {
    const bubble = document.getElementById(`chatBubble-${groupName}`); // 해당 `groupName`에 대한 채팅 버블 요소를 찾습니다.
    if (!bubble) return; // 버블이 없으면 함수를 종료합니다.

    const button = document.getElementById(`chatToggleButton-${groupName}`); // 해당 `groupName`에 대한 채팅 토글 버튼을 찾습니다.

    // Logic: if forceDisplay (e.g. from button click) OR currently hidden -> show it
    // 논리: `forceDisplay`가 true이거나 (버튼 클릭 등) 현재 버블이 숨겨져 있으면 -> 표시합니다.
    if (forceDisplay || bubble.style.display === 'none' || bubble.style.display === '') {
        // Hide all other open bubbles first
        // 다른 모든 열려 있는 채팅 버블을 먼저 숨깁니다.
        hideAllChatBubbles();

        bubble.style.display = 'flex'; // 현재 버블의 `display` 속성을 'flex'로 설정하여 표시(확장)합니다.
        if (button) { // 해당 토글 버튼이 존재하면
            button.style.display = 'none'; // 해당 토글 버튼을 숨깁니다.
        }

        const chatLog = document.getElementById(`chatLog-${groupName}`); // 해당 그룹의 채팅 로그 컨테이너를 찾습니다.
        if (chatLog) { // 채팅 로그가 존재하면
            chatLog.scrollTop = chatLog.scrollHeight; // 스크롤을 맨 아래로 이동하여 최신 메시지가 보이도록 합니다.
        }
        updateChatBubblePositions(); // 개인 채팅 버블의 위치를 업데이트합니다 (겹치지 않게 정렬).
    } else { // 현재 버블이 표시되어 있는 경우 (닫기 버튼 클릭 등으로 최소화하려는 경우)
        bubble.style.display = 'none'; // 버블의 `display` 속성을 'none'으로 설정하여 숨깁니다(최소화).
        if (button) { // 해당 토글 버튼이 존재하면
            button.style.display = 'flex'; // 해당 토글 버튼을 다시 표시합니다.
        }
        updateChatBubblePositions(); // 개인 채팅 버블의 위치를 업데이트합니다.
    }
}

// Function to send a message
// 메시지를 특정 그룹으로 전송하는 비동기 함수입니다.
async function sendMessage(groupName) {
    const usernameInput = document.getElementById(`usernameInput-${groupName}`); // 사용자 이름 입력 필드를 찾습니다.
    const messageInput = document.getElementById(`messageInput-${groupName}`); // 메시지 내용 입력 필드를 찾습니다.
    const groupNameInput = document.getElementById(`groupNameInput-${groupName}`); // 숨겨진 그룹 이름 입력 필드를 찾습니다.

    const username = usernameInput.value.trim(); // 사용자 이름의 앞뒤 공백을 제거합니다.
    const content = messageInput.value.trim(); // 메시지 내용의 앞뒤 공백을 제거합니다.
    const currentGroupName = groupNameInput.value; // 현재 그룹 이름을 가져옵니다.

    if (!username || !content) { // 사용자 이름 또는 메시지 내용이 비어 있으면
        alert('Veuillez entrer votre nom et un message.'); // 경고 메시지를 사용자에게 표시합니다.
        return; // 함수를 종료합니다.
    }

    try {
        const response = await fetch('/chat/send/', { // 백엔드의 `/chat/send/` 엔드포인트에 POST 요청을 보냅니다.
            method: 'POST', // HTTP POST 메서드
            headers: { // 요청 헤더
                'Content-Type': 'application/json', // 요청 본문의 콘텐츠 유형이 JSON임을 나타냅니다.
                'X-CSRFToken': getCookie('csrftoken'), // CSRF(Cross-Site Request Forgery) 보호를 위한 CSRF 토큰을 헤더에 포함합니다.
            },
            body: JSON.stringify({ // 요청 본문을 JSON 문자열로 변환하여 포함합니다.
                username: username, // 사용자 이름
                content: content, // 메시지 내용
                group_name: currentGroupName, // 현재 그룹 이름
            }),
        });

        const data = await response.json(); // 응답을 JSON 형식으로 파싱합니다.
        if (response.ok) { // HTTP 응답 상태 코드가 2xx(성공)인 경우
            if (data.status === 'success') { // 백엔드 응답의 `status` 필드가 'success'인 경우
                messageInput.value = ''; // 메시지 입력 필드를 비웁니다.
            } else { // 백엔드 응답의 `status`가 'success'가 아닌 경우
                console.error("Erreur serveur lors de l'envoi:", data.message); // 서버 오류 메시지를 콘솔에 기록합니다.
                alert("Erreur lors de l'envoi du message: " + data.message); // 사용자에게 경고 메시지를 표시합니다.
            }
        } else { // HTTP 응답 상태 코드가 2xx가 아닌 경우 (예: 4xx, 5xx)
            console.error( // HTTP 오류 메시지를 콘솔에 기록합니다.
                "Erreur HTTP lors de l'envoi:",
                response.status, // HTTP 상태 코드
                data.message || response.statusText // 백엔드 메시지 또는 기본 상태 텍스트
            );
            alert('Erreur HTTP: ' + (data.message || response.statusText)); // 사용자에게 경고 메시지를 표시합니다.
        }
    } catch (error) { // 네트워크 오류 (예: 서버 연결 실패) 또는 JSON 파싱 오류가 발생한 경우
        console.error('Erreur réseau ou JSON:', error); // 오류 메시지를 콘솔에 기록합니다.
        alert('Impossible de se connecter au serveur pour envoyer le message.'); // 사용자에게 경고 메시지를 표시합니다.
    }
}

// Function to initialize EventSource (SSE) for a group
// 특정 채팅 그룹에 대한 EventSource(Server-Sent Events) 연결을 초기화하는 함수입니다.
function initEventSource(groupName) {
    if ( // EventSource가 이미 존재하고 연결이 열려 있는 경우
        eventSources[groupName] &&
        eventSources[groupName].readyState === EventSource.OPEN
    ) {
        return; // 다시 초기화하지 않고 함수를 종료합니다.
    }

    const chatLog = document.getElementById(`chatLog-${groupName}`); // 해당 그룹의 채팅 로그 컨테이너를 찾습니다.
    if (!chatLog) { // 채팅 로그 컨테이너가 없으면
        console.error(`chatLog-${groupName} introuvable pour initEventSource.`); // 오류를 콘솔에 기록하고
        return; // 함수를 종료합니다.
    }

    const source = new EventSource(`/chat/stream/${groupName}/`); // 백엔드의 `/chat/stream/` 엔드포인트에 새 EventSource 연결을 설정합니다. 이를 통해 서버에서 발생하는 이벤트를 실시간으로 수신할 수 있습니다.
    eventSources[groupName] = source; // 생성된 EventSource 객체를 `eventSources` 객체에 저장하여 관리합니다.

    source.onmessage = function (e) { // 서버로부터 메시지(이벤트)를 수신할 때마다 호출되는 이벤트 핸들러입니다.
        try {
            const messageData = JSON.parse(e.data); // 수신된 이벤트 데이터(`e.data`)를 JSON 문자열로 파싱하여 메시지 객체로 변환합니다.
            const msgElement = createMessageElement(messageData, groupName); // 메시지 데이터를 사용하여 HTML 메시지 요소를 생성합니다.
            chatLog.appendChild(msgElement); // 생성된 메시지 요소를 채팅 로그에 추가합니다.
            chatLog.scrollTop = chatLog.scrollHeight; // 스크롤을 맨 아래로 이동하여 최신 메시지가 항상 보이도록 합니다.
            // addNotificationDot(groupName); // NEW: (미래 기능) 채팅 버블이 현재 표시되지 않는 경우 알림 점을 추가하는 주석 처리된 기능입니다.
        } catch (error) { // JSON 파싱 또는 메시지 처리 중 오류가 발생한 경우
            console.error( // 오류 메시지와 원본 데이터를 콘솔에 기록합니다.
                'Erreur de parsing JSON ou de traitement du message SSE:',
                error,
                e.data
            );
        }
    };

    source.onerror = function (err) { // EventSource 연결 중 오류가 발생했을 때 호출되는 이벤트 핸들러입니다.
        console.error('EventSource failed:', err); // 오류 메시지를 콘솔에 기록합니다.
        // Gérer les erreurs de connexion SSE (reconnexion, affichage message utilisateur, etc.)
        // SSE 연결 오류를 처리하는 로직(예: 일정 시간 후 재연결 시도, 사용자에게 오류 메시지 표시)을 여기에 구현할 수 있습니다.
    };
}

// Function to get CSRF token
// 쿠키에서 특정 이름의 값을 가져오는 함수입니다. CSRF 토큰을 가져오는 데 주로 사용됩니다.
function getCookie(name) {
    let cookieValue = null; // 쿠키 값을 저장할 변수를 초기화합니다.
    if (document.cookie && document.cookie !== '') { // `document.cookie`가 존재하고 비어있지 않은 경우에만 실행합니다.
        const cookies = document.cookie.split(';'); // 모든 쿠키를 세미콜론(;)으로 분리하여 배열로 만듭니다.
        for (let i = 0; i < cookies.length; i++) { // 각 쿠키를 순회합니다.
            const cookie = cookies[i].trim(); // 쿠키 문자열의 앞뒤 공백을 제거합니다.
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === name + '=') { // 현재 쿠키가 찾고 있는 이름으로 시작하는지 확인합니다 (예: 'csrftoken=').
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1)); // 쿠키 이름 부분 다음의 값을 디코딩하여 가져옵니다.
                break; // 쿠키를 찾았으므로 루프를 종료합니다.
            }
        }
    }
    return cookieValue; // 찾은 쿠키 값을 반환하거나, 찾지 못했으면 `null`을 반환합니다.
}

// Function to request creation/retrieval of a private group
// 대상 사용자 이름과 ID를 받아 개인 채팅 그룹을 생성하거나 기존 그룹을 가져오도록 백엔드에 요청하는 비동기 함수입니다.
async function promptPrivateChat(targetUsername, targetUserId) {
    const currentUsernameInput = // 현재 로그인한 사용자 이름을 가져올 입력 필드를 찾습니다.
        document.getElementById('usernameInput-general') || // 먼저 일반 채팅의 사용자 이름 입력 필드를 시도합니다.
        document.querySelector('.chat-bubble input[id^="usernameInput-"]'); // 없으면 현재 열려 있는 다른 채팅 버블의 사용자 이름 입력 필드를 찾습니다.
    if (!currentUsernameInput || !currentUsernameInput.value) { // 현재 사용자 이름 입력 필드가 없거나 값이 비어 있으면
        alert( // 경고 메시지를 표시합니다.
            "Veuillez d'abord entrer votre nom d'utilisateur dans le chat général."
        );
        return; // 함수를 종료합니다.
    }
    const currentUsername = currentUsernameInput.value.trim(); // 현재 사용자 이름의 앞뒤 공백을 제거합니다.

    if (currentUsername === targetUsername) { // 현재 사용자가 자기 자신과 개인 채팅을 시작하려고 하면
        alert('Vous ne pouvez pas démarrer un chat privé avec vous-même.'); // 경고 메시지를 표시합니다.
        return; // 함수를 종료합니다.
    }

    if (confirm(`Voulez-vous démarrer un chat privé avec ${targetUsername}?`)) { // 사용자에게 `targetUsername`과의 개인 채팅 시작을 확인할지 묻는 대화 상자를 표시합니다.
        try {
            const response = await fetch('/chat/group/create/private', { // 백엔드의 개인 그룹 생성/가져오기 API에 POST 요청을 보냅니다.
                method: 'POST', // HTTP POST 메서드
                headers: { // 요청 헤더
                    'Content-Type': 'application/x-www-form-urlencoded', // 요청 본문의 콘텐츠 유형이 URL 인코딩된 폼 데이터임을 나타냅니다.
                    'X-CSRFToken': getCookie('csrftoken'), // CSRF 토큰을 포함합니다.
                },
                body: new URLSearchParams({ // 요청 본문을 URL 인코딩된 폼 데이터 형식으로 생성합니다.
                    current_username: currentUsername, // 현재 사용자 이름
                    target_username: targetUsername, // 대상 사용자 이름
                    // target_user_id: targetUserId // 백엔드에서 사용자 ID를 사용하는 경우 이 줄의 주석을 해제합니다.
                }).toString(),
            });

            const data = await response.json(); // 응답을 JSON 형식으로 파싱합니다.
            if (response.ok) { // HTTP 응답 상태 코드가 2xx(성공)인 경우
                if (data.status === 'success' && data.group_name) { // 백엔드 응답이 성공적이고 `group_name`을 포함하는 경우
                    createChatBubble(data.group_name, true); // 반환된 `group_name`을 사용하여 개인 채팅 버블을 생성하고 표시합니다.
                } else { // 백엔드 응답이 성공적이지 않거나 `group_name`이 없는 경우
                    console.error( // 오류 메시지를 콘솔에 기록합니다.
                        'Erreur serveur lors de la création du groupe privé:',
                        data.message
                    );
                    alert('Erreur lors de la création du groupe privé: ' + data.message); // 사용자에게 경고 메시지를 표시합니다.
                }
            } else { // HTTP 응답 상태 코드가 2xx가 아닌 경우
                console.error( // HTTP 오류 메시지를 콘솔에 기록합니다.
                    'Erreur HTTP lors de la création du groupe privé:',
                    response.status,
                    data.error || response.statusText
                );
                alert('Erreur HTTP: ' + (data.error || response.statusText)); // 사용자에게 경고 메시지를 표시합니다.
            }
        } catch (error) { // 네트워크 오류가 발생한 경우
            console.error( // 네트워크 오류 메시지를 콘솔에 기록합니다.
                'Erreur réseau lors de la création du groupe privé:',
                error
            );
            alert( // 사용자에게 경고 메시지를 표시합니다.
                'Impossible de se connecter au serveur pour créer le groupe privé.'
            );
        }
    }
}

// Function to update the position of private chat bubbles
// 개인 채팅 버블의 위치를 업데이트하는 함수입니다. 여러 개인 채팅 버블이 열려 있을 때 겹치지 않고 오른쪽에서 왼쪽으로 정렬되도록 합니다.
function updateChatBubblePositions() {
    const activeBubbles = document.querySelectorAll( // 현재 `display: flex`로 표시된(열려 있는) 모든 채팅 버블을 선택합니다.
        '.chat-bubble[style*="display: flex"]'
    );
    let currentOffset = 0; // 초기 오프셋을 0으로 설정합니다.
    activeBubbles.forEach((bubble) => { // 각 활성 버블에 대해
        if (bubble.classList.contains('private-chat')) { // 현재 버블이 개인 채팅 버블인 경우에만 위치를 조정합니다.
            bubble.style.right = `${20 + currentOffset}px`; // 버블의 `right` CSS 속성을 설정합니다. (기본 20px 마진 + 현재까지의 오프셋)
            currentOffset += bubble.offsetWidth + 20; // 다음 버블을 위해 현재 버블의 너비와 20px의 추가 간격(gap)을 더하여 오프셋을 업데이트합니다.
        }
    });
}

// This function should be called ONLY when the user logs in.
// 이 함수는 사용자가 로그인했을 때만 호출되어야 합니다. 채팅 기능을 초기화하고 기본 상태를 설정합니다.
export function chatController() {
    // Ensure the main chat container exists
    // 주요 채팅 컨테이너(`#chat-container`)가 존재하는지 확인합니다.
    let chatContainerDiv = document.getElementById('chat-container'); // `#chat-container` 요소를 찾습니다.
    if (!chatContainerDiv) { // 요소가 없으면
        // If not found, create it (e.g., if index.html doesn't define it explicitly)
        // 찾을 수 없으면 (예: `index.html`에 명시적으로 정의되지 않은 경우) 새로 생성합니다.
        chatContainerDiv = document.createElement('div'); // 새 `div` 요소를 생성합니다.
        chatContainerDiv.id = 'chat-container'; // ID를 'chat-container'로 설정합니다.
        document.body.appendChild(chatContainerDiv); // `body` 또는 특정 래퍼 요소에 추가합니다.
    }

    // Ensure the chat buttons container exists
    // 채팅 버튼 컨테이너(`#chatButtonsContainer`)가 존재하는지 확인합니다.
    let chatButtonsContainer = document.getElementById('chatButtonsContainer'); // `#chatButtonsContainer` 요소를 찾습니다.
    if (!chatButtonsContainer) { // 요소가 없으면
        chatButtonsContainer = document.createElement('div'); // 새 `div` 요소를 생성합니다.
        chatButtonsContainer.id = 'chatButtonsContainer'; // ID를 'chatButtonsContainer'로 설정합니다.
        chatContainerDiv.appendChild(chatButtonsContainer); // `chatContainerDiv` 내부에 추가합니다.
    }

    // Create the general chat bubble. It will be created hidden by default now.
    // 일반 채팅 버블을 생성합니다. 이제 기본적으로 숨겨진 상태로 생성됩니다.
    createChatBubble('general', false);

    // Initially hide all bubbles and show only the general chat button
    // 초기에는 모든 채팅 버블을 숨기고 일반 채팅 버튼만 표시합니다.
    hideAllChatBubbles(); // 이전 세션이나 새로고침으로 인해 생성되었을 수 있는 모든 버블을 숨깁니다.

    // Make sure the general chat button is visible initially
    // 일반 채팅 토글 버튼이 초기에는 확실히 보이도록 합니다.
    const generalChatButton = document.getElementById('chatToggleButton-general'); // 일반 채팅 토글 버튼을 찾습니다.
    if (generalChatButton) { // 버튼이 존재하면
        generalChatButton.style.display = 'flex'; // `display` 속성을 'flex'로 설정하여 최소화된 진입점(버튼)으로 표시합니다.
    } else { // 버튼을 찾을 수 없으면
        console.error("General chat toggle button not found after creation."); // 오류 메시지를 콘솔에 기록합니다.
    }

    // Optional: Set a default username for the logged-in user
    // This should ideally be set based on actual user data after login
    // (선택 사항) 로그인한 사용자의 기본 사용자 이름을 설정합니다. 실제로는 로그인 후 사용자 데이터에 기반하여 설정되어야 합니다.
    const usernameInputGeneral = document.getElementById('usernameInput-general'); // 일반 채팅의 사용자 이름 입력 필드를 찾습니다.
    if (usernameInputGeneral) { // 입력 필드가 존재하면
        usernameInputGeneral.value = "UserLoggedIn"; // 예시 사용자 이름을 설정합니다. (실제 사용자 이름으로 대체해야 함)
    }
}

// DOMContentLoaded listener for initial setup (runs once DOM is ready)
// DOMContentLoaded 이벤트 리스너: DOM(문서 객체 모델)이 완전히 로드되고 파싱된 후 코드를 실행합니다.
document.addEventListener('DOMContentLoaded', () => {
    // Attach event listener for 'Enter' key globally
    // 전역적으로 'Enter' 키 이벤트를 위한 이벤트 리스너를 추가합니다.
    document.addEventListener('keydown', function (event) { // 키보드 눌림 이벤트를 수신합니다.
        if (event.key === 'Enter') { // 눌린 키가 'Enter' 키인 경우
            const activeElement = document.activeElement; // 현재 웹페이지에서 포커스된(활성화된) 요소를 가져옵니다.
            if (activeElement && activeElement.id.startsWith('messageInput-')) { // 활성화된 요소가 메시지 입력 필드인 경우 (ID가 'messageInput-'으로 시작)
                const groupName = activeElement.id.split('-')[1]; // 메시지 입력 필드의 ID에서 그룹 이름 부분을 추출합니다 (예: 'messageInput-general'에서 'general').
                sendMessage(groupName); // 해당 그룹 이름으로 `sendMessage` 함수를 호출하여 메시지를 전송합니다.
                event.preventDefault(); // 'Enter' 키의 기본 동작(예: 폼 제출 또는 새 줄 추가)을 방지합니다.
            }
        }
    });

    // === DEMONSTRATION ONLY ===
    // This part is for demonstration purposes only.
    // In a real application, chatController() would be called ONLY after a successful user login.
    // For demonstration, we simulate a login by calling it on DOMContentLoaded.
    // Replace this with your actual login success callback.
    // === 데모 전용 ===
    // 이 부분은 데모를 위한 것입니다. 실제 애플리케이션에서는 `chatController()` 함수가 사용자의 성공적인 로그인 이후에만 호출되어야 합니다.
    // 데모를 위해 DOM이 로드된 즉시 이 함수를 호출하여 로그인을 시뮬레이션합니다.
    // 실제 로그인 성공 콜백으로 이 부분을 교체해야 합니다.
    chatController(); // `chatController` 함수를 호출하여 채팅 기능을 초기화합니다.
});

import { routes } from '../routes.js';
import {
	actualizeIndexPage,
	getCookie,
	loadTemplate,
	closeModal,
} from '../utils.js';

const chatBubbles = {}; // Stores references to chat bubble elements by groupName
const eventSources = {}; // Stores EventSource objects by groupName
const messageOffsets = {}; // Stores the offset for message history for each group

// Helper to create an HTML message element
function createMessageElement(messageData, groupName) {
	const msg = document.createElement('div');
	msg.classList.add('chat-message');

	const usernameInput = document.getElementById(`usernameInput-${groupName}`);
	const currentUsername = usernameInput ? usernameInput.value : '';

	// Determines if it's their own message
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

// Load message history
async function loadMessageHistory(groupName, prepend = false) {
	const chatLog = document.getElementById(`chatLog-${groupName}`);
	if (!chatLog) {
		console.error(
			`chatLog-${groupName} introuvable pour charger l'historique.`
		);
		return;
	}

	const offset = messageOffsets[groupName] || 0;
	const limit = 20; // Number of messages to load each time

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

// Variable for private chat button colors
const privateChatButtonColors = [
	'color1',
	'color2',
	'color3',
	'color4',
	'color5',
];
const assignedPrivateChatColors = {}; // To track assigned colors

// Function to hide all chat bubbles and show their respective toggle buttons
function hideAllChatBubbles() {
	for (const groupName in chatBubbles) {
		const bubble = chatBubbles[groupName];
		bubble.style.display = 'none'; // Hide the bubble
		const button = document.getElementById(`chatToggleButton-${groupName}`);
		if (button) {
			button.style.display = 'flex'; // Show the toggle button
		}
	}
}

// Function to create and manage chat toggle buttons
function createChatToggleButton(groupName, isPrivate = false) {
	const buttonsContainer = document.getElementById('chatButtonsContainer');
	let button = document.getElementById(`chatToggleButton-${groupName}`);

	if (button) {
		return button;
	}

	button = document.createElement('button');
	button.classList.add('chat-toggle-button');
	button.id = `chatToggleButton-${groupName}`;
	button.textContent = '💬'; // Default icon

	if (isPrivate) {
		button.classList.add('private');
		let colorClass = assignedPrivateChatColors[groupName];
		if (!colorClass) {
			const colorIndex =
				Object.keys(assignedPrivateChatColors).length %
				privateChatButtonColors.length;
			colorClass = privateChatButtonColors[colorIndex];
			assignedPrivateChatColors[groupName] = colorClass;
		}
		button.classList.add(colorClass);

		const participants = groupName.split('_').slice(1);
		if (participants.length >= 2) {
			const otherUser = participants[0];
			button.textContent = otherUser.charAt(0).toUpperCase();
		} else {
			button.textContent = '🔒';
		}
	} else {
		// General chat, no change to default icon
	}

	button.onclick = () => {
		toggleChat(groupName, true); // Force display when button is clicked (from minimized state)
	};

	buttonsContainer.prepend(button);

	return button;
}

// Function to create a dynamic chat bubble
async function createChatBubble(groupName, isPrivate = false) {
	if (chatBubbles[groupName]) {
		// If bubble already exists, update its state via toggleChat
		toggleChat(groupName, true);
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
			chatLog.scrollTop = chatLog.scrollHeight;
		}
		createChatToggleButton(groupName, isPrivate); // Ensure button is visible
		return;
	}

	const chatContainer = document.createElement('div');
	chatContainer.classList.add('chat-bubble');
	chatContainer.id = `chatBubble-${groupName}`;

	if (isPrivate) {
		chatContainer.classList.add('private-chat');
		const existingBubbles = document.querySelectorAll(
			'.chat-bubble[style*="display: flex"]'
		);
		const offset = existingBubbles.length * 370;
		chatContainer.style.right = `${20 + offset}px`;
	} else {
		chatContainer.classList.add('general-chat'); // Add class for general chat styling
	}

	// Generate the HTML content of the bubble with dynamic IDs
	chatContainer.innerHTML = `
        <div class="chat-header ${isPrivate ? 'private' : 'general'}">
            <h4>${
							isPrivate
								? `Chat Privé (${groupName.split('_').slice(1).join(' - ')})`
								: 'Chat Général'
						}</h4>
            <button class="close-btn" onclick="toggleChat('${groupName}')">&times;</button>
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

	document.getElementById('chat-container').appendChild(chatContainer); // Append to #chat-container
	chatBubbles[groupName] = chatContainer;

	// Create the toggle button for this bubble (it will be initially visible if its bubble is hidden)
	createChatToggleButton(groupName, isPrivate);

	// Initial state: created but hidden. Will be shown via toggleChat later.
	chatContainer.style.display = 'none';

	// Copy username from general chat if available
	const usernameInputGeneral = document.getElementById('usernameInput-general');
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

	// Load history and init SSE if the bubble is *initially* set to display (e.g. for general chat only)
	// Or delay this until the first time it is maximized. For now, keep it for functionality.
	await loadMessageHistory(groupName);
	initEventSource(groupName);

	const chatLog = document.getElementById(`chatLog-${groupName}`);
	if (chatLog) {
		chatLog.addEventListener('scroll', function () {
			if (chatLog.scrollTop === 0) {
				loadMessageHistory(groupName, true);
			}
		});
	}
}

// Function to show/hide a chat bubble
function toggleChat(groupName, forceDisplay = false) {
	const bubble = document.getElementById(`chatBubble-${groupName}`);
	if (!bubble) return;

	const button = document.getElementById(`chatToggleButton-${groupName}`);

	// Logic: if forceDisplay (e.g. from button click) OR currently hidden -> show it
	if (
		forceDisplay ||
		bubble.style.display === 'none' ||
		bubble.style.display === ''
	) {
		// Hide all other open bubbles first
		hideAllChatBubbles();

		bubble.style.display = 'flex'; // Show the current bubble
		if (button) {
			button.style.display = 'none'; // Hide its corresponding toggle button
		}

		const chatLog = document.getElementById(`chatLog-${groupName}`);
		if (chatLog) {
			chatLog.scrollTop = chatLog.scrollHeight; // Scroll to bottom
		}
		updateChatBubblePositions();
	} else {
		// Currently displayed, so minimize/hide it
		bubble.style.display = 'none'; // Hide the bubble
		if (button) {
			button.style.display = 'flex'; // Show its toggle button again
		}
		updateChatBubblePositions();
	}
}

// Function to send a message
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

// Function to initialize EventSource (SSE) for a group
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
			const messageData = JSON.parse(e.data);
			const msgElement = createMessageElement(messageData, groupName);
			chatLog.appendChild(msgElement);
			chatLog.scrollTop = chatLog.scrollHeight;
			// addNotificationDot(groupName); // NEW: (future feature) Add red dot if bubble not visible
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
	};
}

// Function to get CSRF token
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

// Function to request creation/retrieval of a private group
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
					// target_user_id: targetUserId // If you have the ID and backend uses it
				}).toString(),
			});

			const data = await response.json();
			if (response.ok) {
				if (data.status === 'success' && data.group_name) {
					createChatBubble(data.group_name, true); // Create private chat bubble
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

// Function to update the position of private chat bubbles
function updateChatBubblePositions() {
	const activeBubbles = document.querySelectorAll(
		'.chat-bubble[style*="display: flex"]'
	);
	let currentOffset = 0;
	activeBubbles.forEach((bubble) => {
		if (bubble.classList.contains('private-chat')) {
			bubble.style.right = `${20 + currentOffset}px`;
			currentOffset += bubble.offsetWidth + 20; // Bubble width + gap
		}
	});
}

// This function should be called ONLY when the user logs in.
export function chatController() {
	// Ensure the main chat container exists
	let chatContainerDiv = document.getElementById('chat-container');
	if (!chatContainerDiv) {
		// If not found, create it (e.g., if index.html doesn't define it explicitly)
		chatContainerDiv = document.createElement('div');
		chatContainerDiv.id = 'chat-container';
		document.body.appendChild(chatContainerDiv); // Append to body or a specific wrapper
	}

	// Ensure the chat buttons container exists
	let chatButtonsContainer = document.getElementById('chatButtonsContainer');
	if (!chatButtonsContainer) {
		chatButtonsContainer = document.createElement('div');
		chatButtonsContainer.id = 'chatButtonsContainer';
		chatContainerDiv.appendChild(chatButtonsContainer);
	}

	// Create the general chat bubble. It will be created hidden by default now.
	createChatBubble('general', false);

	// Initially hide all bubbles and show only the general chat button
	hideAllChatBubbles(); // Hide any bubbles that might have been created from previous sessions/reloads

	// Make sure the general chat button is visible initially
	const generalChatButton = document.getElementById('chatToggleButton-general');
	if (generalChatButton) {
		generalChatButton.style.display = 'flex'; // Show the general button as the minimized entry point
	} else {
		console.error('General chat toggle button not found after creation.');
	}

	// Optional: Set a default username for the logged-in user
	// This should ideally be set based on actual user data after login
	const usernameInputGeneral = document.getElementById('usernameInput-general');
	if (usernameInputGeneral) {
		usernameInputGeneral.value = 'UserLoggedIn'; // Example username
	}
}

// DOMContentLoaded listener for initial setup (runs once DOM is ready)
document.addEventListener('DOMContentLoaded', () => {
	// Attach event listener for 'Enter' key globally
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

	// === DEMONSTRATION ONLY ===
	// In a real application, chatController() would be called ONLY after a successful user login.
	// For demonstration, we simulate a login by calling it on DOMContentLoaded.
	// Replace this with your actual login success callback.
	chatController();
});
