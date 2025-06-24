import { getCookie } from '../utils.js';

export async function homeController() {
	// const token = sessionStorage.getItem('accessToken');

	// if (!token) return;
	// try {
	// 	const response = await fetch('/user-service/infoUser/', {
	// 		method: 'GET',
	// 		headers: {
	// 			Authorization: `Bearer ${token}`,
	// 			'Content-Type': 'application/json',
	// 		},
	// 	});
	// 	if (response.ok) {
	// 		const data = await response.json();
	// 		console.log('Username:', data.user_name);
	// 		return data.user_name;
	// 	}
	// } catch (error) {
	// 	console.error('Failed to fetch user info:', error);
	// }
}
