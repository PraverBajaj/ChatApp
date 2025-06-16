import express, { Request, Response }  from 'express';
import cors from 'cors';
import { prismaClient } from "./lib/db";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

const app =express();
app.use(express.json());
app.use(cors())

const PORT = 3000;

app.post('/signup', async (req :Request, res : Response) => {
  try {
      const {email, password , username} = req.body;
  if (!email || !password || !username) {
     res.status(400).json({ error : 'Email, password, and username are required' });
     return
  }
  const hashedPassword =await bcrypt.hash(password, 10);
  await prismaClient.user.create({
    data: {
      email,
      password: hashedPassword,
      username // or set this to another value as appropriate
    },
  });
  res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return 
    }
    const user = await prismaClient.user.findUnique({
      where: { email },
    });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const token = jwt.sign({ userId: user.id , username : user.username }, process.env.JWT_SECRET || 'default' )
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.listen(PORT, () => {
  console.log(`HTTP server is running on http://localhost:${PORT}`);
}
);