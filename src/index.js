import express from 'express';

const app = express();
const PORT = 8000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from the Express server!' });
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}. Visit http://localhost:${PORT}/`);
});
