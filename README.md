# Yeka Couch Academy

A Next.js and Express.js based application for managing Spanish language academy classes and students.

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

## Project Structure

- `/server` - Express.js backend server
- `/app` - Next.js frontend application
- `/database.sqlite` - SQLite database file (keep this in the root directory)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Environment Setup

Create a `.env` file in the root directory with the following variables:
```
NODE_ENV=development
PORT=3001
DATABASE_PATH=./database.sqlite
```

## Available Scripts

### Development
- `npm run dev:full` - Start both frontend and backend servers concurrently

### Production
- `npm run build` - Build the Next.js application
- `npm run prod` - Start the application in production mode

## Database

The project uses SQLite as its database. The database file should be located in the root directory as `database.sqlite`. Make sure to:
1. Keep the database file in the root directory
2. Back up the database file regularly
3. Do not delete or move the database file

## Starting the Project

1. First time setup:
```bash
npm install
npm run seed  # Only if you need initial data
```

2. For development:
```bash
npm run dev:full
```

3. For production:
```bash
npm run build
npm run prod
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Features

- User authentication and authorization
- Student management
- Class scheduling
- Package management
- Class rescheduling
- Calendar integration

## Technologies Used

- Next.js
- Express.js
- SQLite
- Sequelize ORM
- Material-UI
- FullCalendar
- React Hook Form
- JWT Authentication

## Support

For any issues or questions, please contact the development team.
