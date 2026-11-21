import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiResponse } from "../interfaces/api-response.interface.js";

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((res) => {
        const isObjectWithMessage = res && typeof res === "object" && "message" in res && "data" in res;

        return {
          success: true,
          statusCode,
          message: isObjectWithMessage
            ? res.message
            : "Operation completed successfully",
          data: isObjectWithMessage ? res.data : (res ?? null),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
