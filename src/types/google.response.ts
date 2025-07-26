type GoogleResponseUser = {
    provider : "google"
    sub: string
    id: string
    displayName: string
    name : {givenName:string, familyName: string}
    given_name: string
    family_name: string
    email_verified: boolean
    verified: boolean
    email: string
    emails: Array<{value: string, type: string}>
    photos: Array<{value: string, type: string}>
}