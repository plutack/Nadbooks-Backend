import { IsEnum, IsString } from 'class-validator';

export enum UserActivation {
	ACTIVATE = 'activate',
	DEACTIVATE = 'deactivate',
}
