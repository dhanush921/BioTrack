import serverless from 'serverless-http';
import appModule from '../../backend/server.js';

const app = appModule.default || appModule;

export const handler = serverless(app);
