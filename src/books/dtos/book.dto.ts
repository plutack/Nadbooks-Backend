import { IsBooleanString, IsDateString, IsNotEmpty, IsNumber, IsNumberString, IsOptional } from "class-validator";

export class StoreBookDto {
    @IsNotEmpty()
    title: string

    @IsNotEmpty()
    author: string

    @IsNotEmpty()
    @IsBooleanString()
    isMature: boolean

    @IsNotEmpty()
    @IsNumberString()
    pageCount: number

    @IsNotEmpty()
    @IsDateString()
    dateAuthored: Date
}

export class UpdateBookDto {
    @IsOptional()
    title: string

    @IsOptional()
    author: string


    @IsBooleanString()
    @IsOptional()
    isMature: boolean

    @IsNumberString()
    @IsOptional()
    pageCount: number

    @IsDateString()
    @IsOptional()
    dateAuthored: Date
}