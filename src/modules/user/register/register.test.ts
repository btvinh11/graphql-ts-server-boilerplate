import * as faker from "faker";
import { Connection } from "typeorm";
import { User } from "../../../entity/User";
import { createTestConn } from "../../../testSetup/createTestConn";
import { TestClient } from "../../../utils/TestClient";
import {
  duplicateEmail,
  emailNotLongEnough,
  invalidEmail,
  passwordlNotLongEnough,
} from "./errorMessages";

let conn: Connection;
faker.seed(Date.now() + 5);
const email = faker.internet.email();
const password = faker.internet.password();
const client = new TestClient(process.env.TEST_HOST as string);

beforeAll(async () => {
  conn = await createTestConn();
});

afterAll(async () => {
  await conn.close();
});

describe("Register user", () => {
  test("check for duplicate emails", async () => {
    // make sure we can register a user
    const response = await client.register(email, password);
    expect(response).toEqual({ data: { register: null } });
    const users = await User.find({ where: { email } });
    expect(users).toHaveLength(1);
    const user = users[0];
    expect(user.email).toEqual(email);
    expect(user.password).not.toEqual(password);

    // test for duplicate emails
    const response2: any = await client.register(email, password);
    expect(response2.data.register).toHaveLength(1);
    expect(response2.data.register[0]).toEqual({
      path: "email",
      message: duplicateEmail,
    });
  });

  test("check bad email", async () => {
    const response3: any = await client.register("d", password);
    expect(response3.data).toEqual({
      register: [
        {
          path: "email",
          message: emailNotLongEnough,
        },
        {
          path: "email",
          message: invalidEmail,
        },
      ],
    });
  });

  test("check bad password", async () => {
    const response4: any = await client.register(email, "ja");
    expect(response4.data).toEqual({
      register: [
        {
          path: "password",
          message: passwordlNotLongEnough,
        },
      ],
    });
  });

  test("check bad email and bad password", async () => {
    const response5: any = await client.register("da", "fa");
    expect(response5.data).toEqual({
      register: [
        {
          path: "email",
          message: emailNotLongEnough,
        },
        {
          path: "email",
          message: invalidEmail,
        },
        {
          path: "password",
          message: passwordlNotLongEnough,
        },
      ],
    });
  });
});
