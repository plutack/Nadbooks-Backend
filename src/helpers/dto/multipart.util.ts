import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export function MultipartFileDto<T extends Type<any>>(
	BaseDto: T,
	fileFields: string[] = ['file'],
) {
	class MultipartDto extends BaseDto {
		constructor(...args: any[]) {
			super(...args);
		}
	}

	for (const field of fileFields) {
		Object.defineProperty(MultipartDto.prototype, field, {
			value: undefined,
			writable: true,
			enumerable: true,
			configurable: true,
		});

		ApiProperty({ type: 'string', format: 'binary' })(
			MultipartDto.prototype,
			field,
		);
	}

	return MultipartDto;
}
