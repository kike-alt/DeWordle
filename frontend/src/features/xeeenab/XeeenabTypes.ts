export interface XeeenabData {
  id: number;
  val: string;
}

export interface XeeenabState {
  isActive: boolean;
  data: XeeenabData[];
}
