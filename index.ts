import * as fs from 'fs';

import { startServer } from './src/server';


const server = startServer();

globalThis.server = server

