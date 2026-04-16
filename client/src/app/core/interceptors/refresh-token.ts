import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments';

interface RefreshResponse {
  tokens: {
    access: string;
  };
}

let refreshRequest$: Observable<string> | null = null;

function forceLogout(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('authUser');
  localStorage.removeItem('needsTelegramLink');

  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

function shouldSkipRefresh(request: HttpRequest<unknown>): boolean {
  const url = request.url;
  return (
    url.includes('/auth/login/') ||
    url.includes('/auth/register/') ||
    url.includes('/auth/refresh/') ||
    request.headers.has('x-refresh-retry')
  );
}

function getRefreshRequest(http: HttpClient): Observable<string> {
  if (!refreshRequest$) {
    refreshRequest$ = http
      .post<RefreshResponse>(
        `${environment.apiUrl}/api/auth/refresh/`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map((response) => response.tokens.access),
        finalize(() => {
          refreshRequest$ = null;
        }),
        shareReplay(1),
      );
  }

  return refreshRequest$;
}

export const refreshTokenInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const backend = inject(HttpBackend);
  const rawHttp = new HttpClient(backend);

  return next(request).pipe(
    catchError((error) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        shouldSkipRefresh(request)
      ) {
        return throwError(() => error);
      }

      return getRefreshRequest(rawHttp).pipe(
        switchMap((newAccessToken) => {
          localStorage.setItem('accessToken', newAccessToken);

          const retriedRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`,
              'x-refresh-retry': '1',
            },
          });

          return next(retriedRequest);
        }),
        catchError((refreshError) => {
          forceLogout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
