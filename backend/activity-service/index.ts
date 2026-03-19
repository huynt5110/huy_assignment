import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import app from './app';
import { logger } from '../lib/logger';

const PORT = process.env.ACTIVITY_PORT || 3002;

app.listen(PORT, () => {
  logger.info(`Activity Service listening on port ${PORT}`);
});
