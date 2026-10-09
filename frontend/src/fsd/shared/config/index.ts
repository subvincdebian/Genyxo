export const API_BASE_URL = '/api';
const configuredSocket = process.env.NEXT_PUBLIC_SOCKET_URL;
// Socket.IO accepts an empty origin as same-origin; '/' must never become '//notifications'.
export const SOCKET_URL = configuredSocket && configuredSocket !== '/' ? configuredSocket.replace(/\/$/, '') : '';
