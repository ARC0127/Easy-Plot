
export interface ExportArtifact {
  kind: 'svg' | 'html';
  artifactPath: string;
  content: string;
  warnings: string[];
  stabilitySummary: {
    stableObjects: number;
    fragileObjects: number;
    snapshotObjects: number;
  };
}

export interface SvgExportOptions {
  embedImages?: boolean;
  flattenFragileObjects?: boolean;
}
