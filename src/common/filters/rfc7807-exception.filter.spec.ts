import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { Rfc7807ExceptionFilter } from "./rfc7807-exception.filter";

describe("Rfc7807ExceptionFilter", () => {
  let filter: Rfc7807ExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new Rfc7807ExceptionFilter();

    mockResponse = {
      sent: false,
      status: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: "/api/test",
      method: "GET",
      headers: { "x-correlation-id": "corr-uuid-123" },
      id: "req-id-456",
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it("should be defined", () => {
    expect(filter).toBeDefined();
  });

  it("should format NotFoundException according to RFC 7807", () => {
    const exception = new NotFoundException("Resource not found");

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.header).toHaveBeenCalledWith(
      "Content-Type",
      "application/problem+json",
    );
    expect(mockResponse.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "https://api.genyxo.com/errors/not-found",
        title: "Not Found",
        status: 404,
        detail: "Resource not found",
        instance: "/api/test",
        correlationId: "req-id-456",
        statusCode: 404,
        message: "Resource not found",
      }),
    );
  });

  it("should format class-validator validation errors with invalidParams", () => {
    const exception = new BadRequestException([
      "email must be an email",
      "password is too short",
    ]);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.header).toHaveBeenCalledWith(
      "Content-Type",
      "application/problem+json",
    );
    expect(mockResponse.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        title: "Bad Request",
        detail: "Validation failed for one or more fields.",
        invalidParams: [
          { field: "email", reason: "email must be an email" },
          { field: "password", reason: "password is too short" },
        ],
      }),
    );
  });

  it("should format unhandled generic error as 500 Internal Server Error", () => {
    const error = new Error("Database deadlock");

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.header).toHaveBeenCalledWith(
      "Content-Type",
      "application/problem+json",
    );
    expect(mockResponse.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "https://api.genyxo.com/errors/internal-server-error",
        title: "Internal Server Error",
        status: 500,
        statusCode: 500,
      }),
    );
  });

  it("should not send response if already sent", () => {
    mockResponse.sent = true;

    filter.catch(new HttpException("Already sent", 400), mockHost);

    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.send).not.toHaveBeenCalled();
  });
});
