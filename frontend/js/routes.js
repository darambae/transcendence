import { homeController } from './views/home.js';
import { singlePlayController } from './views/singlePlay.js';
import { multiplayerController } from './views/multiplayer.js';
import { loginController } from './views/login.js';
import { signupController } from './views/signup.js';
import { chatController } from './views/chat.js';
import { userController } from './views/user.js';
import { settingsProfileController } from './views/settings_profile.js';
import { tournamentController } from './views/tournament.js';
import { card_profileController } from './views/card_profile.js';
import { invitsController } from './views/tournament.js';

import { dashboardsController } from './views/dashboards.js';
import { forgotPasswordController } from './views/forgotPassword.js';

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
	tournament: {
		template: 'tournament',
		controller: tournamentController,
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
		controller: userController,
	},
	card_profile: (username) => ({
		template: 'card_profile',
		controller: () => card_profileController(username),
		isModal: true,
		username: username
	}),
	settings_profile: {
		template: 'settings_profile',
		controller: settingsProfileController,
	},
	guest: {
		template: 'invits',
		controller: invitsController,
	},
	chat: (userId ,username) => ({
		template: 'chat',
		controller: () => chatController(userId, username),
		username: username	
	}),
	dashboards: {
		template: 'dashboards',
		controller: dashboardsController,
	},
	forgotPassword: {
		template: 'forgotPassword',
		controller: forgotPasswordController
	}
};
		