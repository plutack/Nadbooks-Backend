import { IsEnum, IsString } from 'class-validator';

export enum UserVerification {
	VERIFY = 'verify',
	REMOVE_VERIFICATION = 'remove_verification',
}