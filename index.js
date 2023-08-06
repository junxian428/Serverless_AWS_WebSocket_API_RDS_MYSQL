const AWS = require('aws-sdk');
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
const mysql = require('mysql2');

const secret_name = "";
const region = "us-east-1";

module.exports.handler = async (event) => {
  const { requestContext, body } = event;

  if (requestContext && requestContext.routeKey === '$connect') {
    // Handle WebSocket connection
    const connectionId = requestContext.connectionId;
    console.log(`New WebSocket connection established with ID: ${connectionId}`);

    const response = {
      statusCode: 200,
      body: JSON.stringify('Hello from WebSocket Lambda!'),
    };
    return response;
  } else if (requestContext && requestContext.routeKey === '$disconnect') {
    // Handle WebSocket disconnection
    const connectionId = requestContext.connectionId;
    console.log(`WebSocket connection with ID ${connectionId} disconnected.`);
    return {
      statusCode: 200,
      body: JSON.stringify('WebSocket connection disconnected.'),
    };
  } else if (requestContext && requestContext.routeKey === '$default') {
    /*
      Read Database
    */

    const client = new SecretsManagerClient({
      region: region,
    });

    let response;

    try {
      response = await client.send(
        new GetSecretValueCommand({
          SecretId: secret_name,
          VersionStage: "AWSCURRENT",
        })
      );
    } catch (error) {
      throw error;
    }

    const secretString = response.SecretString;
    const secretObject = JSON.parse(secretString);

    const dbConfig = {
      host: '.amazonaws.com',
      user: '',
      password: '',
      database: '',
    };

    const connection = mysql.createConnection(dbConfig);

    try {
      const results = await new Promise((resolve, reject) => {
        connection.query("SELECT * FROM ", (queryErr, results, fields) => {
          if (queryErr) {
            console.error("Error executing query:", queryErr);
            reject(queryErr);
          } else {
            console.log("Query results:", results);
            resolve(results);
          }
        });
      });

      connection.end(); // Close the database connection

      return {
        statusCode: 200,
        body: JSON.stringify(results)
      };
    } catch (error) {
      console.error(error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Error retrieving data' })
      };
    }
  } else {
    // Invalid route key
    return {
      statusCode: 400,
      body: JSON.stringify('Invalid route key.'),
    };
  }
};
