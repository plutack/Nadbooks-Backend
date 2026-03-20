export interface SendEmailDto {
	to: string;
	subject: string;
	templateName: string;
	variables?: Record<string, any>;
}

export interface EmailProviderInterface {
	send(dto: SendEmailDto): Promise<void>;
}
