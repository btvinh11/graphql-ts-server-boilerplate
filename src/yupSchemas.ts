import * as yup from "yup";
import { passwordlNotLongEnough } from "./modules/user/register/errorMessages";

export const registerPasswordValidation = yup
  .string()
  .min(3, passwordlNotLongEnough)
  .max(255);
