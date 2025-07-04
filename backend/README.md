# Dewordle Backend API

A NestJS backend application connected to Neon PostgreSQL database for the Dewordle game.

## 🚀 Live API

The API is deployed at: **https://dewordle.onrender.com/api/v1/**

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Neon PostgreSQL database account

## 🛠️ Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd dewordle-backend
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env
\`\`\`

4. Configure your \`.env\` file with your Neon database credentials:
\`\`\`env
DB_HOST=your_neon_db_host
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_SSL=true
SSL_MODE=require

PORT=3000
NODE_ENV=development
\`\`\`

## 🗄️ Database Configuration

### Neon PostgreSQL Setup

This application uses Neon PostgreSQL as the database provider with the following configuration:

- **SSL Connection**: Enabled with \`rejectUnauthorized: false\`
- **Connection Pooling**: Supported via Neon's pooler
- **TypeORM Integration**: Configured for automatic entity synchronization in development

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| \`DB_HOST\` | Neon database host | \`ep-calm-firefly-a8tp5yax-pooler.eastus2.azure.neon.tech\` |
| \`DB_PORT\` | Database port | \`5432\` |
| \`DB_USERNAME\` | Database username | \`dewordledb_owner\` |
| \`DB_PASSWORD\` | Database password | \`your_password\` |
| \`DB_NAME\` | Database name | \`dewordledb\` |
| \`DB_SSL\` | Enable SSL connection | \`true\` |
| \`SSL_MODE\` | SSL mode | \`require\` |

## 🏃‍♂️ Running the Application

### Development Mode
\`\`\`bash
npm run start:dev
\`\`\`

### Production Mode
\`\`\`bash
npm run build
npm run start:prod
\`\`\`

## 📊 Database Migrations

### Generate Migration
\`\`\`bash
npm run migration:generate -- src/migrations/YourMigrationName
\`\`\`

### Run Migrations
\`\`\`bash
npm run migration:run
\`\`\`

### Revert Migration
\`\`\`bash
npm run migration:revert
\`\`\`

## 🧪 Testing Database Connection

Once the application is running, you can test the database connection using these endpoints:

- **Health Check**: \`GET /api/v1/health\`
- **Database Test**: \`GET /api/v1/test-db\`
- **Test Entities**: \`GET /api/v1/test-entities\`

### Example Response for Database Test:
\`\`\`json
{
  "success": true,
  "message": "Database connection successful",
  "testEntity": {
    "id": 1,
    "name": "Database Connection Test",
    "description": "This entity confirms successful database connection",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

## 📁 Project Structure

\`\`\`
src/
├── entities/          # TypeORM entities
│   └── test.entity.ts
├── migrations/        # Database migrations
├── app.controller.ts  # Main controller
├── app.service.ts     # Main service
├── app.module.ts      # Root module
├── main.ts           # Application entry point
└── data-source.ts    # TypeORM data source configuration
\`\`\`

## 🔧 Available Scripts

- \`npm run start\` - Start the application
- \`npm run start:dev\` - Start in development mode with hot reload
- \`npm run start:prod\` - Start in production mode
- \`npm run build\` - Build the application
- \`npm run test\` - Run unit tests
- \`npm run test:e2e\` - Run end-to-end tests
- \`npm run lint\` - Run ESLint
- \`npm run format\` - Format code with Prettier

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/v1/\` | Welcome message |
| GET | \`/api/v1/health\` | Health check |
| GET | \`/api/v1/test-db\` | Test database connection |
| GET | \`/api/v1/test-entities\` | Get all test entities |

## 🔒 Security Notes

- SSL is enabled for database connections
- Environment variables are used for sensitive configuration
- CORS is enabled for frontend integration
- Production secrets should never be committed to version control

## 🚀 Deployment

The application is configured for deployment on Render.com with automatic SSL and environment variable management.

### Deployment Checklist:
- [ ] Environment variables configured in Render dashboard
- [ ] Database connection tested
- [ ] SSL certificate configured
- [ ] Health check endpoint responding
- [ ] Migrations run successfully

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is private and proprietary.
\`\`\`
