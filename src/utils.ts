import { AppBskyActorDefs, AppBskyActorProfile } from "@atproto/api";

export function parseRegex(input: string): RegExp {
    const match = input.match(/^\/(.*)\/([gimsuy]*)$/);
    if (!match) {
        throw new Error("Invalid regex format. Expected format: /pattern/flags");
    }
    const [, pattern, flags] = match;
    return new RegExp(pattern, flags);
}