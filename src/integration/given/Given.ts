export interface Given {
  setup(): Promise<void>;
  tearDown(): Promise<void>;
}