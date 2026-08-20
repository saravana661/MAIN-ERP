import { app } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

await connectDatabase();
app.listen(env.port, () => console.info(`Main ERP API listening at http://localhost:${env.port}`));

