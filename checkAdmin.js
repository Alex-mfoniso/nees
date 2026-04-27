import fs from "fs";
import initSqlJs from "sql.js";

const DB_FILE = "./database.sqlite";

async function checkAdmin() {
    if (!fs.existsSync(DB_FILE)) {
        console.log("❌ database.sqlite not found");
        return;
    }

    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(DB_FILE);
    const db = new SQL.Database(fileBuffer);

    const result = db.exec("SELECT id, username, password FROM admins");
    if (result.length > 0) {
        const columns = result[0].columns;
        const rows = result[0].values;
        console.log("Admin details from SQLite:");
        rows.forEach(row => {
            const obj = {};
            columns.forEach((col, i) => obj[col] = row[i]);
            console.log(`ID: ${obj.id}, Username: ${obj.username}, Password: ${obj.password}`);
        });
    } else {
        console.log("No admins found in SQLite");
    }

    db.close();
}

checkAdmin().catch(err => console.error("Error:", err));