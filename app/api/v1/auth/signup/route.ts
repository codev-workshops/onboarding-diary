import { setSessionCookie } from '@/src/modules/auth/cookies';
import { permissionsFor } from '@/src/modules/auth/permissions';
import { signup } from '@/src/modules/auth/service';
import { ok, readJson, route } from '@/src/shared/http/envelope';
import { signupSchema } from '@/src/shared/schemas/auth';

export const runtime = 'nodejs';

export const POST = route(async (request) => {
  const input = await readJson(request, signupSchema);
  const { user, token } = await signup(input);

  const response = ok({ user, permissions: permissionsFor(user.role) }, { status: 201 });
  setSessionCookie(response, token);
  return response;
});
