import { Redis } from "ioredis";
import { redisSessionPrefix, userSessionIdPrefix } from "../constants";

export const removeAllUsersSessions = async (userId: string, redis: Redis) => {
  const sessionIds = await redis.lrange(
    `${userSessionIdPrefix}${userId}`,
    0,
    -1
  );

  const promises = [];
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < sessionIds.length; i++) {
    promises.push(redis.del(`${redisSessionPrefix}${sessionIds[i]}`));
  }
  await Promise.all(promises);
};
