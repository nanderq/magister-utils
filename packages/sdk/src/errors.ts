export class MagisterRequestError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = "MagisterRequestError";
    }
}
