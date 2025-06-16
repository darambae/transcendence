import { homeController } from './views/home.js';
import { singlePlayController } from './views/singlePlay.js';
import { multiplayerController } from './views/multiplayer.js';
import { duelController } from './views/duel.js';
import { loginController } from './views/login.js';
import { signupController } from './views/signup.js';
import { chatController } from './views/chat.js';

export const routes = {

	home: {
		template: 'home',
		controller: homeController,
	},
	singlePlay: {
		template: 'singlePlay',
		controller: singlePlayController,
	},
	multiplayer: {
		template: 'multiplayer',
		controller: multiplayerController,
	},
	duel: {
		template: 'duel',
		controller: duelController,
	},
	login: {
		template: 'login',
		controller: loginController,
		isModal: true,
	},
	signup: {
		template: 'signup',
		controller: signupController,
	},
	signupSuccess: {
		template: 'signupSuccess',
	},
	user: {
		template: 'user',
	},
	settings_profile: {
		template: 'settings_profile',
	},
	chat: {
		template: 'chat',
		controller: chatController,
		isModal: true,
	},
};