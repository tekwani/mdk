# SignInGoogleButton

Single-button Google OAuth sign-in trigger. Defaults to a full-page redirect
to `${oauthBaseUrl}/oauth/google`. The backend issues a JWT and redirects
back with `?authToken=…`, which `useAuthToken` then persists into the
session store.

## Props

| Prop           | Type           | Required | Default                 | Description                                                |
| -------------- | -------------- | -------- | ----------------------- | ---------------------------------------------------------- |
| `oauthBaseUrl` | `string`       | yes      | —                       | Base URL of the OAuth backend; trailing slash stripped.    |
| `label`        | `string`       | no       | `"Sign in with Google"` | Visible button label.                                      |
| `onClick`      | `() => void`   | no       | redirect                | Override click behaviour; useful for tests / custom flows. |
| ...rest        | `ButtonProps`  | no       | —                       | Forwarded to the underlying `<Button>`.                    |

## Example

```tsx
<SignInGoogleButton oauthBaseUrl={import.meta.env.VITE_OAUTH_BASE_URL} />
```

## Notes

- Uses `window.location.href` (full-page navigation) rather than client-side
  routing so the OAuth callback URL is treated as an external load.
- The backend side is an identity plugin you supply — MDK ships no OAuth
  implementation. It serves the `/oauth/google` start endpoint this button
  navigates to, and redirects back to the frontend with `?authToken=<jwt>`.
  For local dev that is typically a callback of
  `http://localhost:3000/oauth/google/callback` returning to
  `http://localhost:3030`.

