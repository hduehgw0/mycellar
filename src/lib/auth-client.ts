import { createAuthClient } from "better-auth/react";

// サーバーと同一オリジンで動くため baseURL は省略（自動解決）。
export const authClient = createAuthClient();
