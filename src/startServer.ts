import "reflect-metadata";
import "dotenv/config";
import { ApolloServer } from "apollo-server-express";
import * as cors from "cors";
import * as express from "express";
import * as http from "http";

import * as session from "express-session";
import * as connectRedis from "connect-redis";
import * as rateLimit from "express-rate-limit";
import * as rateLimitRedisStore from "rate-limit-redis";

import { redis } from "./redis";
import { confirmEmail } from "./routes/confirmEmail";
import { genSchema } from "./utils/genSchema";
import { redisSessionPrefix } from "./constants";
import { createTestConn } from "./testSetup/createTestConn";
import { createTypeormConn } from "./utils/createTypeormConn";

const SESSION_SECRET = "sjkldfhaiofhewuio";
const RedisStore = connectRedis(session);

export const startServer = async () => {
  if (process.env.NODE_ENV === "test") {
    await redis.flushall();
  }

  const schema = genSchema();
  const server = new ApolloServer({
    subscriptions: {
      path: "/",
    },
    schema,
    context: ({ req }) => ({
      redis,
      url: req.protocol + "://" + req.get("host"),
      session: req.session,
      req,
    }),
  });

  const app = express();

  app.use(
    cors({
      credentials: true,
      origin:
        process.env.NODE_ENV === "test"
          ? "*"
          : (process.env.FRONTEND_HOST as string),
    })
  );

  app.use(
    rateLimit({
      store: new rateLimitRedisStore({
        client: redis,
      }),
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    })
  );

  app.use(
    session({
      store: new RedisStore({ client: redis, prefix: redisSessionPrefix }),
      name: "qid",
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );

  app.get("/confirm/:id", confirmEmail);

  if (process.env.NODE_ENV === "test") {
    await createTestConn(true);
  } else {
    await createTypeormConn();
  }

  server.applyMiddleware({
    app,
    cors: false,
    path: "/",
  });

  const port =
    process.env.NODE_ENV === "test" ? 1234 : process.env.PORT || 4000;

  const httpServer = http.createServer(app);
  server.installSubscriptionHandlers(httpServer);

  httpServer.listen(port, () =>
    console.log(`Server is running on localhost:${port}`)
  );

  return { app, port };
};
