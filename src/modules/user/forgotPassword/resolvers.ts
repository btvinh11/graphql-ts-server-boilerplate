import * as bcrypt from "bcryptjs";
import * as yup from "yup";
import { forgotPasswordPrefix } from "../../../constants";
import { User } from "../../../entity/User";
import { ResolverMap } from "../../../types/graphql-utils";
import { createForgotPasswordLink } from "../../../utils/createForgotPasswordLink";
import { forgotPasswordLockAccount } from "../../../utils/forgotPasswordLockAccount";
import { formatYupError } from "../../../utils/formatYupError";
import { registerPasswordValidation } from "../../../yupSchemas";
import { expiredKeyError, userNotFoundError } from "./errorMessages";

const schema = yup.object().shape({
  newPassword: registerPasswordValidation,
});

export const resolvers: ResolverMap = {
  Mutation: {
    sendForgotPasswordEmail: async (
      _,
      { email }: GQL.ISendForgotPasswordEmailOnMutationArguments,
      { redis }
    ) => {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return [
          {
            path: "email",
            message: userNotFoundError,
          },
        ];
      }

      await forgotPasswordLockAccount(user.id, redis);
      // @todo add frontend url
      await createForgotPasswordLink("", user.id, redis);
      // @send email with url
      return true;
    },
    forgotPasswordChange: async (
      _,
      { newPassword, key }: GQL.IForgotPasswordChangeOnMutationArguments,
      { redis }
    ) => {
      const redisKey = `${forgotPasswordPrefix}${key}`;

      const userId = await redis.get(redisKey);
      if (!userId) {
        return [
          {
            path: "key",
            message: expiredKeyError,
          },
        ];
      }

      try {
        await schema.validate({ newPassword }, { abortEarly: false });
      } catch (err) {
        return formatYupError(err);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const updatePromise = await User.update({ id: userId } as any, {
        forgotPasswordLocked: false,
        password: hashedPassword,
      });

      const deleteKeyPromise = await redis.del(redisKey);

      await Promise.all([updatePromise, deleteKeyPromise]);

      return null;
    },
  },
};