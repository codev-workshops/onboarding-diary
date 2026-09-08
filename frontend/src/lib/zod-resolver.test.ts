import { expect, test } from 'vitest';
import { z } from 'zod';
import { zodResolver } from './zod-resolver';

const schema = z.object({
  name: z.string().min(3, 'Enter a name.'),
  items: z.array(z.object({ title: z.string().min(3, 'Enter an item title.') })).min(1, 'Add one.'),
});

const resolve = (values: unknown) =>
  // The resolver only reads the values, so the unused React Hook Form arguments are irrelevant.
  zodResolver(schema)(values as z.infer<typeof schema>, undefined, {
    shouldUseNativeValidation: false,
    fields: {},
  });

test('returns the parsed values when the schema passes', async () => {
  const result = await resolve({ name: 'Week one', items: [{ title: 'Collect laptop' }] });

  expect(result.errors).toEqual({});
  expect(result.values).toEqual({ name: 'Week one', items: [{ title: 'Collect laptop' }] });
});

test('nests array item errors so the field renders them', async () => {
  const result = await resolve({ name: 'Week one', items: [{ title: 'ok' }, { title: 'fine' }] });

  const errors = result.errors as { items?: Record<string, { title?: { message?: string } }> };
  expect(errors.items?.[0]?.title?.message).toBe('Enter an item title.');
  expect(errors.items?.[1]).toBeUndefined();
});

test('reports an error on the array itself under root', async () => {
  const result = await resolve({ name: 'ab', items: [] });

  const errors = result.errors as {
    name?: { message?: string };
    items?: { root?: { message?: string } };
  };
  expect(errors.name?.message).toBe('Enter a name.');
  expect(errors.items?.root?.message).toBe('Add one.');
});
