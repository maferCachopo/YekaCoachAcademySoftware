# YekaCouch Academy Server Scripts

This directory contains utility scripts for managing the YekaCouch Academy application.

## Available Scripts

### `createAdmin.js`

Creates an admin user in the database.

```
node scripts/createAdmin.js
```

### `resetDatabase.js`

Resets the database to its initial state.

```
node scripts/resetDatabase.js
```

### `deploy.js`

Runs database migrations in production environment.

```
node scripts/deploy.js
```

## Database Migrations

### Running Migrations in Production

There are several ways to run migrations in your production environment:

#### Option 1: Use the deploy script

```
node scripts/deploy.js
```

This script will:
1. Set the environment to production
2. Check the migration status
3. Run any pending migrations

#### Option 2: Use npm scripts

From the root directory:

```
npm run migrate:production
```

Or from the server directory:

```
npm run migrate:production
```

#### Option 3: Use Sequelize CLI directly

From the server directory:

```
NODE_ENV=production npx sequelize-cli db:migrate
```

### Migration Commands

- Check migration status:
  ```
  npm run migrate:status
  ```

- Undo the last migration:
  ```
  npm run migrate:undo
  ```

- Undo all migrations:
  ```
  cd server && npx sequelize-cli db:migrate:undo:all
  ```

## Troubleshooting

### Migration Issues

If you encounter issues with migrations not being applied in production:

1. Check if the migration files exist in your production environment
2. Verify that the database configuration is correct for the production environment
3. Check the migration status using `npm run migrate:status`
4. Try running the migrations manually using one of the methods above
5. Check for any errors in the console output

### Database Connection Issues

If you're having trouble connecting to the database:

1. Verify that the database file exists and has the correct permissions
2. Check the database configuration in `server/config/database.js`
3. Ensure that the environment variables are set correctly

## resetDatabase.js

This script resets the database to a clean state while preserving the admin account. It:
- Keeps the admin user account
- Deletes all students, classes, packages, and related data

### How to run

From the project root:
```
cd server
node scripts/resetDatabase.js
```

### When to use
- When you want to start fresh with your application
- When you want to delete test data
- When you need to reset your database but keep admin credentials

## Migration Scripts

### Add Zoom Link to Students Table

This script adds a `zoomLink` column to the `Students` table, allowing you to store Zoom meeting links for each student.

To run the migration:

```bash
node server/scripts/addZoomLinkToStudents.js
```

This script checks if the column already exists before attempting to add it, so it's safe to run multiple times.

## Other scripts

- `createAdmin.js` - Creates a new admin user if one doesn't exist 