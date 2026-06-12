require('dotenv').config();
const mongoose = require('mongoose');

(async function(){
  try{
    const uri = process.env.MONGODB_URI;
    if(!uri) {
      console.error('MONGODB_URI is not set');
      process.exit(2);
    }
    console.log('Connecting to', uri);
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('OK: connected to MongoDB');
    await mongoose.connection.close();
    process.exit(0);
  }catch(e){
    console.error('ERR', e.message);
    process.exit(1);
  }
})();
