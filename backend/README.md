# Dewordle Backend API

A robust NestJS backend API for the Dewordle word puzzle game, featuring user authentication, game management, leaderboards, and admin functionality.

## 🚀 Features

- **User Authentication**: JWT-based authentication with Google OAuth support
- **Game Management**: Multiple word games (Dewordle, Hangman, Spelling Bee, etc.)
- **Leaderboards**: Real-time scoring and rankings
- **Admin Panel**: Administrative controls and user management
- **Email Service**: Automated email notifications
- **Database**: PostgreSQL with TypeORM
- **Caching**: Redis integration for performance
- **Health Monitoring**: Built-in health checks

## 🛠️ Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL (Neon)
- **ORM**: TypeORM
- **Authentication**: JWT, Passport
- **Caching**: Redis
- **Email**: Nodemailer
- **Validation**: Class Validator
- **Documentation**: Swagger/OpenAPI

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database (Neon recommended)
- Redis (optional, for caching)

## 🔧 Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd dewordle-backend
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Environment Configuration**
   
   Copy the example environment file:
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   
   Update the \`.env\` file with your configuration:
   
   \`\`\`env
   # Database Configuration
   DB_HOST=your_neon_db_host
   DB_PORT=5432
   DB_USERNAME=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   DB_SSL=true
   
   # JWT Authentication
   JWT_SECRET=your_secure_jwt_secret
   JWT_EXPIRATION=24h
   
   # Application
   PORT=3000
   NODE_ENV=development
   \`\`\`

4. **Database Setup**
   
   Run migrations to set up the database schema:
   \`\`\`bash
   npm run migration:run
   \`\`\`

## 🚀 Running the Application

### Development
\`\`\`bash
npm run start:dev
\`\`\`

### Production
\`\`\`bash
npm run build
npm run start:prod
\`\`\`

The API will be available at \`http://localhost:3000/api/v1\`

## 🏥 Health Checks

Monitor your application health:

- **General Health**: \`GET /api/v1/health\`
- **Database Health**: \`GET /api/v1/health/db\`

## 🗄️ Database Management

### Migrations

Generate a new migration:
\`\`\`bash
npm run migration:generate -- src/migrations/MigrationName
\`\`\`

Run migrations:
\`\`\`bash
npm run migration:run
\`\`\`

Revert last migration:
\`\`\`bash
npm run migration:revert
\`\`\`

### Database Connection

The application uses Neon PostgreSQL with SSL enabled. Ensure your \`.env\` file has:

\`\`\`env
DB_SSL=true
SSL_MODE=require
\`\`\`

## 🔐 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| \`DB_HOST\` | Database host | \`ep-example.neon.tech\` |
| \`DB_PORT\` | Database port | \`5432\` |
| \`DB_USERNAME\` | Database username | \`your_user\` |
| \`DB_PASSWORD\` | Database password | \`your_password\` |
| \`DB_NAME\` | Database name | \`dewordledb\` |
| \`JWT_SECRET\` | JWT signing secret | \`your-secret-key\` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \`PORT\` | Application port | \`3000\` |
| \`NODE_ENV\` | Environment | \`development\` |
| \`FRONTEND_URL\` | Frontend URL for CORS | \`http://localhost:3000\` |

## 📚 API Documentation

Once the application is running, access the Swagger documentation at:
\`http://localhost:3000/api/v1/docs\`

## 🧪 Testing

Run tests:
\`\`\`bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
\`\`\`

## 🚀 Deployment

### Render Deployment

The application is configured for Render deployment:

1. Connect your repository to Render
2. Set environment variables in Render dashboard
3. Deploy with build command: \`npm run build\`
4. Start command: \`npm run start:prod\`

### Environment Variables for Production

Ensure all required environment variables are set in your production environment, especially:

- Database credentials
- JWT secrets
- Email configuration
- OAuth credentials

## 🔒 Security

- JWT tokens for authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS configuration
- SSL database connections
- Environment variable validation

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🐛 Troubleshooting

### Database Connection Issues

1. **SSL Certificate Error**:
   - Ensure \`DB_SSL=true\` in your \`.env\`
   - Check that \`rejectUnauthorized: false\` is set for Neon

2. **Connection Timeout**:
   - Verify database host and port
   - Check firewall settings
   - Ensure database is accessible from your IP

3. **Authentication Failed**:
   - Double-check username and password
   - Verify database name exists

### Common Issues

- **Port already in use**: Change the \`PORT\` in your \`.env\` file
- **Migration errors**: Ensure database is accessible and migrations are in correct format
- **JWT errors**: Verify \`JWT_SECRET\` is set and sufficiently complex

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation
- Review logs for detailed error messages

## 📄 License

This project is licensed under the MIT License.
