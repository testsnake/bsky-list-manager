export interface listEntry {
    id: number;
    did: string;
    listUri: string;
    rkey?: string;
}

export interface userEntry {
    // user identifier
    did: string;
    // used to check if avatar has changed
    avatarSize: number | null;
    // used to check if profile has changed
    profileHash: string | null;
    // on any list ran by bot, quick lookup
    onAnyList: boolean;
    // last monitored activity timestamp according to pds
    lastActivity: number;
    // last time user updated in db
    lastUpdate: number;
}