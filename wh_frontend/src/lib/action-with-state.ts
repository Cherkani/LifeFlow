export type RedirectResult = { redirectTo: string };

/** Wraps a (formData) => Promise action for use with useActionState's (prevState, formData) => Promise signature. */
export function withActionState<T>(
  action: (formData: FormData) => Promise<T | null>
): (prevState: T | null, formData: FormData) => Promise<T | null> {
  return async (_prevState, formData) => action(formData);
}
