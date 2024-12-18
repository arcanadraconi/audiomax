<div align="center">
  <img src="https://i.ibb.co/tK6qWS8/a-photo-of-a-large-logo-with-the-text-audiomax-per-p-rn-ZS-d-Tz-GJl5y-Lx-DTR1g-b-Luf-Tz62-TPu-SHLuvs.png" alt="AudioMax Logo" width="1600px">

  <h1>AudioMax</h1>
  <p>A sophisticated text-to-speech platform designed for maximum flexibility and reliability.</p>

  <div>
    <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version 1.0.0">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License MIT">
    <img src="https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen.svg" alt="Node >=18.0.0">
    <img src="https://img.shields.io/badge/typescript-%5E5.0.0-blue.svg" alt="TypeScript ^5.0.0">
  </div>
</div>

---


# AudioMax - Your Personalized AI-Powered Audio Content Generator.

AudioMax is a web application that allows you to easily convert text into high-quality audio using a vast library of professional voices.  Customize your audio with advanced voice cloning, real-time previews, and audience targeting options.

## Features

* **Extensive Voice Library:** Access a diverse collection of professional voices with various accents, ages, and styles.
* **Voice Cloning:** Create custom voices that match your specific needs.
* **Smart Voice Search:** Find the perfect voice using intelligent filters and categories.
* **Real-time Preview:** Listen to voice samples before making your selection.
* **Audience Targeting:** Optimize your audio for specific audience types and contexts.
* **Secure Authentication:** Robust user authentication and authorization system.
* **Responsive Design:** Seamless experience across all devices and screen sizes.
* **Multiple Export Formats:** Export your audio in various formats.
* **Batch Processing:** Process multiple inputs simultaneously.
* **Text-to-Speech Conversion:** Convert text into high-quality audio.


## Getting Started

1. **Clone the Repository:**
   ```bash
   git clone <repository_url>
   cd audiomax
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and copy the example `.env.example` file into it.  Similarly, create a `.env` file in the `server` directory and copy the example `.env.example` file into it.  Fill in the necessary environment variables.

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```

   This will start the development server for both the frontend and backend.

## Project Structure

```
audiomax/
├── .env
├── .firebaserc
├── .gitignore
├── Dockerfile.frontend
├── firebase.json
├── functions/  # Serverless functions (e.g., Firebase functions)
├── netlify/  # Netlify configuration
├── package.json
├── package-lock.json
├── postcss.config.js
├── public/  # Static assets
├── server/  # Backend server code
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Custom middleware
│   │   ├── models/        # Database models
│   │   └── routes/        # API routes
│   └── ...
├── src/  # Frontend React code
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom React Hooks
│   ├── lib/              # Utility functions
│   ├── models/            # Data models
│   ├── pages/            # Page components
│   ├── services/          # Services
│   ├── types/             # Type definitions
│   └── utils.ts           # Utility functions
└── ...
```

## Technology Stack

### Frontend
- React with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Lucide React for icons
- React Router for navigation

### Backend
- Node.js with Express
- TypeScript
- MongoDB with Mongoose
- JWT for authentication
- PlayHT API integration

## Security Features

- JWT-based authentication
- Secure password hashing
- Rate limiting
- CORS protection
- Environment variable protection
- Input validation and sanitization

## Core Functionalities

### Voice Library
- Extensive collection of professional voices
- Advanced filtering and search capabilities
- Real-time voice previews
- Voice quality metrics

### Voice Cloning
- Custom voice creation
- Voice style transfer
- Quality assurance tools
- Voice management system

### Studio Features
- Text-to-speech conversion
- Audience optimization
- Multiple export formats
- Batch processing

## Responsive Design

AudioMax is built with a mobile-first approach, ensuring a seamless experience across:
- Desktop computers
- Tablets
- Mobile devices
- Various screen sizes and orientations

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- PlayHT for their excellent TTS API
- Tailwind CSS for the styling framework
- Vite for the build tool
- All our contributors and supporters
