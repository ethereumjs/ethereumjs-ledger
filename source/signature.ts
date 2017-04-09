export class Signature {
	public readonly v: string;
	public readonly r: string;
	public readonly s: string;

	constructor(v: string, r: string, s: string) {
		this.v = v;
		this.r = r;
		this.s = s;
	}

	public toString = (): string => {
		return `0x${this.r}${this.s}${this.v}`;
	}

	public static fromSignature(signature: { v: string, r: string, s: string }) {
		return new Signature(signature.v, signature.r, signature.s);
	}
}
