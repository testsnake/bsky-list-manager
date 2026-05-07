import { ListEntry, rexegModelConfig } from "../types";
import { BaseProfileModel, userTestParam } from "./baseProfileModel";
import { checkUserAvatar } from "./defaultAvatarModel/checkUser";



export class regexModel extends BaseProfileModel {
    private modelConfig: rexegModelConfig;

    constructor(config: rexegModelConfig) {
        super(config.listUri);
        this.modelConfig = config;
    }

    async testProfile(param: userTestParam): Promise<boolean> {
    const checks: [boolean | undefined, string | undefined][] = [
        [this.modelConfig.inHandle, param.handle],
        [this.modelConfig.inBio, param.user.description],
        [this.modelConfig.inDisplayName, param.user.displayName],
        [this.modelConfig.inPronouns, param.user.pronouns],
    ];

    return checks.some(([enabled, value]) => enabled && value && this.modelConfig.regex.test(value));
}
}
