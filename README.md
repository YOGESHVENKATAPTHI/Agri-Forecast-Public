# AgriPredict

A comprehensive agricultural prediction platform that leverages AI to provide intelligent crop recommendations, real-time weather monitoring, drought alerts, and data-driven farming insights.

Production Url: https://agri-forecast-7g7m.onrender.com/

## Features

- **User Authentication**: Secure login system with Replit Auth integration
- **Land Management**: Create and manage multiple agricultural lands with location tracking
- **Weather Monitoring**: Real-time weather data integration with NASA POWER API
- **AI-Powered Predictions**: Intelligent crop recommendations using advanced AI models via OpenRouter
- **Drought Monitoring**: Automated drought detection and alert system
- **Real-time Chat**: AI-powered chat interface for farming queries
- **Multilingual Support**: Translation services for global accessibility
- **Data Visualization**: Interactive maps and charts using Leaflet and Recharts
- **Notification System**: SMS and email alerts for critical farming events
- **Background Analysis**: Automated data processing and analysis services

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **React Query** for data fetching
- **Leaflet** for interactive maps
- **Recharts** for data visualization

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Drizzle ORM** with PostgreSQL
- **Neon Database** for serverless PostgreSQL
- **OpenRouter API** for AI services
- **WebSocket** for real-time features

### Services
- **AI Service**: Crop recommendations and intelligent analysis
- **Weather Service**: NASA POWER data integration
- **Notification Service**: Twilio for SMS, Nodemailer for email
- **Translation Service**: Google Translate API integration
- **Background Analysis**: Automated data processing

## Prerequisites

- Node.js 18.x
- PostgreSQL database (Neon recommended)
- OpenRouter API key
- Google Translate API key (optional)
- Twilio credentials (optional for SMS)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOGESHVENKATAPTHI/Agri-Forecast-Public.git
   cd agripredict
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Database
   DATABASE_URL=your_neon_database_url
   
   # AI Service
   OPENROUTER_API_KEYS=your_openrouter_api_keys
   
   # Translation (optional)
   GOOGLE_TRANSLATE_API_KEY=your_google_translate_key
   
   # Notifications (optional)
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   
   # Email (optional)
   EMAIL_USER=your_email
   EMAIL_PASS=your_email_password
   
   # Session
   SESSION_SECRET=your_session_secret
   ```

4. **Database Setup**
   ```bash
   npm run db:push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

## Usage

1. **Register/Login**: Create an account or log in with existing credentials
2. **Add Land**: Set up your agricultural land with location coordinates
3. **Monitor Weather**: View real-time weather data for your land
4. **Get Predictions**: Receive AI-powered crop recommendations
5. **Chat with AI**: Ask farming-related questions through the chat interface
6. **Receive Alerts**: Get notifications for drought conditions and other events

## Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
agripredict/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility libraries
│   │   └── contexts/      # React contexts
├── server/                 # Node.js backend
│   ├── index.ts           # Main server file
│   ├── routes.ts          # API routes
│   ├── aiService.ts       # AI integration
│   ├── weatherService.ts  # Weather data service
│   └── ...                # Other services
├── shared/                 # Shared types and schemas
├── migrations/            # Database migrations
└── package.json           # Dependencies and scripts
```

## API Documentation

The backend provides RESTful APIs for:
- User management
- Land management
- Weather data retrieval
- AI predictions
- Notification management

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Testing

Currently, the project uses TypeScript for type checking. Future testing framework integration planned.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- NASA POWER API for weather data
- OpenRouter for AI model access
- Replit for authentication services
- All contributors and open-source libraries used

## Support

For support, please open an issue on GitHub or contact the maintainers.</content>

<parameter name="filePath">d:\yogesh\AgriPredict\README.md
