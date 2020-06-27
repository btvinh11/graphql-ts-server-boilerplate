import { startServer } from "../startServer";

export const setup = async () => {
  const { port } = await startServer();
  process.env.TEST_HOST = `http://localhost:${port}`;
};
