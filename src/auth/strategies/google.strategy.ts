import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from "passport-google-oauth2"

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private config: ConfigService,
        private prismaService: PrismaService
    ) {
        const GOOGLE_CLIENT_ID = config.get<string>("GOOGLE_CLIENT_ID")
        const GOOGLE_CLIENT_SECRET = config.get<string>("GOOGLE_CLIENT_SECRET")
        const GOOGLE_CALLBACK_URL = config.get<string>("GOOGLE_CALLBACK_URL")
        if (!GOOGLE_CLIENT_SECRET) {
            throw new Error("GOOGLE_CLIENT_SECRET not provided")
        }
        if (!GOOGLE_CALLBACK_URL) {
            throw new Error("GOOGLE_CALLBACK_URL not provided")
        }
        if (!GOOGLE_CLIENT_ID) {
            throw new Error("GOOGLE_CLIENT_ID not provided")
        }
        super({
            clientID: GOOGLE_CLIENT_ID,
            clientSecret:GOOGLE_CLIENT_SECRET,
            callbackURL: GOOGLE_CALLBACK_URL,
            scope: ["profile", "email"]
        });
    }

    async validate(
        token: string,
        _: string | undefined,
        profile: GoogleResponseUser,
        done: Function
    ) {
        try {

            const { name, email, provider, id } = profile
            
            return {
                provider,
                provider_id: id,
                email: email,
                name,
            }
        } catch (error) {
            throw new Error(error)
        }
    }
}
