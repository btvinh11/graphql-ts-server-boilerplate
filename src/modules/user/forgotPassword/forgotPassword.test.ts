import * as faker from "faker";
import * as Redis from "ioredis";
import { Connection } from "typeorm";
import { User } from "../../../entity/User";
import { createTestConn } from "../../../testSetup/createTestConn";
import { createForgotPasswordLink } from "../../../utils/createForgotPasswordLink";
import { forgotPasswordLockAccount } from "../../../utils/forgotPasswordLockAccount";
import { TestClient } from "../../../utils/TestClient";
import { forgotPasswordLockError } from "../login/errorMessages";
import { expiredKeyError, passwordlNotLongEnough } from "./errorMessages";

let userId: string;
const redis = new Redis();
let conn: Connection;
faker.seed(Date.now() + 0);
const email = faker.internet.email();
const password = faker.internet.password();
const newPassword = faker.internet.password();

beforeAll(async () => {
  conn = await createTestConn();
  const user = await User.create({
    email,
    password,
    confirmed: true,
  }).save();
  userId = user.id;
});

afterAll(async () => {
  conn.close();
});

describe("forgot password", () => {
  test("make sure it works", async () => {
    const client = new TestClient(process.env.TEST_HOST as string);

    // lock account
    await forgotPasswordLockAccount(userId, redis);
    const url = await createForgotPasswordLink("", userId, redis);

    const parts = url.split("/");
    const key = parts[parts.length - 1];

    // make sure you can't login to locked account
    expect(await client.login(email, password)).toEqual({
      data: {
        login: [
          {
            path: "email",
            message: forgotPasswordLockError,
          },
        ],
      },
    });

    // try changing to a password that's too short
    expect(await client.forgotPasswordChange("a", key)).toEqual({
      data: {
        forgotPasswordChange: [
          {
            path: "newPassword",
            message: passwordlNotLongEnough,
          },
        ],
      },
    });

    const response = await client.forgotPasswordChange(newPassword, key);

    expect(response.data).toEqual({
      forgotPasswordChange: null,
    });

    // make sure redis key expires after password change
    expect(
      await client.forgotPasswordChange(faker.internet.password(), key)
    ).toEqual({
      data: {
        forgotPasswordChange: [
          {
            path: "key",
            message: expiredKeyError,
          },
        ],
      },
    });

    expect(await client.login(email, newPassword)).toEqual({
      data: {
        login: null,
      },
    });
  });
});
