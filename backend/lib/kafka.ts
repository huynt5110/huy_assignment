import { Kafka, Producer, Consumer, KafkaConfig, Partitioners } from 'kafkajs';
import { logger } from './logger';

const kafkaConfig: KafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID || 'sales-lead-management',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
};

const kafka = new Kafka(kafkaConfig);

let producer: Producer | null = null;

export const getProducer = async (): Promise<Producer> => {
  if (!producer) {
    producer = kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    });
    await producer.connect();
    logger.info('Kafka Producer connected');
  }
  return producer;
};

export const createConsumer = async (groupId: string): Promise<Consumer> => {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  logger.info(`Kafka Consumer connected to group: ${groupId}`);
  return consumer;
};

export const disconnectKafka = async () => {
  if (producer) {
    await producer.disconnect();
    logger.info('Kafka Producer disconnected');
  }
};
