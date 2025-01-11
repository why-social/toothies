import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { httpResponseListener } from './HttpResponseListener';

@Injectable()
export class HttpResponseInterceptor implements HttpInterceptor {
  private static listeners: Array<httpResponseListener> = [];

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          for (const listener of HttpResponseInterceptor.listeners) {
            listener(request, event);
          }
        }
      }),
    );
  }

  public static addResponseListener(listener: httpResponseListener) {
    this.listeners.push(listener);
  }

  public static removeResponseListener(listener: httpResponseListener) {
    this.listeners = this.listeners.filter(
      (responseListener) => responseListener != listener,
    );
  }
}
