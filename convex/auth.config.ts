const clerkJwtIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!clerkJwtIssuerDomain) {
  throw new Error(
    "Missing CLERK_JWT_ISSUER_DOMAIN in Convex environment variables."
  );
}

export default {
  providers: [
    {
      // From Clerk JWT template settings (for template named "convex").
      domain: clerkJwtIssuerDomain,
      applicationID: "convex",
    },
  ],
};
