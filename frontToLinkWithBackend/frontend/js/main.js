// static/js/main.js
import { navigate } from './router.js';

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', navigate);