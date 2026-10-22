export let responseErrorHandlers: Array<(error: unknown) => Promise<void> | void> = []

export function onResponseError(handler: (error: unknown) => Promise<void> | void) {
  responseErrorHandlers.push(handler)
}
export function offResponseError(handler: (error: unknown) => Promise<void> | void) {
  responseErrorHandlers = responseErrorHandlers.filter((h) => h !== handler)
}
export async function emitResponseError(error: unknown) {
  for (const responseErrorHandler of responseErrorHandlers) {
    await responseErrorHandler(error)
  }
}
