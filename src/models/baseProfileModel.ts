import AtpAgent, { AppBskyActorProfile } from "@atproto/api";
import { AtprotoWrapper } from "../atprotoWrapper";
import { ListEntry } from "../types";
import { logger } from "../logger";

export interface userTestParam {
    listManager?: AtprotoWrapper;
    user: AppBskyActorProfile.Record;
    did: string;
    handle?: string;
}



export abstract class BaseProfileModel {
    protected listUri: string;
    constructor(listUri: string) {
        this.listUri = listUri;
    }

    async consumeProfileUpdate(param: userTestParam, existingEntries: ListEntry[]): Promise<void> {
        const matched = await this.testProfile(param);

        const alreadyInList = existingEntries.some((entry) => entry.listUri === this.listUri);

        if (matched && !alreadyInList) {
            logger.info(`User ${param.did} matched model for list ${this.listUri}, adding to list queue`);
            param.listManager?.addUserToListQueue(param.did, this.listUri);
        } else if (!matched && alreadyInList) {
            logger.info(`User ${param.did} no longer matches model for list ${this.listUri}, adding to removal queue`);
            param.listManager?.removeUserFromListQueue(param.did, this.listUri, existingEntries.find((entry) => entry.listUri === this.listUri)?.rkey ?? "");
        } else {
            // logger.debug(`User ${param.did} matched=${matched} alreadyInList=${alreadyInList} for list ${this.listUri}, no action taken`);
        }
    }

    abstract testProfile(param: userTestParam): Promise<boolean>;

    getSubscribedJetstreamCollections(): string[] {
        return ["app.bsky.actor.profile"];
    }
}
