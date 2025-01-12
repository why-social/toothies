import { HttpRequest, HttpResponse } from '@angular/common/http';

export type httpResponseListener = (
  request: HttpRequest<any>,
  response: HttpResponse<any>,
) => void;
