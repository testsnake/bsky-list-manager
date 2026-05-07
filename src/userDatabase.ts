import Database from "better-sqlite3";
import { userEntry } from "./types";
import path from "path";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "lists.db");

class UserDatabase {
    private readonly db: Database.Database;
    private static instance: UserDatabase | null = null;

    private constructor() {
        this.db = new Database(DB_PATH);
        this.db.pragma("journal_mode = WAL");
        this.initialize();
    }

    private initialize(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_entries (
                did         TEXT    PRIMARY KEY,
                avatarSize  INTEGER,
                profileHash TEXT,
                onAnyList   INTEGER NOT NULL DEFAULT 0,
                lastActivity INTEGER NOT NULL,
                lastUpdate   INTEGER NOT NULL
            );
        `);
    }

    public static getInstance(): UserDatabase {
        if (!UserDatabase.instance) {
            UserDatabase.instance = new UserDatabase();
        }
        return UserDatabase.instance;
    }

    private rowToEntry(row: any): userEntry {
        return {
            ...row,
            onAnyList: row.onAnyList === 1,
        };
    }

    public upsert(entry: userEntry): void {
        const stmt = this.db.prepare(`
            INSERT INTO user_entries (did, avatarSize, profileHash, onAnyList, lastActivity, lastUpdate)
            VALUES (@did, @avatarSize, @profileHash, @onAnyList, @lastActivity, @lastUpdate)
            ON CONFLICT(did) DO UPDATE SET
                avatarSize   = excluded.avatarSize,
                profileHash  = excluded.profileHash,
                onAnyList    = excluded.onAnyList,
                lastActivity = excluded.lastActivity,
                lastUpdate   = excluded.lastUpdate
        `);

        stmt.run({ ...entry, onAnyList: entry.onAnyList ? 1 : 0 });
    }

    public insert(entry: userEntry): void {
        const stmt = this.db.prepare(`
            INSERT INTO user_entries (did, avatarSize, profileHash, onAnyList, lastActivity, lastUpdate)
            VALUES (@did, @avatarSize, @profileHash, @onAnyList, @lastActivity, @lastUpdate)
        `);

        stmt.run({ ...entry, onAnyList: entry.onAnyList ? 1 : 0 });
    }

    public update(did: string, fields: Partial<Omit<userEntry, "did">>): boolean {
        const allowed = ["avatarSize", "profileHash", "onAnyList", "lastActivity", "lastUpdate"] as const;
        const keys = Object.keys(fields).filter((k) => allowed.includes(k as any));

        if (keys.length === 0) return false;

        const setClauses = keys.map((k) => `${k} = @${k}`).join(", ");
        const stmt = this.db.prepare(`UPDATE user_entries SET ${setClauses} WHERE did = @did`);

        const params: Record<string, any> = { did, ...fields };
        if (typeof fields.onAnyList === "boolean") {
            params.onAnyList = fields.onAnyList ? 1 : 0;
        }

        const result = stmt.run(params);
        return result.changes > 0;
    }

    public findByDid(did: string): userEntry | undefined {
        const stmt = this.db.prepare(`SELECT * FROM user_entries WHERE did = ?`);
        const row = stmt.get(did);
        return row ? this.rowToEntry(row) : undefined;
    }

    public remove(did: string): boolean {
        const stmt = this.db.prepare(`DELETE FROM user_entries WHERE did = ?`);
        const result = stmt.run(did);
        return result.changes > 0;
    }

    public getAll(): userEntry[] {
        const stmt = this.db.prepare(`SELECT * FROM user_entries`);
        return stmt.all().map(this.rowToEntry);
    }

    public close(): void {
        this.db.close();
        UserDatabase.instance = null;
    }
}

export default UserDatabase;