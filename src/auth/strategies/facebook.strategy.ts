import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from "passport-facebook"

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
    constructor(
        private config: ConfigService,
        private prismaService: PrismaService
    ) {
        const FACEBOOK_CLIENT_ID = config.get<string>("FACEBOOK_CLIENT_ID")
        const FACEBOOK_CLIENT_SECRET = config.get<string>("FACEBOOK_CLIENT_SECRET")
        const FACEBOOK_CALLBACK_URL = config.get<string>("FACEBOOK_CALLBACK_URL")
        if (!FACEBOOK_CLIENT_SECRET) {
            throw new Error("FACEBOOK_CLIENT_SECRET not provided")
        }
        if (!FACEBOOK_CALLBACK_URL) {
            throw new Error("FACEBOOK_CALLBACK_URL not provided")
        }
        if (!FACEBOOK_CLIENT_ID) {
            throw new Error("FACEBOOK_CLIENT_ID not provided")
        }
        super({
            clientID: FACEBOOK_CLIENT_ID,
            clientSecret:FACEBOOK_CLIENT_SECRET,
            callbackURL: FACEBOOK_CALLBACK_URL,
            scope: "email"
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
