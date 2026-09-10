jest.mock("expo-secure-store", () => ({
  getItem: jest.fn(() => null),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
