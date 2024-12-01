export interface AssemblyProgress {
  phase: 'downloading' | 'combining' | 'encoding';
  progress: number;
}
