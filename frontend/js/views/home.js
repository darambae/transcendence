import { getCookie } from '../utils.js';
import { chatController } from './chat.js';

export async function homeController() {
	// if user is authenticated, render chat button with username
	const token = sessionStorage.getItem('accessToken');
	if (!token) return;
	if (window.LoggedInUser) {
		loadChatUI(chatController(window.LoggedInUser));
	}
	try {
		const response = await fetch('/user-service/infoUser/', {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});
		if (response.ok) {
			const data = await response.json();
			const username = data.user_name;
			console.log('Username:', username);
			chatController(username);
		}
	} catch (error) {
		console.error('Failed to fetch user info:', error);
	}
}
