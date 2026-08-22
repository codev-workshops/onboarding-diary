import { setSessionCookie } from '@/src/modules/auth/cookies';
import { permissionsFor } from '@/src/modules/auth/permissions';
import { login } from '@/src/modules/auth/service';
import { ok, readJson, route } from '@/src/shared/http/envelope';
import { loginSchema } from '@/src/shared/schemas/auth';

export const runtime = 'nodejs';

export const POST = route(async (request) => {
  const input = await readJson(request, loginSchema);
  const { user, token } = await login(input);

  const response = ok({ user, permissions: permissionsFor(user.role) });
  setSessionCookie(response, token);
  return response;
});
