import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { TokenExpiredError } from '@nestjs/jwt';

@Catch(TokenExpiredError)
export class JwtFilter implements ExceptionFilter {
  catch(exception: TokenExpiredError, host: ArgumentsHost) {
    const http = host.switchToHttp()
    const response = http.getResponse()

    response.status(401).json({
      "error":"Token Expired",
      "message":"Token has expired. Login to generate a new token.",
      "statusCode":401
    })
  }
}
