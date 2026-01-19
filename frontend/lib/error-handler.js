export class AppError extends Error {
  constructor(message, code, statusCode) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.statusCode = statusCode
  }
}

export const handleApiError = (error) => {
  console.error("API Error:", error)

  if (error instanceof AppError) {
    return error.message
  }

  if (error && error.message) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  return "An unexpected error occurred. Please try again."
}

export const showErrorToast = (error) => {
  const message = handleApiError(error)
  // Replace with a toast lib if available
  alert(message)
}
