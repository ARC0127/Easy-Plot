type Mat2D = [number, number, number, number, number, number];
export declare function normalizeTransform(raw: string | undefined): {
    raw: string | null;
    translate: [number, number] | null;
    scale: [number, number] | null;
    rotate: number | null;
    matrix: Mat2D | null;
};
export {};
//# sourceMappingURL=normalizeTransform.d.ts.map