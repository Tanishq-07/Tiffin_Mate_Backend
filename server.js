require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const ordersRouter = require('./routes/orders');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/orders', ordersRouter);

app.get('/', (req, res) => res.send('Tiffin backend running ✅'));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 3000, () =>
      console.log(`Server running on port ${process.env.PORT || 3000}`)
    );
  })
  .catch((err) => console.error('MongoDB error:', err));