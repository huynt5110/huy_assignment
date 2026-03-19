import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import app from './app';
import { logger } from '../lib/logger';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`Lead Service listening on port ${PORT}`);
});
