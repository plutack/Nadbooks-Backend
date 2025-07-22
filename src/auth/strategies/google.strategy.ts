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
        super({
            clientID: config.get("GOOGLE_CLIENT_ID") || "",
            clientSecret:config.get("GOOGLE_CLIENT_SECRET") || "",
            callbackURL: config.get("GOOGLE_CALLBACK_URL") || "",
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
