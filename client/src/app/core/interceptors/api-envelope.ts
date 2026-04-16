import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';

interface ApiEnvelope<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
  status?: number;
}

function isApiEnvelope(body: unknown): body is ApiEnvelope {
  return Boolean(
    body &&
    typeof body === 'object' &&
    'success' in body &&
    'message' in body &&
    typeof (body as { success?: unknown }).success === 'boolean',
  );
}

function normalizeError(error: HttpErrorResponse): HttpErrorResponse {
  const body = error.error;
  if (!isApiEnvelope(body) || body.success) {
    return error;
  }

  return new HttpErrorResponse({
    error: {
      detail: body.message,
      errors: body.errors,
      status: body.status ?? error.status,
    },
    headers: error.headers,
    status: error.status,
    statusText: error.statusText,
    url: error.url ?? undefined,
  });
}

export const apiEnvelopeInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  return next(request).pipe(
    map((event) => {
      if (!(event instanceof HttpResponse)) {
        return event;
      }

      const body = event.body;
      if (!isApiEnvelope(body)) {
        return event;
      }

      if (!body.success) {
        throw new HttpErrorResponse({
          error: {
            detail: body.message,
            errors: body.errors,
            status: body.status ?? event.status,
          },
          headers: event.headers,
          status: event.status,
          statusText: event.statusText,
          url: event.url ?? undefined,
        });
      }

      const unwrappedBody = body.data ?? { message: body.message };
      return event.clone({ body: unwrappedBody });
    }),
    catchError((error) => {
      if (error instanceof HttpErrorResponse) {
        return throwError(() => normalizeError(error));
      }
      return throwError(() => error);
    }),
  );
};
