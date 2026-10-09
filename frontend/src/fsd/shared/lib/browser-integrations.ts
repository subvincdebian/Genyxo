import { io as connectSocket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { Chart } from 'chart.js/auto';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
export { confetti, Chart, marked, DOMPurify };
export const io = connectSocket;
