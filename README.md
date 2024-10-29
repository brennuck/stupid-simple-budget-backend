# Stupid Simple Budget

Stupid Simple Budget is a web application that helps users manage their personal finances. The backend of this application is built using Node.js, Express, and PostgreSQL.

## Features

1. **Account Management**: Users can create and manage their bank accounts, including their name, balance, and type (e.g., checking, savings).
2. **Transaction Tracking**: Users can record their transactions, including the amount, description, date, and the account involved (either the source or destination account).
3. **Automatic Deposits**: The application can automatically deposit funds into accounts based on a user-defined schedule (weekly, bi-weekly, or monthly).
4. **Data Download and Upload**: Users can download their account and transaction data as a JSON file, and they can also upload data to the application.

## Installation and Setup

1. **Prerequisites**:

    - Node.js (version 14 or higher)
    - PostgreSQL (version 12 or higher)
    - A PostgreSQL database and connection details

2. **Clone the repository**:

    ```
    git clone https://github.com/your-username/stupid-simple-budget.git
    ```

3. **Install dependencies**:

    ```
    cd stupid-simple-budget
    npm install
    ```

4. **Set up the environment variables**:

    - Rename the `.env.example` file to `.env`.
    - Update the environment variables with your PostgreSQL connection details.

5. **Create the database tables**:

    - The `createTables()` function in the `index.tsx` file creates the necessary database tables.
    - You can run this function manually or by calling the `/upload-data` endpoint.

6. **Start the server**:
    ```
    npm start
    ```
    The server will start running on the port specified in the `.env` file (or `2933` by default).

## API Endpoints

The application provides the following API endpoints:

-   `GET /`: Returns the current server status and database connection status.
-   `GET /accounts`: Returns a list of all accounts.
-   `POST /account`: Creates a new account.
-   `GET /transactions`: Returns a list of all transactions.
-   `POST /transaction`: Creates a new transaction.
-   `GET /download-data`: Returns all account and transaction data as a JSON object.
-   `POST /upload-data`: Uploads account and transaction data from a JSON object.

## Development

1. **Running the development server**:

    ```
    npm start
    ```

    This will start the server in development mode, with automatic reloading when changes are made to the code.

2. **Linting and formatting**:
    ```
    npm run lint
    ```
    This will run the linter and fix any code style issues.

## Future Improvements

-   Implement user authentication and authorization.
-   Add support for recurring transactions and scheduled transfers.
-   Enhance the data visualization and reporting capabilities.
-   Improve error handling and logging.
-   Integrate with third-party financial services (e.g., bank APIs).

## Contributing

If you'd like to contribute to the Stupid Simple Budget project, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them.
4. Push your changes to your forked repository.
5. Submit a pull request to the original repository.

Please ensure that your code follows the project's coding conventions and that you've added appropriate tests for your changes.
