export const ROUTE_PATHS = {
  ROOT: "/",
  SIGN_IN: "/signin",
  HOME: "/home",
  NOT_FOUND: "*",
} as const;

export type RoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];
