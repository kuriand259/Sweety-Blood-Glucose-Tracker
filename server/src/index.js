require('dotenv').config();

const { app } = require('./app');

const port = Number(process.env.PORT) || 4100;

app.listen(port, () => {
  console.log(`Sweety API listening on port ${port}`);
});
