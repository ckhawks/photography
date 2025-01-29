require("dotenv").config();
const { neon } = require("@neondatabase/serverless");

export async function db(query: string, params: string[]) {
  // set up database connection
  const sql = neon(process.env.DATABASE_URL);

  // run the query and save the response rows
  const response = await sql(query, params);

  // return the response
  return response;
}
