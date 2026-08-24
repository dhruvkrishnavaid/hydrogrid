import { json } from "@tanstack/react-start";

export interface ApiSuccessPayload<T> {
  data: T;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function apiSuccess<T>(
  data: T,
  status = 200,
  init?: ResponseInit,
): Response {
  return json(
    { data },
    {
      ...init,
      status,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    },
  );
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
  init?: ResponseInit,
): Response {
  return json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    {
      ...init,
      status,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    },
  );
}
