export let reponseErrorHandlers: Array<(error: unknown) => Promise<void> | void> = []

export function onResponseError(handler: (error: unknown) => Promise<void> | void) {
  reponseErrorHandlers.push(handler)
}
export function offResponseError(handler: (error: unknown) => Promise<void> | void) {
  reponseErrorHandlers = reponseErrorHandlers.filter((h) => h !== handler)
}
export async function emitResponseError(error: unknown) {
  for (const reponseErrorHandler of reponseErrorHandlers) {
    await reponseErrorHandler(error)
  }
}
