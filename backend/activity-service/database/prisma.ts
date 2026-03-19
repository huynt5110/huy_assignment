import { PrismaClient } from '@prisma/client/activity';
import { logger } from '../../lib/logger';

export const prisma = new PrismaClient();

export const testDbConnection = async () => {
    try {
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
        logger.info('Lead Database connection verified');
    } catch (error) {
        logger.error('Lead Database connection failed', { error });
        process.exit(1);
    }
};
