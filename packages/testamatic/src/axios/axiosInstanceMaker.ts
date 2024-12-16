import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios"
import axiosRetry, { IAxiosRetryConfig } from "axios-retry"
import { isNativeError } from "util/types"
import { StructuredLogger } from "../logger/StructuredLogger"

export type RetryConfig = Pick<IAxiosRetryConfig, "retries" | "retryDelay">

export const createAxiosInstance = (
  serviceName: string,
  logger: StructuredLogger,
  retryConfig: RetryConfig = {
    retries: 3,
    retryDelay: (retryCount) => retryCount * 2,
  },
): AxiosInstance => {
  const axiosInstance = axios.create({
    validateStatus: (status) => status < 500,
    timeout: 1000,
  })
  axiosInstance.interceptors.request.use(
    requestLoggerFactory(serviceName, logger),
    requestErrorLoggerFactory(serviceName, logger),
  )
  axiosInstance.interceptors.response.use(
    responseLoggerFactory(serviceName, logger),
    responseErrorLoggerFactory(serviceName, logger),
  )

  axiosRetry(axiosInstance, {
    ...retryConfig,
    onRetry: (cnt, error, req) => logger.info(`${cnt} retry of req ${req.url} due to error => ${error.message}`),
  })
  return axiosInstance
}

const requestLoggerFactory =
  (serviceName: string, logger: StructuredLogger) => (request: InternalAxiosRequestConfig) => {
    try {
      logger.info("Request Sent", {
        ...loggableRequest(request),
        serviceName: serviceName,
      })
    } catch {
      logger.error("Request Sent", {
        request: "Request logging failed",
        serviceName: serviceName,
      })
    }
    return request
  }

const responseLoggerFactory = (serviceName: string, logger: StructuredLogger) => (response: AxiosResponse) => {
  try {
    logger.info("Response Received", {
      ...loggableResponse(response),
      serviceName: serviceName,
    })
  } catch {
    logger.error("Response Received", {
      serviceName: serviceName,
      message: "Response Logging failed",
    })
  }
  return response
}

const requestErrorLoggerFactory = (serviceName: string, logger: StructuredLogger) => (error: AxiosError) => {
  try {
    logger.error(
      `Request Error`,

      {
        name: error.name,
        message: error.message,
        ...loggableRequest(error.request),
        serviceName: serviceName,
      },
    )
  } catch (e) {
    if (isNativeError(e)) {
      logger.error(
        `Request Error`,

        {
          error: `Error logging failed ${isNativeError(e) ? e.message : "missing"}`,

          serviceName: serviceName,
        },
      )
    }
  }
}

const responseErrorLoggerFactory =
  (serviceName: string, logger: StructuredLogger) =>
  (error: AxiosError): never => {
    const errorLogger = logger.child({ serviceName })

    try {
      logger.error("Response Error", {
        name: error.name,
        message: error.message,
        request: error.request ? loggableRequest(error.request) : {},
        response: error.response ? loggableResponse(error.response) : {},
        serviceName: serviceName,
      })
    } catch (e) {
      errorLogger.error("Error logging failed", e)
    }
    throw error
  }

function loggableResponse(response: AxiosResponse): Partial<AxiosResponse> {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data: response.data,
  }
}

function loggableRequest(request: AxiosRequestConfig) {
  return {
    url: request.url,
    method: request.method,
    headers: request.headers,
    data: request.data,
  }
}
