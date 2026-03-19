import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import app from './app';
import { logger } from '../lib/logger';
import { getProducer } from '../lib/kafka';

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    const producer = await getProducer();
    app.set('kafkaProducer', producer);
    logger.info('Kafka Producer initialized and stored in app context');

    app.listen(PORT, () => {
      logger.info(`Lead Service listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Lead Service', { error });
    process.exit(1);
  }
}

start();
