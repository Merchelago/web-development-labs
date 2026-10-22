import dotenv from 'dotenv';

// Параметры подключения читаются только из переменных окружения (файл .env не попадает в репозиторий)
dotenv.config({ quiet: true });

const isTest = process.env.NODE_ENV === 'test';

export const config = {
    port: Number(process.env.PORT) || 3011,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5311',
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        database: isTest ? process.env.DB_NAME_TEST : process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    },
};
