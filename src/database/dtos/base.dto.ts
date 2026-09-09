import { ApiProperty } from '@nestjs/swagger';

export class BaseDto {
    @ApiProperty({ example: 'clx1234abcdef' })
    id: string;

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
    updatedAt: Date;
}
