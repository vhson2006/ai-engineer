import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { IsOptionalNonNull } from '../dto/validation';
import { isProblemDetails, toProblem } from './problem-details';
import { validationExceptionFactory, ValidationProblemException } from './validation';

describe('[problem details] (unit)', () => {
  it('follows RFC 9457: type about:blank, title = reason phrase, status, detail', () => {
    expect(toProblem(new NotFoundException('Deployment x not found'))).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'Deployment x not found',
      code: 'not_found',
    });
  });

  it('uses a specific code when the exception carries one', () => {
    const problem = toProblem(
      new ConflictException({ message: 'Not uploaded yet', code: 'upload_incomplete' }),
    );
    expect(problem).toMatchObject({
      status: 409,
      detail: 'Not uploaded yet',
      code: 'upload_incomplete',
    });
  });

  it('adds instance and requestId from the context', () => {
    expect(
      toProblem(new ForbiddenException('no'), { instance: '/api/x', requestId: 'r-1' }),
    ).toMatchObject({ status: 403, instance: '/api/x', requestId: 'r-1', code: 'forbidden' });
  });

  it('lists field errors for a ValidationProblemException', () => {
    const problem = toProblem(
      new ValidationProblemException([{ field: 'name', message: 'name must be a string' }]),
    );
    expect(problem).toMatchObject({
      status: 400,
      code: 'validation_error',
      detail: 'The request is invalid',
      errors: [{ field: 'name', message: 'name must be a string' }],
    });
  });

  it('still handles a plain ValidationPipe message list (no field names)', () => {
    const problem = toProblem(new BadRequestException(['a is wrong', 'b is wrong']));
    expect(problem.errors).toEqual([
      { field: '', message: 'a is wrong' },
      { field: '', message: 'b is wrong' },
    ]);
  });

  it.each([
    ['entity.parse.failed', 400, 'malformed_body'],
    ['entity.too.large', 413, 'payload_too_large'],
    ['charset.unsupported', 415, 'unsupported_media_type'],
  ])('maps the body parser error %s to %i (not 500)', (type, status, code) => {
    const error = Object.assign(new Error('parser internals'), { type, status, expose: true });
    const problem = toProblem(error);
    expect(problem).toMatchObject({ status, code });
    expect(problem.detail).not.toContain('internals');
  });

  it('passes through an RpcException that already carries a problem', () => {
    const body = toProblem(new NotFoundException('x'));
    expect(toProblem(new RpcException(body))).toEqual(body);
    expect(isProblemDetails(body)).toBe(true);
  });

  it('answers a generic 500 for anything unknown, without its message', () => {
    const problem = toProblem(new Error('SELECT * FROM secrets failed at 10.0.0.5'));
    expect(problem).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred',
      code: 'internal_error',
    });
  });
});

describe('[validation] (unit, real ValidationPipe)', () => {
  class Item {
    @IsInt()
    @Min(1)
    qty!: number;
  }
  class Body {
    @IsOptionalNonNull()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    note?: string | null;

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => Item)
    items?: Item[];
  }
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: validationExceptionFactory,
  });
  const validate = (value: unknown) => pipe.transform(value, { type: 'body', metatype: Body });
  const fieldErrors = async (value: unknown) => {
    try {
      await validate(value);
    } catch (error) {
      return (error as ValidationProblemException).errors;
    }
    return [];
  };

  it('@IsOptionalNonNull: omitted is fine, null is rejected', async () => {
    await expect(validate({})).resolves.toBeDefined();
    expect(await fieldErrors({ name: null })).toEqual([
      { field: 'name', message: 'name must be a string' },
    ]);
  });

  it('@IsOptional on a nullable field still accepts null (clear the value)', async () => {
    await expect(validate({ note: null })).resolves.toMatchObject({ note: null });
  });

  it('names nested and array fields, and unknown properties', async () => {
    const errors = await fieldErrors({ items: [{ qty: 0 }], extra: 1 });
    expect(errors).toHaveLength(2); // order is class-validator's, not guaranteed
    expect(errors).toEqual(
      expect.arrayContaining([
        { field: 'items[0].qty', message: 'qty must not be less than 1' },
        { field: 'extra', message: 'property extra should not exist' },
      ]),
    );
  });
});
