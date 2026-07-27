export interface BlegodwinData {
  id: number;
  val: string;
}

export interface BlegodwinState {
  isActive: boolean;
  data: BlegodwinData[];
}
