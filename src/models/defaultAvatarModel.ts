import { ListEntry } from "../types";
import { BaseProfileModel, userTestParam } from "./baseProfileModel";
import { checkUserAvatar } from "./defaultAvatarModel/checkUser";


export class defaultAvatarModel extends BaseProfileModel {

    private listUri: string;
    constructor(list: string) {
        super();
        this.listUri = list;
    }

    async testProfile(param: userTestParam): Promise<ListEntry | null> {
        if (!param.listManager) {
            return null;
        }

        const results = await checkUserAvatar({ agent: param.listManager.getAgent(), user: param.user, did: param.did });

        if (results.result === 1) {
            return {
                did: param.did,
                listUri: this.listUri
            };
        }
        return null;
    }
}