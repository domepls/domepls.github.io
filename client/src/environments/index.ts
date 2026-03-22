import { environment as local } from './environment.local';
import { environment as prod } from './environment.prod';

const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';

export const environment = isProduction ? prod : local;
