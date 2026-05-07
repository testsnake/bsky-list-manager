import Database from "better-sqlite3";
import { UserEntry } from "../types";
import { getDb } from "./base";
import path from "path";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "user.db");

class UserDatabase {
    private readonly db = getDb();
    private static instance: UserDatabase | null = null;

    private constructor() {
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

    private rowToEntry(row: any): UserEntry {
        return { ...row };
    }

    public upsert(entry: UserEntry): void {
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

        stmt.run(entry);
    }

    public insert(entry: UserEntry): void {
        const stmt = this.db.prepare(`
            INSERT INTO user_entries (did, avatarSize, profileHash, onAnyList, lastActivity, lastUpdate)
            VALUES (@did, @avatarSize, @profileHash, @onAnyList, @lastActivity, @lastUpdate)
        `);

        stmt.run(entry);
    }

    public update(did: string, fields: Partial<Omit<UserEntry, "did">>): boolean {
        const allowed = ["avatarSize", "profileHash", "onAnyList", "lastActivity", "lastUpdate"] as const;
        const keys = Object.keys(fields).filter((k) => allowed.includes(k as any));

        if (keys.length === 0) return false;

        const setClauses = keys.map((k) => `${k} = @${k}`).join(", ");
        const stmt = this.db.prepare(`UPDATE user_entries SET ${setClauses} WHERE did = @did`);

        const result = stmt.run({ did, ...fields });
        return result.changes > 0;
    }

    public findByDid(did: string): UserEntry | undefined {
        const stmt = this.db.prepare(`SELECT * FROM user_entries WHERE did = ?`);
        const row = stmt.get(did);
        return row ? this.rowToEntry(row) : undefined;
    }

    public remove(did: string): boolean {
        const stmt = this.db.prepare(`DELETE FROM user_entries WHERE did = ?`);
        const result = stmt.run(did);
        return result.changes > 0;
    }

    public getAll(): UserEntry[] {
        const stmt = this.db.prepare(`SELECT * FROM user_entries`);
        return stmt.all().map(this.rowToEntry);
    }

    public incrementOnAnyList(did: string): boolean {
        const stmt = this.db.prepare(`
        UPDATE user_entries SET onAnyList = onAnyList + 1 WHERE did = ?
    `);
        return stmt.run(did).changes > 0;
    }

    public decrementOnAnyList(did: string): boolean {
        const stmt = this.db.prepare(`
        UPDATE user_entries SET onAnyList = MAX(0, onAnyList - 1) WHERE did = ?
    `);
        return stmt.run(did).changes > 0;
    }

    public touchLastUpdate(did: string): boolean {
        const stmt = this.db.prepare(`
        UPDATE user_entries SET lastUpdate = ? WHERE did = ?
    `);
        return stmt.run(Date.now(), did).changes > 0;
    }

    public close(): void {
        this.db.close();
        UserDatabase.instance = null;
    }
}

export default UserDatabase;
