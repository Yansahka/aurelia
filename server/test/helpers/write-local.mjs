import { createLocalPool } from '../../local-pool.js';
const pool=await createLocalPool(process.argv[2]);
await pool.query("INSERT INTO users(email,name,password_hash) VALUES('persistence@example.test','Persistence test','test-only-hash')");
process.on('message',()=>{});
process.send('committed');
