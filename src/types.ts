import type { InputSchema } from "@atproto/api/src/client/types/com/atproto/repo/applyWrites";

export interface ListEntry {
    id?: number;
    did: string;
    listUri: string;
    rkey?: string;
}

export interface UserEntry {
    // user identifier
    did: string;
    // used to check if avatar has changed
    avatarSize: number | null;
    // used to check if profile has changed
    profileHash: string | null;
    // on any list ran by bot, quick lookup
    onAnyList: number;
    // last monitored activity timestamp according to pds
    lastActivity: number;
    // last time user updated in db
    lastUpdate: number;
}

export enum ListOperation {
    createRecord = 0,
    updateRecord = 1,
    deleteRecord = 2,
}

export interface ListQueueEntry {
    id: number;
    listUri: string;
    operation: ListOperation;
    did?: string | null;
    rkey?: string | null;
    nextTry: number;
    tries: number;
}

export type RepoWrites = InputSchema["writes"];

export interface rexegModelConfig {
    listUri: string;
    regex: RegExp;
    inHandle?: boolean;
    inBio?: boolean;
    inDisplayName?: boolean;
    inPronouns?: boolean;
}
