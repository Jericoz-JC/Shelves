export default {
  providers: [
    {
      // From Clerk JWT template settings (for template named "convex").
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
