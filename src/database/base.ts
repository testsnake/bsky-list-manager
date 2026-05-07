import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "lists.db");

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
    if (!instance) {
        instance = new Database(DB_PATH);
        instance.pragma("journal_mode = WAL");
    }
    return instance;
}

export function closeDb(): void {
    instance?.close();
    instance = null;
}