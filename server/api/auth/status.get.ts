import { verifyAuthCookie } from "../../utils/auth";

export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const password = (config.searchPassword as string) || "";
  const locked = !!password.trim() && !verifyAuthCookie(event, password);
  return { locked };
});
