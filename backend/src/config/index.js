require('dotenv').config();

module.exports = {
  app: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
    name: 'CarthaPos API'
  },
  
  database: {
    url: process.env.DATABASE_URL
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },
  
  pos: {
    generatedPath: process.env.GENERATED_POS_PATH || './generated-pos',
    templatePath: process.env.POS_TEMPLATE_PATH || './pos-template'
  },
  
  uploads: {
    maxSize: process.env.MAX_UPLOAD_SIZE || 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif']
  },
  
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100 // max requests per window
  }
};
