import { ListEntry, rexegModelConfig } from "../types";
import { BaseProfileModel, userTestParam } from "./baseProfileModel";
import { checkUserAvatar } from "./defaultAvatarModel/checkUser";



export class regexModel extends BaseProfileModel {
    private modelConfig: rexegModelConfig;
    constructor(config: rexegModelConfig) {
        super();
        this.modelConfig = config;
    }

    async testProfile(param: userTestParam): Promise<ListEntry | null> {
        const checks: [boolean | undefined, string | undefined][] = [
            [this.modelConfig.inHandle, param.handle],
            [this.modelConfig.inBio, param.user.description],
            [this.modelConfig.inDisplayName, param.user.displayName],
            [this.modelConfig.inPronouns, param.user.pronouns],
        ];

        const matched = checks.some(([enabled, value]) => enabled && value && this.modelConfig.regex.test(value));

        return matched ? { did: param.did, listUri: this.modelConfig.listUri } : null;
    }
}
