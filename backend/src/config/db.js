import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'edu_survey',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
})

export async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

export async function checkDatabaseConnection() {
  const rows = await query('SELECT 1 AS ok')
  return rows[0]?.ok === 1
}

export default pool
