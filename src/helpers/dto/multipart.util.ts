import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export function MultipartFileDto<T extends Type<any>>(
	BaseDto: T,
	fileField = 'file',
) {
	class MultipartDto extends BaseDto {
		@ApiProperty({ type: 'string', format: 'binary' })
		[fileField]: any;
	}
	return MultipartDto;
}
