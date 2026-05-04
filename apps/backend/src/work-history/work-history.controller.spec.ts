import { describe, it, expect } from 'vitest';
import { ParseIntPipe, BadRequestException } from '@nestjs/common';

// WorkHistoryController uses ParseIntPipe for employeeId and id path parameters.
// This spec verifies that ParseIntPipe rejects non-integer values with a 400 BadRequestException,
// which is the HTTP boundary contract the controller relies on.
describe('WorkHistoryController path parameter validation (ParseIntPipe)', () => {
  let pipe: ParseIntPipe;

  const newPipe = () => new ParseIntPipe();

  it('整数文字列はそのまま数値として返す', async () => {
    pipe = newPipe();
    const result = await pipe.transform('42', { type: 'param', data: 'id' });
    expect(result).toBe(42);
  });

  it('小数点を含む文字列は BadRequestException (400)', async () => {
    pipe = newPipe();
    await expect(pipe.transform('1.5', { type: 'param', data: 'id' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('アルファベットは BadRequestException (400)', async () => {
    pipe = newPipe();
    await expect(pipe.transform('abc', { type: 'param', data: 'employeeId' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('空文字列は BadRequestException (400)', async () => {
    pipe = newPipe();
    await expect(pipe.transform('', { type: 'param', data: 'id' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('負の整数は有効', async () => {
    pipe = newPipe();
    const result = await pipe.transform('-1', { type: 'param', data: 'id' });
    expect(result).toBe(-1);
  });
});
