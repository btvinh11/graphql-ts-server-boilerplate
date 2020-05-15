import "reflect-metadata";
import "dotenv/config";
import { GraphQLServer } from "graphql-yoga";
import * as session from "express-session";
import * as connectRedis from "connect-redis";
import * as rateLimit from "express-rate-limit";
import * as rateLimitRedisStore from "rate-limit-redis";
// import * as passport from "passport";
// import { Strategy } from "passport-twitter";

import { redis } from "./redis";
import { confirmEmail } from "./routes/confirmEmail";
import { genSchema } from "./utils/genSchema";
import { redisSessionPrefix } from "./constants";
import { createTestConn } from "./testSetup/createTestConn";
// import { User } from "./entity/User";

const SESSION_SECRET = "sjkldfhaiofhewuio";
const RedisStore = connectRedis(session);

export const startServer = async () => {
  if (process.env.NODE_ENV === "test") {
    await redis.flushall();
  }
  const schema: any = genSchema();
  const server = new GraphQLServer({
    schema,
    context: ({ request }) => ({
      redis,
      url: request.protocol + "://" + request.get("host"),
      session: request.session,
      req: request,
    }),
  });

  server.express.use(
    rateLimit({
      store: new rateLimitRedisStore({
        client: redis,
      }),
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    })
  );

  server.express.use(
    session({
      store: new RedisStore({ client: redis, prefix: redisSessionPrefix }),
      name: "qid",
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );

  const cors = {
    credentials: true,
    origin:
      process.env.NODE_ENV === "test"
        ? "*"
        : (process.env.FRONTEND_HOST as string),
  };

  server.express.get("/confirm/:id", confirmEmail);

  if (process.env.NODE_ENV === "test") {
    await createTestConn(true);
  } else {
    await createTestConn();
  }

  // twitter auth
  // const connection = await createTypeormConn();
  // passport.use(
  //   new Strategy(
  //     {
  //       consumerKey: process.env.TWITTER_CONSUMER_KEY as string,
  //       consumerSecret: process.env.TWITTER_CONSUMER_SECRET as string,
  //       callbackURL: "http://localhost:4000/auth/twitter/callback",
  //       includeEmail: true,
  //     },
  //     async (_, __, profile, cb) => {
  //       const { id, emails } = profile;

  //       const query = connection
  //         .getRepository(User)
  //         .createQueryBuilder("user")
  //         .where("user.twitterId = :id", { id });

  //       let email: string | null = null;

  //       if (emails) {
  //         email = emails[0].value;
  //         query.orWhere("user.email = :email", { email });
  //       }

  //       let user = await query.getOne();

  //       // this user needs to be registered
  //       if (!user) {
  //         user = await User.create({
  //           twitterId: id,
  //           email,
  //         }).save();
  //       } else if (!user.twitterId) {
  //         // merge account
  //         // we found user by email
  //         user.twitterId = id;
  //         await user.save();
  //       } else {
  //         // we have a twitterId
  //         // login
  //       }

  //       return cb(null, { id: user.id });
  //     }
  //   )
  // );

  // server.express.use(passport.initialize());

  // server.express.get("/auth/twitter", passport.authenticate("twitter"));

  // server.express.get(
  //   "/auth/twitter/callback",
  //   passport.authenticate("twitter", { session: false }),
  //   (req, res) => {
  //     (req.session as any).userId = (req.user as any).id;
  //     // @todo redirect to frontend
  //     res.redirect("/");
  //   }
  // );

  const app = await server.start({
    cors,
    port: process.env.NODE_ENV === "test" ? 0 : 4000,
  });
  console.log("Server is running on localhost:4000");

  return app;
};
