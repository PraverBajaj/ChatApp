import express from 'express';
import cors from 'cors';
import { Jwt } from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

const app =express();
app.use(express.json());
app.use(cors())

const PORT = 3000;
app.get('/', (req, res) => {
  res.send('Hello, World!');
}
);


app.listen(PORT, () => {
  console.log(`HTTP server is running on http://localhost:${PORT}`);
}
);